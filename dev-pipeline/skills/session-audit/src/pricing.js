/**
 * Token → dollar conversion for the waste model.
 *
 * `estWasteTokens` is denominated in **1× input-token-cost equivalents**
 * (every rule prices actual − counterfactual against the
 * base input rate, with cache write at 1.25× and cache read at 0.1× already
 * folded in). So the conversion is a single multiply — no second cache
 * multiplier, or the premium would be applied twice:
 *
 *     usd = estWasteTokens × inputRatePerToken(model)
 *
 * A dollar figure is the difference between "9,024K tokens" and a number the
 * reader can weigh against an afternoon of their time. Everything else in the
 * report ranks; this is the only line that says whether to act at all.
 *
 * ## Why unpriced models are excluded rather than approximated
 *
 * Only models with a published rate below are priced. A session on an unlisted
 * model contributes tokens to the headline and **nothing** to the dollar
 * figure, and the unpriced share is reported (`views.js` → Totals). Guessing a
 * rate — a blended average, a nearest-tier fallback — produces a number that
 * looks as authoritative as a real one and cannot be audited. An unpriced
 * share the reader can see is a smaller error than a plausible wrong dollar.
 *
 * Add a model by adding a row to `data/model-prices.json`; no code changes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Rates live in `data/model-prices.json`, not here. Prices change on Anthropic's
 * schedule, not this repo's — keeping them as data means updating them is an
 * edit a non-contributor can make and review, with no risk of touching logic.
 * That file also documents the ids deliberately left unpriced and why.
 *
 * Loaded with readFileSync rather than a JSON `import ... with { type: 'json' }`:
 * import attributes are still unstable across the Node 20+ range this repo
 * supports, and a parse error at import time is easier to read than a loader one.
 * Path is module-relative so the installed skill bundle resolves it from
 * wherever Claude Code happens to be running.
 */
const DATA = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'model-prices.json'), 'utf8'));

/**
 * Per-million-token rates by base model id. `input` is the only field the waste
 * model uses; `output` rides along so the table stays a complete reference and a
 * future output-token rule (the unimplemented THINKING_BLOAT) has a source.
 *
 * `intro` is a promotional rate applying to sessions dated on or before `until`.
 * Sessions are priced by their own date, so an audit run after a promotion ends
 * still prices the historical window at the rate it actually paid.
 */
export const PRICES = DATA.models;

/**
 * Relative cost per input token — cache read 0.1×, prefix rewrite 1.25×. The
 * gap between them is what every cache-waste rule prices; `rules.js` re-exports
 * this as PRICE so the multipliers have one definition, not two.
 */
export const CACHE = DATA.cacheMultipliers;

/**
 * Model-id slots that are not models (`<synthetic>`: locally-generated messages,
 * no API call, zero tokens). Neither priced nor unpriced — counting them as
 * unpriced would put a spurious disclosure on every report, and counting them as
 * $0 turns would dilute the blended rate of any session that hit one.
 */
export const PSEUDO_MODELS = new Set(DATA.pseudoModels.ids);

/**
 * Session logs carry deployment ids, not the bare model id: a context-window
 * marker (`claude-opus-5[1m]`) or a dated snapshot (`claude-haiku-4-5-20251001`).
 * Both name the same priced model, so strip them before lookup.
 */
export function normalizeModel(modelId) {
  return String(modelId ?? '')
    .replace(/\[[^\]]*\]$/, '')     // context-window marker: claude-opus-5[1m]
    .replace(/-\d{8}$/, '');        // dated snapshot: claude-haiku-4-5-20251001
}

/** Per-token input rate in USD for one model on one date, or null if unpriced. */
export function inputRatePerToken(modelId, date) {
  const p = PRICES[normalizeModel(modelId)];
  if (!p) return null;
  const rate = p.intro && date && date <= p.intro.until ? p.intro.input : p.input;
  return rate / 1e6;
}

/**
 * Turn-weighted blended input rate for a session that mixed models.
 *
 * Turns are the weight because waste is a prefix cost: every turn re-sends the
 * accumulated prefix, so a model that served more turns carried more of it.
 * (Weighting by cacheRead would be closer still, but per-model cache splits are
 * a directory-wide aggregate, not per-session — turns is the finest weight the
 * artifacts actually carry.)
 *
 * Returns `{ rate, pricedShare, unpriced }`:
 *   rate        — USD per token, blended over the PRICED turns only, or null
 *   pricedShare — fraction of the session's turns that had a published rate
 *   unpriced    — the model ids that had none, for disclosure
 *
 * Blending over priced turns only (rather than treating unpriced turns as $0)
 * keeps the rate honest and pushes the omission into `pricedShare`, where it is
 * visible, instead of silently deflating the dollar figure.
 */
export function sessionRate(models = {}, date) {
  let pricedTurns = 0, totalTurns = 0, usd = 0;
  const unpriced = [];
  for (const [model, turns] of Object.entries(models)) {
    if (PSEUDO_MODELS.has(normalizeModel(model))) continue;  // no API call, no weight
    totalTurns += turns;
    const rate = inputRatePerToken(model, date);
    if (rate === null) { unpriced.push(normalizeModel(model)); continue; }
    pricedTurns += turns;
    usd += rate * turns;
  }
  return {
    rate: pricedTurns ? usd / pricedTurns : null,
    pricedShare: totalTurns ? pricedTurns / totalTurns : 0,
    unpriced,
  };
}

/**
 * `$1,234` / `$12.34` / `<$0.01` / `$0` — a fixed-width-friendly money column.
 * Sub-cent figures collapse to `<$0.01` rather than printing four decimals: the
 * extra digits widen every row to express an amount nobody will act on.
 */
export function usd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'n/a';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (abs >= 0.01) return `$${n.toFixed(2)}`;
  return `<$0.01`;
}
