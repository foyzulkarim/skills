/**
 * Phase 1 landscape renderer.
 *
 * SKILL.md tells the reasoning layer to "extract compact views with node
 * one-liners" from overview.json / l1_findings.json. Those files are ~100KB+,
 * so hand-rolled queries are both a self-cost leak (every one-liner and its
 * output lands in the transcript) and a correctness risk — a stat that is
 * awkward to query tends to get inferred from a nearby finding count instead.
 *
 * This module renders the whole landscape deterministically, in one bounded
 * block, at zero LLM cost. Anything the reasoner needs to see in Phase 1
 * belongs here rather than in an ad-hoc query.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEPARATE_RULES } from './rules.js';
import { usd } from './pricing.js';

const K = (n) => (Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n)));
const M = (n) => `${(n / 1e6).toFixed(1)}M`;
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
/** Project keys are path-mangled (`-Users-fkarim-works-cma`); show the tail. */
const proj = (p) => String(p).replace(/^-Users-[^-]+-/, '').slice(-28);

const read = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));

export function renderViews(workdir) {
  const manifest = read(workdir, 'manifest.json');
  const overview = read(workdir, 'overview.json');
  const findings = read(workdir, 'l1_findings.json');
  const out = [];
  const say = (s = '') => out.push(s);

  const sessions = overview.sessions ?? [];
  const totalRead = sessions.reduce((s, x) => s + (x.cacheRead ?? 0), 0);
  const totalCreation = sessions.reduce((s, x) => s + (x.cacheCreation ?? 0), 0);
  const turns = sessions.reduce((s, x) => s + (x.apiTurns ?? 0), 0);

  // Dollars are priced per session (src/pricing.js), so every rule- and
  // project-level figure joins back through this map rather than applying one
  // directory-wide rate that no individual session actually paid.
  const rateOf = new Map(sessions.map((s) => [s.sessionId, (s.usdPerMTok ?? null) === null ? null : s.usdPerMTok / 1e6]));
  const dollars = (tokens, sessionId) => {
    const r = rateOf.get(sessionId);
    return r === null || r === undefined ? 0 : tokens * r;
  };

  const byRule = {};
  for (const f of findings) {
    const r = (byRule[f.rule] ??= { n: 0, w: 0, usd: 0, sev: {}, sessions: new Set() });
    r.n++; r.w += f.estWasteTokens ?? 0;
    r.usd += dollars(f.estWasteTokens ?? 0, f.sessionId);
    r.sessions.add(f.sessionId);
    r.sev[f.severity] = (r.sev[f.severity] ?? 0) + 1;
  }
  const sum = (pred, key) => Object.entries(byRule).filter(([r]) => pred(r)).reduce((s, [, v]) => s + v[key], 0);
  const headline = sum((r) => !SEPARATE_RULES.has(r), 'w');
  const separate = sum((r) => SEPARATE_RULES.has(r), 'w');
  const headlineUsd = sum((r) => !SEPARATE_RULES.has(r), 'usd');
  const separateUsd = sum((r) => SEPARATE_RULES.has(r), 'usd');

  say(`## Totals`);
  say(`sessions ${sessions.length} (${(manifest.excludedActive ?? []).length} active excluded) · apiTurns ${turns}`);
  say(`cacheRead ${M(totalRead)} · cacheCreation ${M(totalCreation)} · hitRatio ${(totalRead / (totalRead + totalCreation)).toFixed(3)}`);
  say(`findings ${findings.length} · headline waste ${K(headline)} = ${usd(headlineUsd)} · separate counterfactual ${K(separate)} = ${usd(separateUsd)}`);
  say(`waste as share of read volume ${((headline / totalRead) * 100).toFixed(2)}%`);
  // Two disclosures the dollar figure is meaningless without. Both are floors,
  // and a floor the reader can see beats a total they over-trust.
  const pricing = manifest.pricing ?? {};
  if ((pricing.unpricedModels ?? []).length) {
    say(`unpriced models (excluded from $): ${pricing.unpricedModels.join(', ')} — `
      + `${((pricing.pricedWasteShare ?? 1) * 100).toFixed(1)}% of waste carries a price`);
  }
  say(`NOT measured: thinking tokens (invisible to every rule) and compaction events — $ and token totals are floors, not ceilings`);
  say();

  // `sessions` is the column that decides whether a rule is a habit or one bad
  // week: 216 findings across 4 sessions and across 80 are the same count and
  // opposite conclusions. The finding count alone cannot tell them apart.
  say(`## Findings by rule`);
  say(`${pad('rule', 18)} ${lpad('n', 4)} ${lpad('sess', 5)}  ${lpad('tokens', 7)}  ${lpad('usd', 9)}  severity`);
  for (const [rule, v] of Object.entries(byRule).sort((a, b) => b[1].w - a[1].w)) {
    const sev = Object.entries(v.sev).sort().map(([s, n]) => `${n} ${s}`).join(' / ');
    say(`${pad(rule, 18)} ${lpad(v.n, 4)} ${lpad(v.sessions.size, 5)}  ${lpad(K(v.w), 7)}  ${lpad(usd(v.usd), 9)}  ${sev}${SEPARATE_RULES.has(rule) ? '  [separate]' : ''}`);
  }
  say();

  // The distribution the reasoner cannot safely infer from CACHE_MISS_RATE:
  // that rule needs ratio < 0.5 AND >= 5 turns, so low-ratio short sessions
  // are silently absent from the finding list.
  say(`## Cache hit-ratio distribution`);
  // Sessions with no cache activity at all sit at ratio 0 and would swamp the
  // low buckets; they cost nothing, so they are counted apart from the curve.
  const trivial = sessions.filter((s) => (s.cacheRead ?? 0) + (s.cacheCreation ?? 0) === 0);
  const priced = sessions.filter((s) => (s.cacheRead ?? 0) + (s.cacheCreation ?? 0) > 0);
  const buckets = [['<0.50', 0, 0.5], ['0.50-0.90', 0.5, 0.9], ['0.90-0.95', 0.9, 0.95], ['>=0.95', 0.95, Infinity]];
  for (const [label, lo, hi] of buckets) {
    const inB = priced.filter((s) => (s.cacheHitRatio ?? 1) >= lo && (s.cacheHitRatio ?? 1) < hi);
    const cc = inB.reduce((a, x) => a + (x.cacheCreation ?? 0), 0);
    say(`${pad(label, 10)} ${lpad(inB.length, 4)} sessions · cacheCreation ${lpad(K(cc), 7)}`);
  }
  say(`${pad('no cache', 10)} ${lpad(trivial.length, 4)} sessions · zero volume, excluded above`);
  // Ranked by cache-creation, not by ratio: a 0.28 ratio on 191K created
  // tokens is actionable, a 0.00 ratio on 400 is not. CACHE_MISS_RATE only
  // fires below 0.5 with >=5 turns, so this list is deliberately wider.
  // Full session ids (an 8-char prefix cannot be resumed or fetched).
  const costly = priced.filter((s) => (s.cacheHitRatio ?? 1) < 0.9)
    .sort((a, b) => (b.cacheCreation ?? 0) - (a.cacheCreation ?? 0)).slice(0, 6);
  say(`costliest low-ratio (<0.90), by cacheCreation:`);
  for (const s of costly) {
    say(`  ${s.sessionId} ${pad(proj(s.project), 22)} ratio ${(s.cacheHitRatio ?? 1).toFixed(3)}  cc ${lpad(K(s.cacheCreation ?? 0), 6)}  turns ${lpad(s.apiTurns, 4)}  ${(s.findingsByRule ?? {}).CACHE_MISS_RATE ? 'flagged' : 'NOT flagged by rule'}`);
  }
  say();

  // Per-project, because that is the unit a dev (or a team) acts on. The
  // directory total says "you waste $X"; this says which repo to fix first.
  say(`## Projects by waste`);
  for (const [name, p] of Object.entries(overview.projects ?? {}).sort((a, b) => b[1].wasteTokens - a[1].wasteTokens).slice(0, 8)) {
    say(`${pad(proj(name), 28)} ${lpad(p.sessions, 4)} sess ${lpad(p.apiTurns, 6)} turns  read ${lpad(M(p.cacheRead), 7)}  waste ${lpad(K(p.wasteTokens), 7)} ${lpad(usd(p.wasteUsd ?? 0), 9)}  hit ${p.cacheHitRatio}`);
  }
  say();

  // Full session ids, not truncated. An 8-char prefix is unverifiable: the
  // reader cannot resume the session or fetch from it, so every claim built on
  // one is take-it-on-faith. The command below is the whole point of the id.
  say(`## Worst sessions by waste`);
  for (const s of [...sessions].sort((a, b) => b.wasteTokens - a.wasteTokens).slice(0, 10)) {
    const rules = Object.entries(s.findingsByRule ?? {}).map(([r, n]) => `${r}×${n}`).join(',');
    say(`${s.sessionId} ${pad(proj(s.project), 22)} ${s.date} turns ${lpad(s.apiTurns, 4)} peak ${lpad(K(s.peakContext), 5)} sub ${s.hasSubagents ? 'Y' : 'n'} waste ${lpad(K(s.wasteTokens), 7)} ${lpad(usd(s.wasteUsd ?? 0), 9)}  ${rules}`);
  }
  say(`inspect: node {base_directory}/bin/audit.js fetch <session-id> --kind user_text --limit 3 --max-bytes 500`);
  say();

  // Idle-gap excess, priced against the <1m baseline. Reported in RAW cache
  // tokens — rule waste is cost-equivalent (creation × 1.15), so the two are
  // NOT directly comparable. Both units are printed to stop that conflation.
  say(`## Idle-gap cost curve  (raw cache-creation tokens)`);
  const gb = overview.gapBuckets ?? {};
  const base = gb['lt_1m'] ? gb['lt_1m'].cacheCreation / gb['lt_1m'].turns : 0;
  let excess = 0;
  for (const [label, b] of Object.entries(gb)) {
    if (!b.turns) continue;
    const per = b.cacheCreation / b.turns;
    const ex = label === 'lt_1m' ? 0 : (per - base) * b.turns;
    excess += ex;
    say(`${pad(label, 8)} turns ${lpad(b.turns, 5)}  cc/turn ${lpad(Math.round(per), 6)}  ${lpad((per / base).toFixed(1) + '×', 6)}  excess ${lpad(ex ? K(ex) : '—', 7)}`);
  }
  say(`total excess ${K(excess)} raw  =  ${K(excess * 1.15)} cost-equivalent (compare THIS to CACHE_TTL_EXPIRY)`);
  say();

  say(`## Tools by bytes into context`);
  for (const [name, t] of Object.entries(overview.tools ?? {}).sort((a, b) => b[1].resultBytes - a[1].resultBytes).slice(0, 8)) {
    say(`${pad(name.replace(/^mcp__[^_]+__/, ''), 26)} calls ${lpad(t.calls, 5)}  ${lpad((t.resultBytes / 1e6).toFixed(2), 6)}MB  ${lpad(Math.round(t.resultBytes / t.calls), 6)} B/call  err ${t.errors}`);
  }
  say();

  say(`## Peak context & delegation`);
  const pk = [['<50K', 0, 50e3], ['50-150K', 50e3, 150e3], ['150-250K', 150e3, 250e3], ['250-350K', 250e3, 350e3], ['>350K', 350e3, Infinity]];
  say(pk.map(([l, lo, hi]) => `${l}:${sessions.filter((s) => (s.peakContext ?? 0) >= lo && (s.peakContext ?? 0) < hi).length}`).join('  '));
  const withSub = sessions.filter((s) => s.hasSubagents);
  const without = sessions.filter((s) => !s.hasSubagents);
  const avgPeak = (a) => (a.length ? K(a.reduce((s, x) => s + (x.peakContext ?? 0), 0) / a.length) : '—');
  say(`subagents used ${withSub.length}/${sessions.length} · avg peak with ${avgPeak(withSub)} vs without ${avgPeak(without)}`);
  const longNoSub = sessions.filter((s) => (s.apiTurns ?? 0) > 100 && !s.hasSubagents).length;
  const long = sessions.filter((s) => (s.apiTurns ?? 0) > 100).length;
  say(`sessions >100 turns with no subagent: ${longNoSub}/${long}`);
  say();

  say(`## Trend by date  (oldest → newest)`);
  const dates = Object.entries(overview.dates ?? {}).filter(([d]) => d !== 'unknown').sort();
  const half = Math.floor(dates.length / 2);
  for (const [label, slice] of [['earlier', dates.slice(0, half)], ['later', dates.slice(half)]]) {
    if (!slice.length) continue;
    const s = slice.reduce((a, [, v]) => ({
      sessions: a.sessions + v.sessions, read: a.read + v.cacheRead, waste: a.waste + v.wasteTokens,
    }), { sessions: 0, read: 0, waste: 0 });
    say(`${pad(label, 8)} ${slice[0][0]}→${slice.at(-1)[0]}  sessions ${lpad(s.sessions, 4)}  read ${lpad(M(s.read), 7)}  waste ${lpad(K(s.waste), 7)}  rate ${((s.waste / s.read) * 100).toFixed(2)}%`);
  }
  say();

  say(`## Skills by use`);
  say(Object.entries(overview.skills ?? {}).sort((a, b) => b[1].uses - a[1].uses).slice(0, 12)
    .map(([n, v]) => `${n}:${v.uses}/${v.sessions}s`).join('  '));

  return out.join('\n');
}
