#!/usr/bin/env node

// Stop hook — fired exactly once per turn completion. The Stop payload carries
// no cost data (that lives only in the statusline payload), so this script's
// job is boundaries, not dollars:
//   1. Stamp the turn-end time for the statusline idle timer.
//   2. Append a turn-boundary record so analytics can bucket the cost samples
//      written by cost-logger.js (via the statusline) into real turns, and
//      follow transcript_path into the session transcript to investigate an
//      abnormal turn's token usage.

const fs   = require('fs');
const path = require('path');
const os   = require('os');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(input); } catch (e) { return; }
  const SESSION_ID = data.session_id ?? '';
  if (!SESSION_ID) return;

  const NOW                = Math.floor(Date.now() / 1000);
  const LAST_ACTIVITY_FILE = path.join(os.tmpdir(), `statusline-lastactivity-${SESSION_ID}`);
  fs.writeFileSync(LAST_ACTIVITY_FILE, `${NOW}`);

  const CWD = data.cwd ?? '';
  if (!CWD) return;
  // Same slug rule as Claude Code's project dirs: slashes AND dots → dashes.
  const BOUNDARY_DIR = path.join(os.homedir(), '.claude', 'projects', CWD.replace(/[/.]/g, '-'));
  const BOUNDARY_LOG = path.join(BOUNDARY_DIR, `${SESSION_ID}.turn-boundaries.jsonl`);
  const ENTRY = JSON.stringify({
    session_id:      SESSION_ID,
    turn_end:        new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    turn_end_epoch:  NOW,
    transcript_path: data.transcript_path ?? '',
  });
  fs.mkdirSync(BOUNDARY_DIR, { recursive: true });
  fs.appendFileSync(BOUNDARY_LOG, ENTRY + '\n');
});
