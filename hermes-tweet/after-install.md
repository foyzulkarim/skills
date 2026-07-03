# Hermes Tweet Installed

Hermes Tweet is enabled as the `hermes-tweet` toolset.

If this plugin was installed without `--enable`, Hermes may show it as
`not enabled` until you run:

```bash
hermes plugins enable hermes-tweet
hermes plugins list
```

Set your Xquik API key before using read tools:

```bash
export XQUIK_API_KEY="xq_..."
```

For persistent Hermes sessions, add it to `~/.hermes/.env`:

```bash
XQUIK_API_KEY=xq_...
```

If Hermes is already running after you edit `~/.hermes/.env`, use `/reload` in
an interactive CLI session, or restart gateway and cron sessions before calling
`tweet_read`.
When `XQUIK_API_KEY` is missing, Hermes should expose only `tweet_explore` from
this plugin. Set the key, then reload the CLI or restart the gateway or cron
process before expecting `tweet_read`.

Keep actions disabled unless you are intentionally allowing account-changing
operations:

```bash
export HERMES_TWEET_ENABLE_ACTIONS=false
```

Quick smoke test:

```bash
hermes -z "Use tweet_explore, then read /api/v1/account. Do not call tweet_action." --toolsets hermes-tweet
```

Use catalog-listed `/api/v1/...` paths from `tweet_explore`. Copied endpoint
URLs are accepted only when they resolve to catalog-listed paths.

Expected behavior:

- `tweet_explore` loads without an API call.
- `tweet_read` works when `XQUIK_API_KEY` is set.
- `/xstatus` and `/xtrends` are registered slash commands.
- `tweet_action` stays hidden or returns a disabled error unless
  `HERMES_TWEET_ENABLE_ACTIONS=true`.

For Hermes v0.12.0, do not use `hermes -z "/xstatus"` as a slash-command smoke
test. One-shot `-z` treats that text as a model prompt. Verify slash commands in
an active CLI or gateway session, or through the plugin registry tests.
