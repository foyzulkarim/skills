#!/usr/bin/env node
/**
 * qa-browser — persistent, headed Playwright session driven one command at a time.
 *
 * THREAT MODEL: the daemon binds 127.0.0.1 only and rejects browser-borne
 * requests (any Origin/Referer header, non-loopback Host, or non-JSON
 * content-type is refused) — never expose it beyond loopback. Any local
 * process can still drive the browser; that is fine on a dev box, surprising
 * in a container/CI with untrusted workloads.
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
 * Startup banner: on listen, the daemon prints exactly ONE JSON line to stdout
 *   {"ok":true,"serving":<port>,...} — consumers parsing stdout must skip it.
 *
 * Target syntax (REQUIRED everywhere a target is taken — no guessing):
 *   text=Save        visible text        css=.error        CSS selector
 *   role=button      ARIA role           (unprefixed targets are rejected with usage)
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
 *   goto <url> [--until load|domcontentloaded|networkidle]   navigate (default: networkidle)
 *   wait-for <target>                 wait until target is visible
 *   wait-for --until <load-state>     wait for a load state (e.g. networkidle)
 *   click <target>
 *   fill <target> <value>             clears first; value may be env:NAME → daemon
 *                                     substitutes the secret, never echoed
 *   type <target> <text>              per-character typing (no clear-first); types at
 *                                     the focused cursor — click first to position it
 *   press <target> <key>
 *   assert-visible <target>
 *   assert-aria <target> <attr> <value>
 *   assert-url <substring>
 *   expect-text <target> <expected>   textContent contains expected (expected/actual on fail)
 *   get-attr <target> <attr>          read an attribute value
 *   count <target>                    number of matches (disambiguation)
 *   expect-request <method> <urlPattern> [status]   assert a request was captured
 *   console-errors                    console errors + pageerror: exceptions since last check
 *   network [filter]                  recent requests (method, url, status), with count
 *   route abort <urlPattern>          block matching requests
 *   route mock <urlPattern> <status> <body...>   fulfill with mock JSON response
 *   route list                        show active mocks/aborts on this context
 *   route clear                       remove all routes
 *   screenshot <path>                 relative paths resolve against the CALLER's cwd;
 *                                     the returned path is always absolute
 *   eval <js>                         LAST RESORT — prefer the commands above. Args are
 *                                     joined with single spaces: internal whitespace and
 *                                     newlines collapse, so pass simple one-liners only.
 *   new-context <name> [state]        fresh identity; optional saved auth state to load;
 *                                     REPLACES (and closes) any same-name context
 *   use-context <name>
 *   save-state <name>                 persist cookies+localStorage → .qa-state/<name>.json
 *   status                            daemon liveness: contexts, urls, pid, port, browser
 *   stop                              final command — daemon rejects later commands
 *
 * Environment variables:
 *   QA_BASE_URL        default base for relative goto (same as --base)
 *   QA_BROWSER_PORT    daemon port (default 8787; --port overrides on both sides)
 *   QA_STATE_DIR       saved auth states (default .qa-state)
 *   QA_SHOT_DIR        failure auto-screenshots (default .qa-shots; relative → caller cwd)
 *   QA_CMD_TIMEOUT_MS  per-command timeout guard (default 30000)
 *   QA_NET_BUF         per-context network ring buffer size (default 200)
 *   env:NAME           in fill/type values: resolved daemon-side, never echoed back
 *
 * Response envelope: every command prints ONE JSON line and exits 0/1:
 *   {"ok":bool, "cmd":<name>, "elapsedMs":<n>, ...payload}
 * Listing commands include "count". Any failed command (except timeouts — the page is
 * stuck then) auto-captures a screenshot and includes its absolute path.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";

const PORT = Number(process.env.QA_BROWSER_PORT || 8787);
const MAX_BODY = 1_000_000;
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
      // A daemon death mid-command must never look like success: without these
      // handlers a cut connection prints nothing and exits 0.
      const lostDaemon = () => {
        console.log(JSON.stringify({ ok: false, error: "daemon closed connection mid-command" }));
        process.exit(1);
      };
      res.on("error", lostDaemon);
      res.on("close", () => { if (!res.complete) lostDaemon(); });
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log(data);
        try { process.exit(JSON.parse(data).ok ? 0 : 1); } catch { process.exit(1); }
      });
    }
  );
  req.on("error", () => {
    console.log(JSON.stringify({ ok: false, error: `daemon not running or connection lost on :${port} — start with: node qa-browser.mjs serve --port ${port}` }));
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

  let pw;
  try {
    pw = await import("playwright");
  } catch {
    console.error(JSON.stringify({
      ok: false,
      error: "playwright not found — copy this script into the target project, then: npm i -D playwright && npx playwright install chromium",
    }));
    process.exit(1);
  }
  const { chromium, firefox, webkit } = pw;
  const engine = { chromium, firefox, webkit }[values.browser] || chromium;

  const STATE_DIR = process.env.QA_STATE_DIR || ".qa-state";
  const SHOT_DIR = process.env.QA_SHOT_DIR || ".qa-shots";
  const NET_BUF = Number(process.env.QA_NET_BUF || 200);
  const CMD_TIMEOUT_MS = Number(process.env.QA_CMD_TIMEOUT_MS || 30000);
  const LOAD_STATES = ["load", "domcontentloaded", "networkidle"];

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
    const entry = { ctx, page, consoleErrors: [], requests: [], routes: [] };
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

  // Mandatory explicit prefixes — no heuristic guessing between text and selectors.
  function resolveTarget(page, target) {
    if (!target) throw new Error("missing target — use text= / css= / role=");
    if (target.startsWith("text=")) return page.getByText(target.slice(5));
    if (target.startsWith("css=")) return page.locator(target.slice(4));
    if (target.startsWith("role=")) return page.getByRole(target.slice(5));
    throw new Error(`unprefixed target "${target}" — use text= / css= / role= (e.g. css=.error, text=Save, role=button)`);
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

  // What a fill/type response may reveal about the value: env refs echo the
  // reference; literals echo length + short fingerprint — never the value.
  function valueEcho(raw) {
    if (raw.startsWith("env:")) return raw;
    return { length: raw.length, sha256: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 8) };
  }

  // Handlers receive the request's resolved context entry (null for commands
  // that need no page: status, stop, new-context) and the caller's cwd.
  const handlers = {
    async goto(a, entry) {
      let until = "networkidle";
      const ui = a.indexOf("--until");
      if (ui !== -1) { until = a[ui + 1]; a.splice(ui, 2); }
      if (!LOAD_STATES.includes(until)) return { ok: false, error: `--until must be ${LOAD_STATES.join("|")}` };
      const res = await entry.page.goto(resolveUrl(a[0]), { waitUntil: until });
      return { ok: true, url: entry.page.url(), status: res?.status() ?? null };
    },
    async "wait-for"(a, entry) {
      const ui = a.indexOf("--until");
      if (ui !== -1) {
        const state = a[ui + 1];
        if (!LOAD_STATES.includes(state)) return { ok: false, error: `--until must be ${LOAD_STATES.join("|")}` };
        await entry.page.waitForLoadState(state, { timeout: 10_000 });
        return { ok: true, waited: state };
      }
      await resolveTarget(entry.page, a[0]).first().waitFor({ state: "visible", timeout: 10_000 });
      return { ok: true, visible: a[0] };
    },
    async click([target], entry) {
      await resolveTarget(entry.page, target).first().click({ timeout: 10_000 });
      return { ok: true, clicked: target };
    },
    async fill([target, ...rest], entry) {
      const raw = rest.join(" ");
      await resolveTarget(entry.page, target).first().fill(expandEnv(raw), { timeout: 10_000 });
      return { ok: true, filled: target, value: valueEcho(raw) };
    },
    async type([target, ...rest], entry) {
      const raw = rest.join(" ");
      await resolveTarget(entry.page, target).first().pressSequentially(expandEnv(raw), { timeout: 10_000 });
      return { ok: true, typed: target, value: valueEcho(raw) };
    },
    async press([target, key], entry) {
      await resolveTarget(entry.page, target).first().press(key, { timeout: 10_000 });
      return { ok: true, pressed: key };
    },
    async "assert-visible"([target], entry) {
      // Wait up to 10s for visibility, then assert — isVisible() alone returns
      // immediately (its timeout option is ignored) and false-fails async UI.
      try {
        await resolveTarget(entry.page, target).first().waitFor({ state: "visible", timeout: 10_000 });
        return { ok: true, target, visible: true };
      } catch {
        return { ok: false, target, visible: false };
      }
    },
    async "assert-aria"([target, attr, expected], entry) {
      const actual = await resolveTarget(entry.page, target).first().getAttribute(`aria-${attr.replace(/^aria-/, "")}`);
      return { ok: actual === expected, target, expected, actual };
    },
    async "assert-url"([substr], entry) {
      return { ok: entry.page.url().includes(substr), url: entry.page.url(), expected: substr };
    },
    async "expect-text"([target, ...rest], entry) {
      const expected = rest.join(" ");
      const actual = ((await resolveTarget(entry.page, target).first().textContent({ timeout: 10_000 })) || "").trim();
      return { ok: actual.includes(expected), expected, actual: actual.slice(0, 200) };
    },
    async "get-attr"([target, attr], entry) {
      const value = await resolveTarget(entry.page, target).first().getAttribute(attr, { timeout: 10_000 });
      return { ok: true, target, attr, value };
    },
    async count([target], entry) {
      return { ok: true, target, count: await resolveTarget(entry.page, target).count() };
    },
    async "expect-request"([method, pattern, status], entry) {
      const m = (method || "").toUpperCase();
      const hit = entry.requests.find(
        (r) => r.method === m && r.url.includes(pattern || "") && (!status || r.status === Number(status))
      );
      if (hit) return { ok: true, request: hit };
      return { ok: false, error: `no ${m} ${pattern}${status ? ` → ${status}` : ""} captured`, recent: entry.requests.slice(-10) };
    },
    async "console-errors"(_args, entry) {
      const errs = entry.consoleErrors.splice(0);
      return { ok: errs.length === 0, errors: errs, count: errs.length };
    },
    async network([filter], entry) {
      const list = filter ? entry.requests.filter((r) => r.url.includes(filter)) : entry.requests;
      return { ok: true, requests: list.slice(-30), count: list.length };
    },
    async screenshot([p], entry, callerCwd) {
      const abs = path.resolve(callerCwd || ".", p);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      await entry.page.screenshot({ path: abs, fullPage: true });
      return { ok: true, path: abs };
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
    async "save-state"([name], entry, callerCwd) {
      if (!name) return { ok: false, error: "save-state <name>" };
      const dir = path.isAbsolute(STATE_DIR) ? STATE_DIR : path.resolve(callerCwd || ".", STATE_DIR);
      fs.mkdirSync(dir, { recursive: true });
      const p = path.join(dir, `${name}.json`);
      await entry.ctx.storageState({ path: p });
      return { ok: true, saved: p };
    },
    async route([action, pattern, status, ...body], entry) {
      if (action === "clear") {
        await entry.ctx.unrouteAll({ behavior: "ignoreErrors" });
        entry.routes = [];
        return { ok: true, routes: "cleared" };
      }
      if (action === "list") {
        return { ok: true, routes: entry.routes, count: entry.routes.length };
      }
      if (action === "abort") {
        await entry.ctx.route(`**${pattern}**`, (r) => r.abort());
        entry.routes.push({ action: "abort", pattern });
        return { ok: true, aborting: pattern };
      }
      if (action === "mock") {
        const payload = body.join(" ");
        await entry.ctx.route(`**${pattern}**`, (r) =>
          r.fulfill({ status: Number(status) || 200, contentType: "application/json", body: payload })
        );
        entry.routes.push({ action: "mock", pattern, status: Number(status) || 200 });
        return { ok: true, mocking: pattern, status: Number(status) || 200 };
      }
      return { ok: false, error: `route abort|mock|clear|list` };
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
      let tooBig = false;
      req.on("data", (c) => {
        body += c;
        if (body.length > MAX_BODY && !tooBig) {
          tooBig = true;
          res.setHeader("content-type", "application/json");
          res.statusCode = 413;
          res.end(JSON.stringify({ ok: false, error: `request body too large (>${MAX_BODY} bytes)` }));
          req.destroy();
        }
      });
      req.on("end", async () => {
        if (tooBig) return;
        const started = Date.now();
        let out, cmdName, entry = null, callerCwd = null;
        // Loopback contract: the bundled Node client sends no Origin/Referer, a
        // loopback Host, and content-type application/json. Anything else is a
        // browser-borne cross-origin probe (no-cors text/plain POST from a page
        // — loopback is mixed-content-exempt) or DNS rebinding — reject before
        // parsing. Local processes remain allowed; that risk is documented.
        const host = String(req.headers.host || "").toLowerCase();
        const hostOk =
          host === `127.0.0.1:${values.port}` ||
          host === `localhost:${values.port}` ||
          host === `[::1]:${values.port}`;
        if (req.headers.origin || req.headers.referer || !hostOk || req.headers["content-type"] !== "application/json") {
          res.statusCode = 403;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "rejected: daemon accepts only its local client (loopback Host, no Origin/Referer, content-type application/json)" }));
          return;
        }
        try {
          const parsed = JSON.parse(body);
          cmdName = parsed.cmd;
          callerCwd = parsed.cwd;
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
              // Capture the name BEFORE the await: a concurrent new-context /
              // use-context could otherwise rebind `active` mid-resolution and
              // route this serial command onto a lane's context.
              const name = active;
              if (!contexts.has(name)) await makeContext(name);
              entry = contexts.get(name);
            }
            if (!out) out = await withTimeout(handlers[cmdName](cmdArgs, entry, callerCwd), cmdName);
          } else {
            out = await withTimeout(handlers[cmdName](cmdArgs, null, callerCwd), cmdName);
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
            const dir = path.isAbsolute(SHOT_DIR) ? SHOT_DIR : path.resolve(callerCwd || ".", SHOT_DIR);
            fs.mkdirSync(dir, { recursive: true });
            const p = path.join(dir, `fail-${Date.now()}-${cmdName}.png`);
            // short guard: the page may be stuck in the navigation that just failed
            await Promise.race([
              entry.page.screenshot({ path: p, fullPage: true }),
              new Promise((_, rej) => setTimeout(() => rej(new Error("auto-shot timeout")), 5_000)),
            ]);
            out.screenshot = p;
          } catch { /* page may be gone; ignore */ }
        }
        if (out && cmdName) {
          out.cmd = cmdName;
          out.elapsedMs = Date.now() - started;
        }
        res.setHeader("content-type", "application/json");
        // eval can return unserializable values (BigInt, circular) — a throw
        // here, inside an async listener, would kill the daemon and all lanes.
        let payload;
        try {
          payload = JSON.stringify(out);
        } catch {
          payload = JSON.stringify({ ok: false, cmd: cmdName ?? null, error: "response not serializable (eval result?)" });
        }
        res.end(payload);
      });
    })
    .listen(Number(values.port), "127.0.0.1", () =>
      console.log(JSON.stringify({ ok: true, serving: Number(values.port), headed: !values.headless, base: values.base || null }))
    );
}
