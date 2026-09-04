import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * L0 parsing.
 * The JSONL format is undocumented and version-dependent: parse tolerantly,
 * treat every field as optional, never throw on a bad line.
 */

export function parseLines(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const e = JSON.parse(trimmed);
      if (e && typeof e === 'object') entries.push(e);
    } catch {
      // malformed line — skip
    }
  }
  return entries;
}

export function parseSessionFile(path) {
  return parseLines(readFileSync(path, 'utf8'));
}

export function usageOf(entry) {
  return entry?.message?.usage ?? null;
}

/** Total context processed by one API call (all three input components). */
export function totalContext(usage) {
  return (
    (usage?.input_tokens ?? 0) +
    (usage?.cache_read_input_tokens ?? 0) +
    (usage?.cache_creation_input_tokens ?? 0)
  );
}

/**
 * One record per API request, deduped by requestId (invariant 4).
 * Last occurrence wins. Returned sorted by timestamp so turn
 * ordinals are usable for prefix-persistence weighting.
 */
export function apiTurns(entries) {
  const byRequest = new Map();
  for (const e of entries) {
    if (e.type !== 'assistant') continue;
    const usage = usageOf(e);
    if (!usage) continue;
    byRequest.set(e.requestId ?? e.uuid, e);
  }
  return [...byRequest.values()]
    .map((e) => ({
      requestId: e.requestId ?? null,
      uuid: e.uuid ?? null,
      timestamp: e.timestamp ?? null,
      model: e.message?.model ?? null,
      usage: usageOf(e),
    }))
    .sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0));
}

/** All tool_use blocks, deduped by block id, in file order. */
export function toolCalls(entries) {
  const seen = new Set();
  const calls = [];
  for (const e of entries) {
    if (e.type !== 'assistant') continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'tool_use' || !block.id || seen.has(block.id)) continue;
      seen.add(block.id);
      calls.push({
        id: block.id,
        name: block.name ?? '?',
        input: block.input ?? {},
        timestamp: e.timestamp ?? null,
        uuid: e.uuid ?? null,
      });
    }
  }
  return calls;
}

/** All tool_result blocks from user entries, deduped by tool_use_id. */
export function toolResults(entries) {
  const seen = new Set();
  const results = [];
  for (const e of entries) {
    if (e.type !== 'user') continue;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'tool_result' || !block.tool_use_id || seen.has(block.tool_use_id)) continue;
      seen.add(block.tool_use_id);
      results.push({
        toolUseId: block.tool_use_id,
        isError: block.is_error === true,
        bytes: contentBytes(block.content),
        timestamp: e.timestamp ?? null,
      });
    }
  }
  return results;
}

export const BYTES_PER_TOKEN = 4;
const IMAGE_TOKEN_CAP = 1600;      // API downsizes; ~1600 tokens max per image
const IMAGE_TOKEN_FALLBACK = 1000; // when dimensions can't be read

/**
 * Content size in text-byte equivalents. Image blocks are converted via the
 * estimate tokens ≈ (w×h)/750, expressed as bytes (tokens × 4) so
 * downstream bytes→tokens math stays uniform. (Fixes: image blocks were
 * previously counted as 0.)
 */
export function contentBytes(content) {
  if (typeof content === 'string') return Buffer.byteLength(content);
  if (!Array.isArray(content)) return 0;
  let n = 0;
  for (const b of content) {
    if (typeof b?.text === 'string') n += Buffer.byteLength(b.text);
    else if (b?.type === 'image') n += imageTokens(b) * BYTES_PER_TOKEN;
  }
  return n;
}

function imageTokens(block) {
  const src = block?.source;
  if (src?.type !== 'base64' || typeof src.data !== 'string') return IMAGE_TOKEN_FALLBACK;
  const dims = pngDims(src.data);
  if (!dims) return IMAGE_TOKEN_FALLBACK;
  return Math.min(IMAGE_TOKEN_CAP, Math.ceil((dims.w * dims.h) / 750));
}

/** Read width/height from a base64 PNG header; null for non-PNG. */
function pngDims(b64) {
  try {
    const head = Buffer.from(b64.slice(0, 48), 'base64');
    if (head.length < 24 || head.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/**
 * Normalized hash of a tool invocation (param_hash): identical
 * hash = mechanically duplicate call. Normalization keeps only the
 * cost-relevant parts of the input.
 */
const NORMALIZERS = {
  Read: (i) => i.file_path ?? '',
  Bash: (i) => (i.command ?? '').trim(),
  Grep: (i) => [i.pattern, i.path, i.glob, i.output_mode].map((v) => v ?? '').join(''),
  Glob: (i) => [i.pattern, i.path].map((v) => v ?? '').join(''),
};

export function paramHash(name, input) {
  const normalize = NORMALIZERS[name];
  let norm;
  try {
    norm = normalize ? normalize(input ?? {}) : JSON.stringify(input ?? {});
  } catch {
    norm = '';
  }
  return createHash('sha1').update(`${name}${norm}`).digest('hex').slice(0, 12);
}
