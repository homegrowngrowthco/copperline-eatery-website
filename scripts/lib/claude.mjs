// Shared Claude call for the blog scripts (op #1549, 2026-11-08).
//
// claude-opus-5-5 with adaptive thinking (always on for this model; effort is
// the only control). The server-side refusal fallback is enabled
// ("default" routing, beta server-side-fallback-2026-07-01) so a rare policy
// decline is retried on another model instead of losing the month's run.
// A whole-chain refusal still stops the run loudly.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    client = new Anthropic();
  }
  return client;
}

// Runs one request, following pause_turn continuations (web search turns can
// pause), and returns { text, message, searchedUrls }. searchedUrls is every
// URL the web search tool actually returned, used to reject invented sources.
export async function ask({ system, user, tools, effort = 'high', maxTokens = 16000, maxContinuations = 6 }) {
  const messages = [{ role: 'user', content: user }];
  const searchedUrls = new Set();
  let message;
  for (let i = 0; i <= maxContinuations; i++) {
    message = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
      ...(tools ? { tools } : {}),
      output_config: { effort },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    for (const block of message.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) if (r.url) searchedUrls.add(r.url);
      }
    }
    if (message.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: message.content });
  }
  if (message.stop_reason === 'refusal') {
    throw new Error(`Claude declined the request (${message.stop_details?.category ?? 'no category'}); nothing was written.`);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('Response truncated at max_tokens; nothing was written.');
  }
  if (message.stop_reason === 'pause_turn') {
    throw new Error('Still paused after the continuation limit; nothing was written.');
  }
  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text, message, searchedUrls };
}

// The last {...} object in the text, parsed. Throws with a snippet if none.
export function lastJson(text) {
  const start = text.lastIndexOf('\n{') >= 0 ? text.lastIndexOf('\n{') + 1 : text.indexOf('{');
  const candidates = [text.slice(start), text.slice(text.indexOf('{'))];
  for (const c of candidates) {
    const end = c.lastIndexOf('}');
    if (end < 0) continue;
    try {
      return JSON.parse(c.slice(0, end + 1));
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`No JSON object found in the response: ${text.slice(0, 300)}`);
}
