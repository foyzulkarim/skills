import {
  apiTurns, toolCalls, toolResults, totalContext, paramHash, BYTES_PER_TOKEN,
} from './parser.js';
import { CACHE } from './pricing.js';

/**
 * L1 deterministic rule pack.
 * Findings carry metadata only — never content (invariant 1).
 * Waste math anchors on cache fields + content bytes (invariant 3).
 *
 * Changes vs v0.1:
 * - Unified waste model (PRICE): waste = actual cost − counterfactual cost,
 *   in input-token-cost equivalents.
 * - Prefix-persistence weighting: payload cost = write once (1.25×)
 *   + cache-read (0.1×) on every remaining turn of the session.
 * - DUP_TOOL_CALL: a mutating call (Write/Edit/Bash on the same path) between
 *   two Reads resets the duplicate group — re-reads after edits are legit.
 * - No double-counting: bytes claimed by DUP_TOOL_CALL are excluded from
 *   BIG_TOOL_OUTPUT (which now prices only the excess over threshold).
 * - CACHE_MISS_RATE denominator no longer includes untrusted input_tokens.
 * - CACHE_TTL_EXPIRY classifies the gap as user_idle vs tool_runtime; only
 *   user_idle is priced as habit waste.
 */

export const THRESHOLDS = {
  ttlGapSeconds: 300,
  ttlMinCreation: 10_000,
  bigOutputBytes: 30_000,
  cacheMissRatio: 0.5,
  minTurnsForMissRate: 5,
  contextCeiling: 200_000,
  ceilingShare: 0.8,
  retryErrorCount: 3,
  noSubagentReadCount: 15,
  bytesPerToken: BYTES_PER_TOKEN,
};

/**
 * Relative cost per input token: cache write 1.25×, cache read 0.1×, plain 1×.
 * Defined once in `data/model-prices.json` and re-exported here — the same
 * multipliers also underpin the dollar conversion, and two copies of a number
 * this load-bearing is how the two layers quietly stop agreeing.
 */
export const PRICE = CACHE;

/**
 * Rules that price a *different counterfactual* than the rest and must never be
 * summed into the headline. NO_SUBAGENT costs "delegate the
 * phase"; DUP/BIG cost "read less, read once" — over the same bytes. You can do
 * one fix or the other, not both, so adding them inflates the total.
 *
 * Single source: `bin/audit.js` splits session waste on it and `src/views.js`
 * renders it apart. Two copies of this set is how the split silently drifts.
 */
export const SEPARATE_RULES = new Set(['NO_SUBAGENT']);

function finding(rule, severity, sessionId, turnPointers, evidenceStats, estWasteTokens) {
  return { rule, severity, sessionId, turnPointers, evidenceStats, estWasteTokens: Math.round(estWasteTokens) };
}

const secs = (a, b) => (Date.parse(b) - Date.parse(a)) / 1000;
const toTokens = (bytes, t) => bytes / t.bytesPerToken;

/**
 * Prefix-persistence weight: a payload landing at time ts is
 * cache-written once, then cache-read on every later API turn. Returns the
 * multiplier to apply to the payload's token count.
 */
function persistenceWeight(ts, turns) {
  if (!ts) return PRICE.write;
  const t = Date.parse(ts);
  let remaining = 0;
  for (const turn of turns) if ((Date.parse(turn.timestamp) || 0) > t) remaining++;
  return PRICE.write + PRICE.read * remaining;
}

/**
 * Classify the dominant time gap between two api-turn timestamps by walking
 * the raw entries: if the largest inter-entry delta ends at a tool_result,
 * the wait was tool runtime, not user idle.
 */
function classifyGap(entries, fromTs, toTs) {
  const from = Date.parse(fromTs), to = Date.parse(toTs);
  const within = entries
    .filter((e) => {
      const t = Date.parse(e.timestamp);
      return t >= from && t <= to;
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  let best = 0, kind = 'user_idle';
  for (let i = 1; i < within.length; i++) {
    const d = Date.parse(within[i].timestamp) - Date.parse(within[i - 1].timestamp);
    if (d <= best) continue;
    best = d;
    const later = within[i];
    const isToolResult = later.type === 'user'
      && Array.isArray(later.message?.content)
      && later.message.content.some((b) => b?.type === 'tool_result');
    kind = isToolResult ? 'tool_runtime' : 'user_idle';
  }
  return kind;
}

/** gap > TTL followed by a cache_creation spike = full prefix rewrite (CACHE_TTL_EXPIRY). */
export function cacheTtlExpiry(session, t = THRESHOLDS) {
  const turns = apiTurns(session.entries).filter((x) => x.timestamp);
  const out = [];
  for (let i = 1; i < turns.length; i++) {
    const gap = secs(turns[i - 1].timestamp, turns[i].timestamp);
    const u = turns[i].usage;
    const creation = u.cache_creation_input_tokens ?? 0;
    const read = u.cache_read_input_tokens ?? 0;
    if (!(gap > t.ttlGapSeconds && creation >= t.ttlMinCreation && creation > read)) continue;
    const gapKind = classifyGap(session.entries, turns[i - 1].timestamp, turns[i].timestamp);
    // counterfactual: unexpired prefix would have been read at 0.1× instead
    // of rewritten at 1.25× → waste = creation × 1.15. Tool-runtime gaps are
    // not a habit issue: report at low severity, zero habit waste.
    const waste = gapKind === 'user_idle' ? creation * (PRICE.write - PRICE.read) : 0;
    out.push(finding('CACHE_TTL_EXPIRY', gapKind === 'user_idle' ? 'medium' : 'low',
      session.sessionId, [turns[i].uuid],
      { gapSeconds: Math.round(gap), gapKind, cacheCreation: creation, cacheRead: read }, waste));
  }
  return out;
}

const MUTATORS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/**
 * Same tool + same normalized input called more than once (DUP_TOOL_CALL),
 * with generation tracking: a Write/Edit (or a Bash command mentioning the
 * path) between two Reads of the same file resets the group, so re-reads
 * after mutations are not flagged.
 * Returns { findings, claimedIds } — claimedIds are the repeat tool_use ids,
 * used by bigToolOutput to avoid double-counting.
 */
export function dupToolCall(session, t = THRESHOLDS) {
  const calls = toolCalls(session.entries); // file order ≈ chronological
  const results = new Map(toolResults(session.entries).map((r) => [r.toolUseId, r]));
  const turns = apiTurns(session.entries);
  const generation = new Map(); // path → generation counter
  const groups = new Map();

  const bump = (path) => generation.set(path, (generation.get(path) ?? 0) + 1);

  for (const c of calls) {
    if (MUTATORS.has(c.name) && c.input?.file_path) bump(c.input.file_path);
    if (c.name === 'Bash') {
      const cmd = c.input?.command ?? '';
      for (const path of generation.keys()) if (cmd.includes(path)) bump(path);
      // also invalidate any previously-read path mentioned in the command
      for (const key of groups.keys()) {
        const p = key.split('\u0000')[2];
        if (p && cmd.includes(p)) bump(p);
      }
    }
    const path = c.name === 'Read' ? (c.input?.file_path ?? '') : '';
    const gen = path ? (generation.get(path) ?? 0) : 0;
    const key = `${paramHash(c.name, c.input)}\u0000${gen}\u0000${path}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  const findings = [];
  const claimedIds = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    let waste = 0, bytes = 0;
    for (const c of group.slice(1)) {
      claimedIds.add(c.id);
      const r = results.get(c.id);
      if (!r) continue;
      bytes += r.bytes;
      waste += toTokens(r.bytes, t) * persistenceWeight(r.timestamp, turns);
    }
    findings.push(finding('DUP_TOOL_CALL', group.length > 2 ? 'high' : 'medium', session.sessionId,
      group.map((c) => c.uuid),
      { tool: group[0].name, count: group.length, repeatBytes: bytes }, waste));
  }
  return { findings, claimedIds };
}

/**
 * tool_result larger than threshold (BIG_TOOL_OUTPUT). Prices only the
 * excess over threshold (the avoidable part), persistence-weighted.
 * Results already claimed by DUP_TOOL_CALL are skipped.
 */
export function bigToolOutput(session, t = THRESHOLDS, claimedIds = new Set()) {
  const names = new Map(toolCalls(session.entries).map((c) => [c.id, c.name]));
  const turns = apiTurns(session.entries);
  return toolResults(session.entries)
    .filter((r) => r.bytes > t.bigOutputBytes && !claimedIds.has(r.toolUseId))
    .map((r) => {
      const excess = r.bytes - t.bigOutputBytes;
      const waste = toTokens(excess, t) * persistenceWeight(r.timestamp, turns);
      return finding('BIG_TOOL_OUTPUT', r.bytes > 4 * t.bigOutputBytes ? 'high' : 'medium',
        session.sessionId, [r.toolUseId],
        { tool: names.get(r.toolUseId) ?? '?', bytes: r.bytes, excessBytes: excess }, waste);
    });
}

/** ≥N errored calls of the same normalized invocation (RETRY_STORM). */
export function retryStorm(session, t = THRESHOLDS) {
  const results = new Map(toolResults(session.entries).map((r) => [r.toolUseId, r]));
  const turns = apiTurns(session.entries);
  const errorGroups = new Map();
  for (const c of toolCalls(session.entries)) {
    if (!results.get(c.id)?.isError) continue;
    const key = paramHash(c.name, c.input);
    if (!errorGroups.has(key)) errorGroups.set(key, []);
    errorGroups.get(key).push(c);
  }
  const out = [];
  for (const group of errorGroups.values()) {
    if (group.length < t.retryErrorCount) continue;
    let waste = 0;
    for (const c of group) {
      const r = results.get(c.id);
      if (r) waste += toTokens(r.bytes, t) * persistenceWeight(r.timestamp, turns);
    }
    out.push(finding('RETRY_STORM', 'high', session.sessionId, group.map((c) => c.uuid),
      { tool: group[0].name, errorCount: group.length }, waste));
  }
  return out;
}

/**
 * Session-level cache hit ratio below threshold (CACHE_MISS_RATE).
 * Denominator uses only trusted cache fields (invariant 3) —
 * input_tokens removed.
 */
export function cacheMissRate(session, t = THRESHOLDS) {
  const turns = apiTurns(session.entries);
  if (turns.length < t.minTurnsForMissRate) return [];
  let read = 0, creation = 0;
  for (const { usage } of turns) {
    read += usage.cache_read_input_tokens ?? 0;
    creation += usage.cache_creation_input_tokens ?? 0;
  }
  const total = read + creation;
  if (total === 0) return [];
  const ratio = read / total;
  if (ratio >= t.cacheMissRatio) return [];
  // counterfactual: created tokens read at 0.1× instead of written at 1.25×
  return [finding('CACHE_MISS_RATE', ratio < t.cacheMissRatio / 2 ? 'high' : 'medium',
    session.sessionId, [],
    { ratio: Number(ratio.toFixed(3)), turns: turns.length, cacheRead: read, cacheCreation: creation },
    creation * (PRICE.write - PRICE.read))];
}

/** Max context near the 200K ceiling (CONTEXT_GROWTH). Amplifier — no direct waste. */
export function contextGrowth(session, t = THRESHOLDS) {
  const turns = apiTurns(session.entries);
  let peak = 0, peakUuid = null;
  for (const turn of turns) {
    const total = totalContext(turn.usage);
    if (total > peak) { peak = total; peakUuid = turn.uuid; }
  }
  if (peak < t.contextCeiling * t.ceilingShare) return [];
  return [finding('CONTEXT_GROWTH', peak > t.contextCeiling * 0.95 ? 'high' : 'medium',
    session.sessionId, [peakUuid],
    { peakContext: peak, ceilingShare: Number((peak / t.contextCeiling).toFixed(2)), turns: turns.length }, 0)];
}

/**
 * Heavy inline scanning with no delegation (NO_SUBAGENT). Counterfactual:
 * a subagent returns a summary, so scan bytes never persist in the main
 * prefix — waste is the persistence-weighted read cost of the scans.
 */
export function noSubagent(session, t = THRESHOLDS) {
  if (session.hasSubagents) return [];
  const scans = toolCalls(session.entries).filter((c) => ['Read', 'Grep', 'Glob'].includes(c.name));
  if (scans.length < t.noSubagentReadCount) return [];
  const results = new Map(toolResults(session.entries).map((r) => [r.toolUseId, r]));
  const turns = apiTurns(session.entries);
  let bytes = 0, waste = 0;
  for (const c of scans) {
    const r = results.get(c.id);
    if (!r) continue;
    bytes += r.bytes;
    waste += toTokens(r.bytes, t) * persistenceWeight(r.timestamp, turns);
  }
  return [finding('NO_SUBAGENT', 'low', session.sessionId, [],
    { scanCalls: scans.length, scanBytes: bytes }, waste)];
}

/**
 * Run all rules with double-count prevention: DUP_TOOL_CALL claims its
 * repeat results first; BIG_TOOL_OUTPUT skips them. NO_SUBAGENT overlaps
 * both by design (it prices a different counterfactual) — report it in its
 * own section, not summed into the headline waste total.
 */
export function runRules(session, thresholds = THRESHOLDS) {
  const dup = dupToolCall(session, thresholds);
  const findings = [
    ...dup.findings,
    ...bigToolOutput(session, thresholds, dup.claimedIds),
    ...cacheTtlExpiry(session, thresholds),
    ...retryStorm(session, thresholds),
    ...cacheMissRate(session, thresholds),
    ...contextGrowth(session, thresholds),
    ...noSubagent(session, thresholds),
  ];
  return findings.sort((a, b) => b.estWasteTokens - a.estWasteTokens);
}
