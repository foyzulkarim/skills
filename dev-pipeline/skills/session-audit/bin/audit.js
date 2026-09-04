#!/usr/bin/env node
/**
 * Session efficiency audit runner.
 *
 *   node bin/audit.js run [--max N]
 *     Digest every main session under ~/.claude/projects into metadata-only
 *     artifacts in audit_workdir/: manifest.json, l1_findings.json,
 *     overview.json. No LLM involved — this is L0+L1.
 *
 *   node bin/audit.js views
 *     Render the Phase 1 landscape from the artifacts as one bounded text
 *     block. Deterministic and zero-LLM — replaces ad-hoc node one-liners
 *     over the (100KB+) artifacts.
 *
 *   node bin/audit.js fetch <session-id> --kind <kind> [--limit N] [--max-bytes B] [--uuid U] [--radius K]
 *     L2's only door to content. Kinds: user_text, error_head,
 *     tool_input, assistant_head, turn_window. Every fetch is logged to
 *     audit_workdir/fetch_log.jsonl (invariant 6).
 */
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSessionFile, apiTurns, toolCalls, toolResults, totalContext } from '../src/parser.js';
import { runRules, SEPARATE_RULES, THRESHOLDS } from '../src/rules.js';
import { discoverSessions, findSession, DEFAULT_PROJECTS_DIR } from '../src/discover.js';
import { renderViews } from '../src/views.js';
import { sessionRate, usd, PRICES } from '../src/pricing.js';

const PROJECTS_DIR = process.env.AUDIT_PROJECTS_DIR ?? DEFAULT_PROJECTS_DIR;
const WORKDIR = process.env.AUDIT_WORKDIR ?? join(process.cwd(), 'audit_workdir');

const args = process.argv.slice(2);
const command = args[0];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

if (command === 'run') run();
else if (command === 'views') views();
else if (command === 'fetch') fetch();
else {
  console.error('usage: audit.js run [--max N] | audit.js views | audit.js fetch <session-id> --kind <kind> [--limit N] [--max-bytes B]');
  process.exit(1);
}

// ---------- views: deterministic Phase 1 landscape ----------

function views() {
  try {
    console.log(renderViews(WORKDIR));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`no artifacts in ${WORKDIR} — run \`node bin/audit.js run\` first`);
      process.exit(1);
    }
    throw err;
  }
}

// ---------- run: L0 digest + L1 rules + overview aggregates ----------

function run() {
  const maxSessions = Number(flag('max', Infinity));
  const { sessions, excludedActive } = discoverSessions({ projectsDir: PROJECTS_DIR, maxSessions });
  mkdirSync(WORKDIR, { recursive: true });

  const allFindings = [];
  const sessionStats = [];
  const tools = {};
  const models = {};
  const gapBuckets = { 'lt_1m': zeroGap(), '1m_5m': zeroGap(), '5m_30m': zeroGap(), 'gt_30m': zeroGap() };
  const dates = {};
  const skills = {};
  // Models seen with no published rate. Their tokens count toward the headline
  // and nothing toward the dollar figure; the set is reported so the gap is
  // visible rather than silently deflating the total (src/pricing.js).
  const unpricedModels = new Set();

  for (const s of sessions) {
    let entries;
    try { entries = parseSessionFile(s.path); } catch { continue; }
    const turns = apiTurns(entries);
    const calls = toolCalls(entries);
    const results = new Map(toolResults(entries).map((r) => [r.toolUseId, r]));
    const findings = runRules({ sessionId: s.sessionId, entries, hasSubagents: s.hasSubagents });
    allFindings.push(...findings.map((f) => ({ ...f, project: s.project })));

    let cacheRead = 0, cacheCreation = 0, inputTok = 0, outputTok = 0, peak = 0;
    // Per-session model mix, keyed by id → turns. Dollar pricing is per-session
    // (a directory-wide blended rate would misprice every session that didn't
    // match the directory's model split), so the mix has to be carried here and
    // not only in the global `models` aggregate.
    const sessionModels = {};
    for (const t of turns) {
      const u = t.usage;
      cacheRead += u.cache_read_input_tokens ?? 0;
      cacheCreation += u.cache_creation_input_tokens ?? 0;
      inputTok += u.input_tokens ?? 0;
      outputTok += u.output_tokens ?? 0;
      peak = Math.max(peak, totalContext(u));
      if (t.model) {
        sessionModels[t.model] = (sessionModels[t.model] ?? 0) + 1;
        models[t.model] ??= { turns: 0, outputTokens: 0, cacheRead: 0, cacheCreation: 0 };
        models[t.model].turns++;
        models[t.model].outputTokens += u.output_tokens ?? 0;
        models[t.model].cacheRead += u.cache_read_input_tokens ?? 0;
        models[t.model].cacheCreation += u.cache_creation_input_tokens ?? 0;
      }
    }

    // gap buckets: cache_creation of the turn that follows each gap (TTL cost by work rhythm)
    const timed = turns.filter((t) => t.timestamp);
    for (let i = 1; i < timed.length; i++) {
      const gap = (Date.parse(timed[i].timestamp) - Date.parse(timed[i - 1].timestamp)) / 1000;
      const bucket = gap < 60 ? 'lt_1m' : gap < 300 ? '1m_5m' : gap < 1800 ? '5m_30m' : 'gt_30m';
      gapBuckets[bucket].turns++;
      gapBuckets[bucket].cacheCreation += timed[i].usage.cache_creation_input_tokens ?? 0;
    }

    for (const c of calls) {
      tools[c.name] ??= { calls: 0, resultBytes: 0, errors: 0 };
      tools[c.name].calls++;
      const r = results.get(c.id);
      if (r) {
        tools[c.name].resultBytes += r.bytes;
        if (r.isError) tools[c.name].errors++;
      }
    }

    for (const [name, uses] of sessionSkills(entries)) {
      skills[name] ??= { uses: 0, sessions: 0 };
      skills[name].uses += uses;
      skills[name].sessions++;
    }

    const firstTs = timed[0]?.timestamp ?? null;
    // Headline and separate counterfactuals are split at the source. NO_SUBAGENT
    // prices "delegate the phase"; the other rules price "read less / read once".
    // Both cover the same bytes, so summing them double-counts —
    // and every downstream figure that used to add them (project rollups, the
    // worst-sessions ranking, and now the dollar conversion) inherited that.
    const waste = findings.reduce((n, f) => n + (SEPARATE_RULES.has(f.rule) ? 0 : f.estWasteTokens), 0);
    const separateWaste = findings.reduce((n, f) => n + (SEPARATE_RULES.has(f.rule) ? f.estWasteTokens : 0), 0);
    const date = firstTs ? firstTs.slice(0, 10) : 'unknown';
    dates[date] ??= { sessions: 0, cacheRead: 0, cacheCreation: 0, wasteTokens: 0 };
    dates[date].sessions++;
    dates[date].cacheRead += cacheRead;
    dates[date].cacheCreation += cacheCreation;
    dates[date].wasteTokens += waste;

    // Waste is already in 1× input-token-cost equivalents (src/pricing.js), so
    // the dollar figure is one multiply by the session's blended input rate.
    const { rate, pricedShare, unpriced } = sessionRate(sessionModels, date);
    for (const m of unpriced) unpricedModels.add(m);

    sessionStats.push({
      sessionId: s.sessionId,
      project: s.project,
      date,
      entries: entries.length,
      apiTurns: turns.length,
      toolCalls: calls.length,
      cacheRead, cacheCreation, inputTok, outputTok,
      cacheHitRatio: round3(cacheRead / Math.max(1, cacheRead + cacheCreation + inputTok)),
      peakContext: peak,
      hasSubagents: s.hasSubagents,
      wasteTokens: waste,
      separateWasteTokens: separateWaste,
      models: sessionModels,
      usdPerMTok: rate === null ? null : Number((rate * 1e6).toFixed(3)),
      pricedShare: round3(pricedShare),
      wasteUsd: rate === null ? null : Number((waste * rate).toFixed(4)),
      separateWasteUsd: rate === null ? null : Number((separateWaste * rate).toFixed(4)),
      findingsByRule: countBy(findings, (f) => f.rule),
    });
  }

  const pricedSessions = sessionStats.filter((s) => s.wasteUsd !== null);
  const pricedWaste = pricedSessions.reduce((n, s) => n + s.wasteTokens, 0);
  const totalWaste = sessionStats.reduce((n, s) => n + s.wasteTokens, 0);

  const manifest = {
    generatedAt: new Date().toISOString(),
    projectsDir: PROJECTS_DIR,
    sessionsAudited: sessionStats.length,
    excludedActive,
    auditorVersion: '0.2.0',
    thresholds: THRESHOLDS,
    pricing: {
      unit: 'USD, from estWasteTokens × per-session blended input rate',
      pricedModels: Object.keys(PRICES),
      unpricedModels: [...unpricedModels].sort(),
      // Share of headline waste that carries a dollar figure. Below 1.0, the
      // report's dollar total is a floor, not the whole cost.
      pricedWasteShare: totalWaste ? round3(pricedWaste / totalWaste) : 1,
    },
  };
  const overview = {
    projects: rollupProjects(sessionStats),
    tools, models, gapBuckets, dates, skills,
    sessions: sessionStats.sort((a, b) => b.wasteTokens - a.wasteTokens),
  };

  writeFileSync(join(WORKDIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(WORKDIR, 'l1_findings.json'), JSON.stringify(allFindings, null, 2));
  writeFileSync(join(WORKDIR, 'overview.json'), JSON.stringify(overview, null, 2));

  console.log(`audited ${sessionStats.length} sessions (${excludedActive.length} active excluded)`);
  // NO_SUBAGENT prices a different counterfactual (delegate the phase vs. read
  // less), so it is reported beside the headline, never added to it.
  const sumK = (pred) => Math.round(allFindings.filter(pred).reduce((n, f) => n + f.estWasteTokens, 0) / 1000);
  const sumUsd = (key) => sessionStats.reduce((n, s) => n + (s[key] ?? 0), 0);
  console.log(`findings: ${allFindings.length}, est. waste ~${sumK((f) => !SEPARATE_RULES.has(f.rule))}K tokens `
    + `= ${usd(sumUsd('wasteUsd'))} `
    + `(+${sumK((f) => SEPARATE_RULES.has(f.rule))}K / ${usd(sumUsd('separateWasteUsd'))} NO_SUBAGENT, separate counterfactual)`);
  if (unpricedModels.size) {
    console.log(`note: ${(1 - manifest.pricing.pricedWasteShare) * 100 < 0.1 ? '<0.1' : Math.round((1 - manifest.pricing.pricedWasteShare) * 100)}% `
      + `of waste is on unpriced models (${[...unpricedModels].sort().join(', ')}) — dollar figures are a floor`);
  }
  console.log(`artifacts written to ${WORKDIR}/{manifest,l1_findings,overview}.json`);
}

function sessionSkills(entries) {
  const counts = new Map();
  for (const e of entries) {
    const content = e.message?.content;
    if (e.type === 'assistant' && Array.isArray(content)) {
      for (const b of content) {
        if (b?.type === 'tool_use' && b.name === 'Skill' && typeof b.input?.skill === 'string') {
          counts.set(b.input.skill, (counts.get(b.input.skill) ?? 0) + 1);
        }
      }
    }
    if (e.type === 'user') {
      const text = typeof content === 'string' ? content
        : Array.isArray(content) ? content.map((b) => (typeof b?.text === 'string' ? b.text : '')).join(' ') : '';
      const m = text.match(/<command-name>\/?([\w:./-]+)<\/command-name>/);
      if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
  }
  return counts;
}

function rollupProjects(sessionStats) {
  const projects = {};
  for (const s of sessionStats) {
    const p = (projects[s.project] ??= {
      sessions: 0, apiTurns: 0, cacheRead: 0, cacheCreation: 0, inputTok: 0,
      wasteTokens: 0, separateWasteTokens: 0, wasteUsd: 0,
    });
    p.sessions++;
    p.apiTurns += s.apiTurns;
    p.cacheRead += s.cacheRead;
    p.cacheCreation += s.cacheCreation;
    p.inputTok += s.inputTok;
    p.wasteTokens += s.wasteTokens;
    p.separateWasteTokens += s.separateWasteTokens;
    p.wasteUsd += s.wasteUsd ?? 0;
  }
  for (const p of Object.values(projects)) {
    p.cacheHitRatio = round3(p.cacheRead / Math.max(1, p.cacheRead + p.cacheCreation + p.inputTok));
    p.wasteUsd = Number(p.wasteUsd.toFixed(4));
  }
  return projects;
}

function zeroGap() { return { turns: 0, cacheCreation: 0 }; }
function round3(x) { return Number(x.toFixed(3)); }
function countBy(arr, key) {
  const out = {};
  for (const x of arr) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return out;
}

// ---------- fetch: L2's budget-capped content door ----------

function fetch() {
  const sessionId = args[1];
  const kind = flag('kind');
  const limit = Number(flag('limit', 5));
  // Enforce invariant I2's byte cap: any --max-bytes above 2000 is clamped.
  const requestedBytes = Number(flag('max-bytes', 500));
  const maxBytes = Math.min(requestedBytes, 2000);
  if (requestedBytes > 2000) {
    console.error(`warning: --max-bytes ${requestedBytes} exceeds invariant I2 cap; clamped to ${maxBytes}`);
  }
  const uuid = flag('uuid', null);
  const radius = Number(flag('radius', 3));
  if (!sessionId || !kind) {
    console.error('usage: audit.js fetch <session-id> --kind user_text|error_head|tool_input|assistant_head|turn_window [--limit N] [--max-bytes B] [--uuid U] [--radius K]');
    process.exit(1);
  }
  const found = findSession(sessionId, PROJECTS_DIR);
  if (!found) { console.error(`session ${sessionId} not found under ${PROJECTS_DIR}`); process.exit(1); }
  const entries = parseSessionFile(found.path);

  const clip = (s) => (typeof s === 'string' ? s.slice(0, maxBytes) : '');
  const textOf = (content) => typeof content === 'string' ? content
    : Array.isArray(content) ? content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n') : '';

  let items = [];
  if (kind === 'user_text') {
    items = entries
      .filter((e) => e.type === 'user' && !e.isMeta)
      .map((e) => ({ uuid: e.uuid, ts: e.timestamp, text: textOf(e.message?.content) }))
      .filter((x) => x.text && !x.text.startsWith('<'))
      .map((x) => ({ ...x, text: clip(x.text) }));
  } else if (kind === 'assistant_head') {
    items = entries
      .filter((e) => e.type === 'assistant')
      .map((e) => ({ uuid: e.uuid, ts: e.timestamp, text: clip(textOf(e.message?.content)) }))
      .filter((x) => x.text);
  } else if (kind === 'error_head') {
    for (const e of entries) {
      if (e.type !== 'user' || !Array.isArray(e.message?.content)) continue;
      for (const b of e.message.content) {
        if (b?.type === 'tool_result' && b.is_error === true) {
          items.push({ uuid: e.uuid, ts: e.timestamp, toolUseId: b.tool_use_id, head: clip(typeof b.content === 'string' ? b.content : textOf(b.content)) });
        }
      }
    }
  } else if (kind === 'tool_input') {
    items = toolCalls(entries).map((c) => ({ uuid: c.uuid, ts: c.timestamp, tool: c.name, input: clip(JSON.stringify(c.input)) }));
  } else if (kind === 'turn_window') {
    const center = entries.findIndex((e) => e.uuid === uuid);
    if (center < 0) { console.error(`uuid ${uuid} not found`); process.exit(1); }
    for (let i = Math.max(0, center - radius); i <= Math.min(entries.length - 1, center + radius); i++) {
      const e = entries[i];
      items.push({
        i, uuid: e.uuid, type: e.type, ts: e.timestamp,
        tools: Array.isArray(e.message?.content) ? e.message.content.filter((b) => b?.type === 'tool_use').map((b) => b.name) : [],
        bytes: JSON.stringify(e).length,
      });
    }
  } else {
    console.error(`unknown kind ${kind}`);
    process.exit(1);
  }

  if (uuid && kind !== 'turn_window') items = items.filter((x) => x.uuid === uuid);
  items = items.slice(0, limit);

  const payload = { sessionId, kind, count: items.length, items };
  const body = JSON.stringify(payload, null, 1);
  mkdirSync(WORKDIR, { recursive: true });
  appendFileSync(join(WORKDIR, 'fetch_log.jsonl'), JSON.stringify({
    ts: new Date().toISOString(), sessionId, kind, limit, maxBytes, returnedBytes: body.length,
  }) + '\n');
  console.log(body);
}
