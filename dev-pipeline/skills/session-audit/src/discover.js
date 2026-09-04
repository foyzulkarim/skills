import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const DEFAULT_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const ACTIVE_SESSION_MS = 5 * 60 * 1000; // invariant 5: exclude the live session

/**
 * Find main-session transcripts under a projects dir, newest first.
 * Subagent transcripts live in <project>/<session-id>/subagents/ and are
 * intentionally not returned as sessions; their presence is surfaced as
 * hasSubagents on the parent session.
 */
export function discoverSessions({
  projectsDir = DEFAULT_PROJECTS_DIR,
  maxSessions = Infinity,
  excludeActiveMs = ACTIVE_SESSION_MS,
} = {}) {
  const sessions = [];
  const excludedActive = [];
  if (!existsSync(projectsDir)) return { sessions, excludedActive };
  const now = Date.now();
  for (const project of readdirSync(projectsDir)) {
    const projectDir = join(projectsDir, project);
    let names;
    try { names = readdirSync(projectDir); } catch { continue; }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue;
      const path = join(projectDir, name);
      let mtime;
      try { mtime = statSync(path).mtimeMs; } catch { continue; }
      const sessionId = name.replace(/\.jsonl$/, '');
      if (now - mtime < excludeActiveMs) {
        excludedActive.push(sessionId);
        continue;
      }
      sessions.push({
        path,
        mtime,
        project,
        sessionId,
        hasSubagents: existsSync(join(projectDir, sessionId, 'subagents')),
      });
    }
  }
  sessions.sort((a, b) => b.mtime - a.mtime);
  return { sessions: sessions.slice(0, maxSessions), excludedActive };
}

/** Locate one session file by id across all projects (for fetch). */
export function findSession(sessionId, projectsDir = DEFAULT_PROJECTS_DIR) {
  if (!existsSync(projectsDir)) return null;
  for (const project of readdirSync(projectsDir)) {
    const path = join(projectsDir, project, `${sessionId}.jsonl`);
    if (existsSync(path)) return { path, project, sessionId };
  }
  return null;
}
