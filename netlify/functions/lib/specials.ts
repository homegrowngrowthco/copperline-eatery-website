import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import { Octokit } from '@octokit/rest';

export const VISION_MODEL = 'claude-sonnet-4-6';
export const PENDING_STORE = 'pending-specials';
export const SPECIALS_BOARD_STORE = 'specials-boards';
export const SPECIALS_DATA_PATH = 'src/data/specials.json';
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const CREDIT_NAME_MAX = 40;
const CREDIT_FROM_MAX = 60;

export interface Special {
  name: string;
  description: string | null;
  price: string | null;
}

export interface Credit {
  name: string;
  from?: string;
}

export interface BoardPhoto {
  key: string;
  contentType: string;
}

export interface SpecialsFile {
  updatedAt: string;
  board?: BoardPhoto;
  credit?: Credit | null;
  source?: 'customer' | 'staff';
  specials: Special[];
}

export interface ExtractionResult {
  confidence: number; // 0–100
  specials: Special[];
}

export interface CorrectionResult {
  specials: Special[];
  // undefined = the response didn't mention credit at all; the caller should
  // preserve whatever credit was already set rather than treating this as "remove".
  credit: Credit | null | undefined;
}

const VISION_PROMPT =
  'Analyze this restaurant specials board photo. Extract all specials. Return ONLY valid JSON (no markdown fences, no commentary):\n' +
  '{ "confidence": number, "specials": [ { "name": string, "description": string | null, "price": string | null } ] }\n' +
  'confidence 0-100: rate image clarity (in focus?), text readability, and whether this clearly shows a restaurant specials board. Use 90+ only when everything is clearly legible. If a field is not visible, use null.';

export async function extractSpecialsFromImage(opts: {
  content: string;
  contentType: string;
  apiKey: string;
}): Promise<ExtractionResult> {
  const anthropic = new Anthropic({ apiKey: opts.apiKey });
  const response = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: opts.contentType as AllowedImageType,
              data: opts.content,
            },
          },
          { type: 'text', text: VISION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Vision response had no text block');
  return parseExtractionResult(textBlock.text);
}

function parseSpecialsArray(raw: unknown): Special[] {
  if (!Array.isArray(raw)) throw new Error('Response missing "specials" array');
  return (raw as unknown[])
    .filter((s): s is { name: unknown; description?: unknown; price?: unknown } => {
      return (
        !!s &&
        typeof s === 'object' &&
        typeof (s as { name: unknown }).name === 'string' &&
        !!(s as { name: string }).name.trim()
      );
    })
    .map((s) => ({
      name: String(s.name).trim(),
      description: s.description ? String(s.description).trim() : null,
      price: s.price ? String(s.price).trim() : null,
    }));
}

export function parseExtractionResult(text: string): ExtractionResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

  let parsed: { confidence?: unknown; specials?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const confidence =
    typeof parsed.confidence === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
      : 50;

  return { confidence, specials: parseSpecialsArray(parsed.specials) };
}

// Corrections responses can also carry an updated (or preserved) credit, so
// this has its own parser rather than overloading parseExtractionResult.
export function parseCorrectionResult(text: string): CorrectionResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);

  let parsed: { specials?: unknown; credit?: unknown };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const specials = parseSpecialsArray(parsed.specials);

  let credit: Credit | null | undefined;
  if ('credit' in parsed) {
    if (parsed.credit === null) {
      credit = null;
    } else if (parsed.credit && typeof parsed.credit === 'object') {
      const c = parsed.credit as { name?: unknown; from?: unknown };
      credit = sanitizeCredit(
        typeof c.name === 'string' ? c.name : null,
        typeof c.from === 'string' ? c.from : null,
      );
    }
  }

  return { specials, credit };
}

// Reviewed before publish either way (web form: human reviewer email; email
// corrections: passes through the same YES-gate), but this strips anything
// that could break rendering or violate the no-dashes content rule regardless
// of who typed it. Returns null when the name is empty after cleaning — the
// caller must render no credit line at all in that case (never a placeholder).
export function sanitizeCredit(
  rawName: string | null | undefined,
  rawFrom: string | null | undefined,
): Credit | null {
  const clean = (s: string, max: number): string =>
    s
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\S+@\S+\.\S+/g, '')
      .replace(/[<>]/g, '')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);

  const name = clean(rawName || '', CREDIT_NAME_MAX);
  if (!name) return null;
  const from = clean(rawFrom || '', CREDIT_FROM_MAX);
  return from ? { name, from } : { name };
}

export function formatCredit(credit: Credit | null | undefined): string | null {
  if (!credit || !credit.name) return null;
  return credit.from ? `${credit.name} from ${credit.from}` : credit.name;
}

function boardImageExtension(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

// Stores the submitted board photo so it survives past the pending-batch TTL
// and can be served publicly by netlify/functions/specials-board.ts. Keys are
// dated + batch-scoped so they're unique and never need to be overwritten.
export async function storeBoardPhoto(opts: {
  batchId: string;
  content: string; // base64
  contentType: string;
}): Promise<BoardPhoto> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `${date}-${opts.batchId}.${boardImageExtension(opts.contentType)}`;
  const bytes = Buffer.from(opts.content, 'base64');
  // Store.set() wants a real ArrayBuffer, not a Node Buffer; slice out just
  // this Buffer's view (its backing buffer may be a larger shared pool).
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const store = getStore(SPECIALS_BOARD_STORE);
  await store.set(key, arrayBuffer, { metadata: { contentType: opts.contentType } });
  return { key, contentType: opts.contentType };
}

export interface PublishOptions {
  specials: Special[];
  board?: BoardPhoto;
  credit?: Credit | null;
  source?: 'customer' | 'staff';
}

// Shared by both intake functions so the published JSON shape can't drift
// between the email and web paths. New fields are all optional, so a
// pre-existing specials.json (no board/credit/source) still parses and
// renders exactly as before.
export async function commitSpecialsToRepo(opts: PublishOptions): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repoEnv = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'master';
  if (!token || !repoEnv) throw new Error('GITHUB_TOKEN or GITHUB_REPO not set');

  const [owner, repo] = repoEnv.split('/');
  if (!owner || !repo) throw new Error(`GITHUB_REPO must be "owner/repo", got: ${repoEnv}`);

  const octokit = new Octokit({ auth: token });

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: SPECIALS_DATA_PATH, ref: branch });
    if (!Array.isArray(data) && 'sha' in data) sha = data.sha;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404) throw e;
  }

  const payload: SpecialsFile = { updatedAt: new Date().toISOString(), specials: opts.specials };
  if (opts.board) payload.board = opts.board;
  if (opts.credit) payload.credit = opts.credit;
  if (opts.source) payload.source = opts.source;

  const content = Buffer.from(JSON.stringify(payload, null, 2) + '\n').toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: SPECIALS_DATA_PATH,
    branch,
    sha,
    message: `chore(specials): update daily specials (${opts.specials.length} items)`,
    content,
  });
}
