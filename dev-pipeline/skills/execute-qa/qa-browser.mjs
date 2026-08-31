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
 *   node qa-browser.mjs <command> [args...] [--ctx <lane>] [--port 8787]
 *
 * Lanes / parallelism:
 *   Contexts are created ONLY by `new-context <name>` — never implicitly. A lane's
 *   first command is always `new-context <lane>`. After that, `--ctx <lane>` routes
 *   a command to that EXISTING context without touching the serial "active" pointer;
 *   an unknown --ctx name fails loudly. Each context has ITS OWN cookies/storage AND
 *   its own console-error and network buffers. Serial runs can ignore --ctx entirely
 *   (commands auto-create and reuse the "default" context, as before).
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
 *   new-context <name> [state]        fresh identity; optional saved auth state to load;
 *                                     REPLACES (and closes) any same-name context
 *   use-context <name>
 *   save-state <name>                 persist cookies+localStorage → .qa-state/<name>.json
 *   route abort <urlPattern>          block matching requests (active context)
 *   route mock <urlPattern> <status> <body...>   fulfill with mock response
 *   route clear                       remove all routes on active context
 *   status                            daemon liveness: contexts, urls, pid, port, browser
 *   stop                              final command — daemon rejects later commands
 *
 * Every command prints one JSON line {"ok":true|false,...}, exit 0/1.
 * Every command runs under a timeout guard (QA_CMD_TIMEOUT_MS, default 30000) — a
 * stuck command fails with a diagnostic instead of hanging the daemon.
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
  // --port <n> anywhere in args overrides QA_BROWSER_PORT / 8787
  let port = PORT;
  const pi = args.indexOf("--port");
  if (pi !== -1) { port = Number(args[pi + 1]); args.splice(pi, 2); }
  const body = JSON.stringify({ cmd, args, ctx, cwd: process.cwd() });
  const req = http.request(
    { host: "127.0.0.1", port, path: "/cmd", method: "POST", headers: { "content-type": "application/json" } },
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
    console.log(JSON.stringify({ ok: false, error: `daemon not running on :${port} — start with: node qa-browser.mjs serve --port ${port}` }));
    process.exit(1);
  });
  req.end(body);
} else {
  /* ---------------------------------- daemon --------------------------------- */
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: {
        headless: { type: "boolean", default: false },
        port: { type: "string", default: String(PORT) },
        base: { type: "string", default: process.env.QA_BASE_URL || "" },
        browser: { type: "string", default: "chromium" },
      },
    }));
  } catch (e) {
    console.error(`qa-browser serve: ${e.message}`);
    console.error("usage: qa-browser.mjs serve [--headless] [--port 8787] [--base <url>] [--browser chromium|firefox|webkit]");
    process.exit(2);
  }

  const { chromium, firefox, webkit } = await import("playwright");
  const engine = { chromium, firefox, webkit }[values.browser] || chromium;

  const STATE_DIR = process.env.QA_STATE_DIR || ".qa-state";
  const SHOT_DIR = process.env.QA_SHOT_DIR || ".qa-shots";
  const NET_BUF = Number(process.env.QA_NET_BUF || 200);
  const CMD_TIMEOUT_MS = Number(process.env.QA_CMD_TIMEOUT_MS || 30000);

  const browser = await engine.launch({ headless: values.headless }); // headed by default → visible
  const contexts = new Map();
  let active = "default";
  let browserDead = false;
  let stopping = false;
  browser.on("disconnected", () => { browserDead = true; });

  // Never leave an orphaned browser when the daemon is killed.
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
      try { await browser.close(); } catch { /* already gone */ }
      process.exit(0);
    });
  }

  function withTimeout(p, cmdName) {
    return Promise.race([
      p,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`${cmdName} timed out after ${CMD_TIMEOUT_MS}ms`)), CMD_TIMEOUT_MS)
      ),
    ]);
  }

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
    page.on("pageerror", (e) => entry.consoleErrors.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
      entry.requests.push({ method: r.request().method(), url: r.url(), status: r.status() });
      if (entry.requests.length > NET_BUF) entry.requests.shift();
    });
    contexts.set(name, entry);
    return entry;
  }

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

  // Handlers receive the request's resolved context entry (null for commands
  // that need no page: status, stop, new-context).
  const handlers = {
    async goto([url], entry) {
      const res = await entry.page.goto(resolveUrl(url), { waitUntil: "domcontentloaded" });
      return { ok: true, url: entry.page.url(), status: res?.status() ?? null };
    },
    async click([selector], entry) {
      await entry.page.locator(selector).first().click({ timeout: 10_000 });
      return { ok: true, clicked: selector };
    },
    async fill([selector, ...rest], entry) {
      const raw = rest.join(" ");
      await entry.page.locator(selector).first().fill(expandEnv(raw), { timeout: 10_000 });
      return { ok: true, filled: selector, value: raw.startsWith("env:") ? raw : "(literal)" };
    },
    async press([selector, key], entry) {
      await entry.page.locator(selector).first().press(key, { timeout: 10_000 });
      return { ok: true, pressed: key };
    },
    async "assert-visible"([target], entry) {
      const loc = /[=\[\.#>]/.test(target) ? entry.page.locator(target) : entry.page.getByText(target);
      const visible = await loc.first().isVisible({ timeout: 10_000 }).catch(() => false);
      return { ok: visible, target, visible };
    },
    async "assert-aria"([selector, attr, expected], entry) {
      const actual = await entry.page.locator(selector).first().getAttribute(`aria-${attr.replace(/^aria-/, "")}`);
      return { ok: actual === expected, selector, expected, actual };
    },
    async "assert-url"([substr], entry) {
      return { ok: entry.page.url().includes(substr), url: entry.page.url(), expected: substr };
    },
    async "console-errors"(_args, entry) {
      const errs = entry.consoleErrors.splice(0);
      return { ok: errs.length === 0, errors: errs };
    },
    async network([filter], entry) {
      const list = filter ? entry.requests.filter((r) => r.url.includes(filter)) : entry.requests;
      return { ok: true, requests: list.slice(-30) };
    },
    async screenshot([p], entry) {
      fs.mkdirSync(path.dirname(p) || ".", { recursive: true });
      await entry.page.screenshot({ path: p, fullPage: true });
      return { ok: true, path: p };
    },
    async eval(a, entry) {
      const result = await entry.page.evaluate(a.join(" "));
      return { ok: true, result };
    },
    async "new-context"([name = "default", stateName]) {
      const old = contexts.get(name);
      if (old) {
        try { await old.ctx.close(); } catch { /* already closed */ }
        contexts.delete(name);
      }
      await makeContext(name, stateName);
      active = name;
      return { ok: true, context: name, state: stateName ?? null };
    },
    async "use-context"([name]) {
      if (!contexts.has(name)) return { ok: false, error: `no context "${name}"` };
      active = name;
      return { ok: true, context: name };
    },
    async "save-state"([name], entry) {
      if (!name) return { ok: false, error: "save-state <name>" };
      fs.mkdirSync(STATE_DIR, { recursive: true });
      const p = path.join(STATE_DIR, `${name}.json`);
      await entry.ctx.storageState({ path: p });
      return { ok: true, saved: p };
    },
    async route([action, pattern, status, ...body], entry) {
      if (action === "clear") {
        await entry.ctx.unrouteAll({ behavior: "ignoreErrors" });
        return { ok: true, routes: "cleared" };
      }
      if (action === "abort") {
        await entry.ctx.route(`**${pattern}**`, (r) => r.abort());
        return { ok: true, aborting: pattern };
      }
      if (action === "mock") {
        const payload = body.join(" ");
        await entry.ctx.route(`**${pattern}**`, (r) =>
          r.fulfill({ status: Number(status) || 200, contentType: "application/json", body: payload })
        );
        return { ok: true, mocking: pattern, status: Number(status) || 200 };
      }
      return { ok: false, error: `route abort|mock|clear` };
    },
    async status() {
      return {
        ok: true,
        up: !browserDead && !stopping,
        pid: process.pid,
        headed: !values.headless,
        base: values.base || null,
        port: Number(values.port),
        browser: browser.isConnected(),
        contexts: [...contexts.keys()].map((n) => {
          let url = null;
          try { url = contexts.get(n).page.url(); } catch { /* context closed */ }
          return { name: n, url };
        }),
      };
    },
    async stop() {
      stopping = true;
      setTimeout(async () => {
        try { await browser.close(); } catch { /* already gone */ }
        process.exit(0);
      }, 100);
      return { ok: true, stopped: true };
    },
  };

  const NO_AUTOSHOT = new Set(["screenshot", "console-errors", "stop", "status"]);
  const NO_CONTEXT = new Set(["status", "stop", "new-context"]);

  http
    .createServer(async (req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let out, cmdName, entry = null;
        try {
          const parsed = JSON.parse(body);
          cmdName = parsed.cmd;
          const cmdArgs = parsed.args || [];
          const ctxName = parsed.ctx || null;

          if (browserDead && cmdName !== "status") {
            out = { ok: false, error: "browser process gone — restart the daemon" };
          } else if (stopping && cmdName !== "stop") {
            out = { ok: false, error: "daemon stopping" };
          } else if (!handlers[cmdName]) {
            out = { ok: false, error: `unknown command "${cmdName}"` };
          } else if (!NO_CONTEXT.has(cmdName)) {
            // Resolve the request's context: --ctx names an EXISTING context
            // (loud error otherwise); no --ctx uses the serial active pointer,
            // auto-creating "default" on first use (legacy path).
            if (ctxName) {
              if (!contexts.has(ctxName)) {
                out = { ok: false, error: `no context "${ctxName}" — create it first with: new-context ${ctxName}` };
              } else {
                entry = contexts.get(ctxName);
              }
            } else {
              if (!contexts.has(active)) await makeContext(active);
              entry = contexts.get(active);
            }
            if (!out) out = await withTimeout(handlers[cmdName](cmdArgs, entry), cmdName);
          } else {
            out = await withTimeout(handlers[cmdName](cmdArgs, null), cmdName);
          }
        } catch (e) {
          out = { ok: false, error: e.message };
          if (/timed out after \d+ms$/.test(e.message)) out.timedOut = true;
        }
        // auto-screenshot on any failure, so evidence exists without an extra call.
        // Skipped for timeouts: the page is stuck in whatever timed out, so the
        // screenshot would either block or show nothing useful.
        if (out && out.ok === false && !out.timedOut && !NO_AUTOSHOT.has(cmdName) && entry && !browserDead) {
          try {
            fs.mkdirSync(SHOT_DIR, { recursive: true });
            const p = path.join(SHOT_DIR, `fail-${Date.now()}-${cmdName}.png`);
            // short guard: the page may be stuck in the navigation that just timed out
            await Promise.race([
              entry.page.screenshot({ path: p, fullPage: true }),
              new Promise((_, rej) => setTimeout(() => rej(new Error("auto-shot timeout")), 5_000)),
            ]);
            out.screenshot = p;
          } catch { /* page may be gone; ignore */ }
        }
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(out));
      });
    })
    .listen(Number(values.port), "127.0.0.1", () =>
      console.log(JSON.stringify({ ok: true, serving: Number(values.port), headed: !values.headless, base: values.base || null }))
    );
}
