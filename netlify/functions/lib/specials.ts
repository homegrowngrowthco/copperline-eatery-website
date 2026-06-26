import Anthropic from '@anthropic-ai/sdk';

export const VISION_MODEL = 'claude-sonnet-4-6';
export const PENDING_STORE = 'pending-specials';
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface Special {
  name: string;
  description: string | null;
  price: string | null;
}

export interface ExtractionResult {
  confidence: number; // 0–100
  specials: Special[];
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

  if (!Array.isArray(parsed.specials)) throw new Error('Response missing "specials" array');

  const specials: Special[] = (parsed.specials as unknown[])
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

  return { confidence, specials };
}
