#!/usr/bin/env node
/**
 * qa-browser — persistent, headed Playwright session driven one command at a time.
 *
 * Guarantees:
 *  - Browser is VISIBLE (headed by default; --headless to opt out).
 *  - Browser stays OPEN across steps/cases (daemon holds the session).
 *  - ONE browser instance per run; identities are contexts, not new browsers.
 *
 * Usage:
 *   node qa-browser.mjs serve [--headless] [--port 8787] [--base http://localhost:3000]
 *   node qa-browser.mjs <command> [args...] [--ctx <lane>]   # sent to the running daemon
 *
 * Lanes / parallelism:
 *   --ctx <lane> routes a command to a named context without touching the shared
 *   "active" pointer — safe for concurrent subagents (one lane per subagent).
 *   Each context has ITS OWN cookies/storage AND its own console-error and
 *   network buffers. Serial runs can ignore --ctx entirely (default context).
 *
 * Commands:
 *   goto <url>                        navigate (relative allowed if --base/QA_BASE_URL set)
 *   click <selector>
 *   fill <selector> <value>           value may be env:NAME → daemon substitutes secret,
 *                                     never echoed to output or transcript
 *   press <selector> <key>
 *   assert-visible <text|selector>
 *   assert-aria <selector> <attr> <value>
 *   assert-url <substring>
 *   console-errors                    errors since last check (ok if none)
 *   network [filter]                  recent requests (method, url, status)
 *   screenshot <path>
 *   eval <js>
 *   new-context <name> [state]        fresh identity; optional saved auth state to load
 *   use-context <name>
 *   save-state <name>                 persist cookies+localStorage → .qa-state/<name>.json
 *   route abort <urlPattern>          block matching requests (active context)
 *   route mock <urlPattern> <status> <body...>   fulfill with mock response
 *   route clear                       remove all routes on active context
 *   stop
 *
 * Every command prints one JSON line {"ok":true|false,...}, exit 0/1.
 * Any failed command auto-captures a screenshot to $QA_SHOT_DIR (default .qa-shots/)
 * and includes its path in the output.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const PORT = Number(process.env.QA_BROWSER_PORT || 8787);
const [, , cmd, ...args] = process.argv;

if (!cmd) {
  console.error("usage: qa-browser.mjs serve|<command> [args...]");
  process.exit(2);
}

/* ---------------------------------- client --------------------------------- */
if (cmd !== "serve") {
  // --ctx <name> anywhere in args routes the command to that context (lane)
  let ctx = null;
  const i = args.indexOf("--ctx");
  if (i !== -1) { ctx = args[i + 1]; args.splice(i, 2); }
  const body = JSON.stringify({ cmd, args, ctx });
  const req = http.request(
    { host: "127.0.0.1", port: PORT, path: "/cmd", method: "POST", headers: { "content-type": "application/json" } },
    (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log(data);
        try { process.exit(JSON.parse(data).ok ? 0 : 1); } catch { process.exit(1); }
      });
    }
  );
  req.on("error", () => {
    console.log(JSON.stringify({ ok: false, error: `daemon not running on :${PORT} — start with: node qa-browser.mjs serve` }));
    process.exit(1);
  });
  req.end(body);
} else {
  /* ---------------------------------- daemon --------------------------------- */
  const { values } = parseArgs({
    args,
    options: {
      headless: { type: "boolean", default: false },
      port: { type: "string", default: String(PORT) },
      base: { type: "string", default: process.env.QA_BASE_URL || "" },
      browser: { type: "string", default: "chromium" },
    },
  });

  const { chromium, firefox, webkit } = await import("playwright");
  const engine = { chromium, firefox, webkit }[values.browser] || chromium;

  const STATE_DIR = process.env.QA_STATE_DIR || ".qa-state";
  const SHOT_DIR = process.env.QA_SHOT_DIR || ".qa-shots";

  const browser = await engine.launch({ headless: values.headless }); // headed by default → visible
  const contexts = new Map();
  let active = "default";

  async function makeContext(name, stateName) {
    const opts = {};
    if (stateName) {
      const p = path.join(STATE_DIR, `${stateName}.json`);
      if (!fs.existsSync(p)) throw new Error(`no saved state "${stateName}" (${p})`);
      opts.storageState = p;
    }
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const entry = { ctx, page, consoleErrors: [], requests: [] };
    page.on("console", (m) => m.type() === "error" && entry.consoleErrors.push(m.text()));
    page.on("response", (r) =>
      entry.requests.push({ method: r.request().method(), url: r.url(), status: r.status() }) > 200 && entry.requests.shift()
    );
    contexts.set(name, entry);
    return entry;
  }

  let current = null; // context name for the command being handled (set per request)
  async function getActive() {
    const name = current || active;
    if (!contexts.has(name)) await makeContext(name);
    return contexts.get(name);
  }
  const getPage = async () => (await getActive()).page;

  function resolveUrl(u) {
    if (/^https?:\/\//.test(u)) return u;
    if (!values.base) throw new Error(`relative url "${u}" but no --base set`);
    return new URL(u, values.base).href;
  }

  // env:NAME → secret substituted daemon-side, never echoed back
  function expandEnv(v) {
    if (typeof v === "string" && v.startsWith("env:")) {
      const name = v.slice(4);
      if (!(name in process.env)) throw new Error(`env var ${name} not set on daemon`);
      return process.env[name];
    }
    return v;
  }

  const handlers = {
    async goto([url]) {
      const page = await getPage();
      const res = await page.goto(resolveUrl(url), { waitUntil: "domcontentloaded" });
      return { ok: true, url: page.url(), status: res?.status() ?? null };
    },
    async click([selector]) {
      const page = await getPage();
      await page.locator(selector).first().click({ timeout: 10_000 });
      return { ok: true, clicked: selector };
    },
    async fill([selector, ...rest]) {
      const page = await getPage();
      const raw = rest.join(" ");
      await page.locator(selector).first().fill(expandEnv(raw), { timeout: 10_000 });
      return { ok: true, filled: selector, value: raw.startsWith("env:") ? raw : "(literal)" };
    },
    async press([selector, key]) {
      const page = await getPage();
      await page.locator(selector).first().press(key, { timeout: 10_000 });
      return { ok: true, pressed: key };
    },
    async "assert-visible"([target]) {
      const page = await getPage();
      const loc = /[=\[\.#>]/.test(target) ? page.locator(target) : page.getByText(target);
      const visible = await loc.first().isVisible({ timeout: 10_000 }).catch(() => false);
      return { ok: visible, target, visible };
    },
    async "assert-aria"([selector, attr, expected]) {
      const page = await getPage();
      const actual = await page.locator(selector).first().getAttribute(`aria-${attr.replace(/^aria-/, "")}`);
      return { ok: actual === expected, selector, expected, actual };
    },
    async "assert-url"([substr]) {
      const page = await getPage();
      return { ok: page.url().includes(substr), url: page.url(), expected: substr };
    },
    async "console-errors"() {
      const { consoleErrors } = await getActive();
      const errs = consoleErrors.splice(0);
      return { ok: errs.length === 0, errors: errs };
    },
    async network([filter]) {
      const { requests } = await getActive();
      const list = filter ? requests.filter((r) => r.url.includes(filter)) : requests;
      return { ok: true, requests: list.slice(-30) };
    },
    async screenshot([p]) {
      const page = await getPage();
      fs.mkdirSync(path.dirname(p) || ".", { recursive: true });
      await page.screenshot({ path: p, fullPage: true });
      return { ok: true, path: p };
    },
    async eval(a) {
      const page = await getPage();
      const result = await page.evaluate(a.join(" "));
      return { ok: true, result };
    },
    async "new-context"([name = "default", stateName]) {
      contexts.delete(name);
      await makeContext(name, stateName);
      active = name;
      return { ok: true, context: name, state: stateName ?? null };
    },
    async "use-context"([name]) {
      if (!contexts.has(name)) return { ok: false, error: `no context "${name}"` };
      active = name;
      return { ok: true, context: name };
    },
    async "save-state"([name]) {
      if (!name) return { ok: false, error: "save-state <name>" };
      const { ctx } = await getActive();
      fs.mkdirSync(STATE_DIR, { recursive: true });
      const p = path.join(STATE_DIR, `${name}.json`);
      await ctx.storageState({ path: p });
      return { ok: true, saved: p };
    },
    async route([action, pattern, status, ...body]) {
      const { ctx } = await getActive();
      if (action === "clear") {
        await ctx.unrouteAll({ behavior: "ignoreErrors" });
        return { ok: true, routes: "cleared" };
      }
      if (action === "abort") {
        await ctx.route(`**${pattern}**`, (r) => r.abort());
        return { ok: true, aborting: pattern };
      }
      if (action === "mock") {
        const payload = body.join(" ");
        await ctx.route(`**${pattern}**`, (r) =>
          r.fulfill({ status: Number(status) || 200, contentType: "application/json", body: payload })
        );
        return { ok: true, mocking: pattern, status: Number(status) || 200 };
      }
      return { ok: false, error: `route abort|mock|clear` };
    },
    async stop() {
      setTimeout(async () => { await browser.close(); process.exit(0); }, 100);
      return { ok: true, stopped: true };
    },
  };

  const NO_AUTOSHOT = new Set(["screenshot", "console-errors", "stop"]);

  http
    .createServer(async (req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let out, cmdName;
        try {
          const { cmd, args, ctx } = JSON.parse(body);
          cmdName = cmd;
          current = ctx || null; // lane routing: --ctx wins over the serial `active` pointer
          const h = handlers[cmd];
          out = h ? await h(args || []) : { ok: false, error: `unknown command "${cmd}"` };
        } catch (e) {
          out = { ok: false, error: e.message };
        }
        // auto-screenshot on any failure, so evidence exists without an extra call
        const shotCtx = current || active;
        if (out && out.ok === false && !NO_AUTOSHOT.has(cmdName) && contexts.has(shotCtx)) {
          try {
            fs.mkdirSync(SHOT_DIR, { recursive: true });
            const p = path.join(SHOT_DIR, `fail-${Date.now()}-${cmdName}-${shotCtx}.png`);
            await contexts.get(shotCtx).page.screenshot({ path: p, fullPage: true });
            out.screenshot = p;
          } catch { /* page may be gone; ignore */ }
        }
        current = null;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(out));
      });
    })
    .listen(Number(values.port), "127.0.0.1", () =>
      console.log(JSON.stringify({ ok: true, serving: Number(values.port), headed: !values.headless, base: values.base || null }))
    );
}
