import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { SPECIALS_BOARD_STORE } from './lib/specials';

// Serves a specials-board photo previously written by storeBoardPhoto() in
// lib/specials.ts. Keys are dated + batch-scoped (never reused), so the
// response is safe to cache immutably. Not linked from anywhere except the
// key embedded in src/data/specials.json.
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  // Blobs is a flat key-value store (no filesystem underneath), so there is no
  // path-traversal surface to guard beyond "a key was actually given."
  const key = new URL(req.url).pathname.replace(/^\/specials-board\//, '');
  if (!key) return new Response('Not found', { status: 404 });

  const store = getStore(SPECIALS_BOARD_STORE);
  const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!result) return new Response('Not found', { status: 404 });

  const contentType = (result.metadata?.contentType as string | undefined) || 'application/octet-stream';
  return new Response(result.data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const config: Config = { path: '/specials-board/*' };
