import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

export const DATA_DIR = process.env.DESIGN_AGENT_HOME || join(homedir(), ".design-agent");
export const PROJECTS_DIR = join(DATA_DIR, "projects");

export type ProjectStatus = "running" | "waiting" | "done" | "error" | "stopped";

export interface Project {
  id: string;
  idea: string;
  ref?: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  sessionId?: string;
  costUsd: number;
  lastSummary?: string;
}

/** Normalized event shown in the app's activity feed (also persisted to events.jsonl). */
export type StudioEvent =
  | { kind: "user"; text: string; at: string }
  | { kind: "text"; text: string; at: string }
  | { kind: "tool"; id: string; name: string; summary: string; at: string }
  | { kind: "tool_result"; id: string; ok: boolean; summary: string; at: string }
  | { kind: "image"; file: string; tool: string; at: string }
  | { kind: "permission"; requestId: string; tool: string; summary: string; at: string }
  | { kind: "permission_done"; requestId: string; allowed: boolean; at: string }
  | { kind: "status"; status: ProjectStatus; note?: string; at: string }
  | { kind: "error"; text: string; at: string };

export const projectDir = (id: string) => {
  if (!/^[a-z0-9-]{8,64}$/.test(id)) throw new Error("bad project id");
  return join(PROJECTS_DIR, id);
};

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "design";
}

export function createProject(idea: string, ref?: string): Project {
  const id = `${slugify(idea).slice(0, 28)}-${randomUUID().slice(0, 8)}`;
  const dir = projectDir(id);
  mkdirSync(join(dir, "previews"), { recursive: true });
  mkdirSync(join(dir, "output"), { recursive: true });
  const now = new Date().toISOString();
  const p: Project = { id, idea, ref, createdAt: now, updatedAt: now, status: "running", costUsd: 0 };
  saveProject(p);
  return p;
}

export function saveProject(p: Project): void {
  p.updatedAt = new Date().toISOString();
  writeFileSync(join(projectDir(p.id), "project.json"), JSON.stringify(p, null, 2));
}

export function getProject(id: string): Project | undefined {
  const f = join(projectDir(id), "project.json");
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Project) : undefined;
}

export function listProjects(): Project[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .map((id) => {
      try {
        return getProject(id);
      } catch {
        return undefined;
      }
    })
    .filter((p): p is Project => !!p)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function appendEvent(id: string, e: StudioEvent): void {
  appendFileSync(join(projectDir(id), "events.jsonl"), JSON.stringify(e) + "\n");
}

export function readEvents(id: string): StudioEvent[] {
  const f = join(projectDir(id), "events.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as StudioEvent);
}

/** Markdown/text files the agent wrote anywhere under the project workspace (output/, etc.). */
export function listFiles(id: string): { path: string; size: number; modified: string }[] {
  const root = projectDir(id);
  const out: { path: string; size: number; modified: string }[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 5) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".") || name === "previews" || name === "node_modules") continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, depth + 1);
      else if (/\.(md|txt|json|kt)$/i.test(name) && !["project.json"].includes(name) && dir !== root) {
        out.push({ path: relative(root, full).split(sep).join("/"), size: st.size, modified: st.mtime.toISOString() });
      }
    }
  };
  if (existsSync(root)) walk(root, 0);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Resolve a path inside the project folder, refusing anything that escapes it. */
export function safePath(id: string, rel: string): string {
  const root = resolve(projectDir(id));
  const full = resolve(root, rel);
  if (full !== root && !full.startsWith(root + sep)) throw new Error("path outside project");
  return full;
}

export function listPreviews(id: string): string[] {
  const dir = join(projectDir(id), "previews");
  return existsSync(dir) ? readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : [];
}
