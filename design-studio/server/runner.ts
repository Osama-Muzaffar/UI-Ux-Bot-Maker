import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import {
  appendEvent,
  getProject,
  projectDir,
  saveProject,
  type Project,
  type ProjectStatus,
  type StudioEvent,
} from "./projects.ts";

/** Tools the agent may use without asking (local, single-user app). Everything else asks in the UI. */
const AUTO_ALLOWED = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "Skill",
  "TodoWrite",
  "Agent",
  "Task",
  "Bash(python3:*)",
  "mcp__plugin_design-agent_reference-analyzer",
  "mcp__figma-console",
];

const STUDIO_INSTRUCTIONS = `
You are running inside Design Studio, a local app that shows your messages to the user.
- Your working directory is this project's folder. Write all design files under ./output/.
- At every approval gate, end your turn with a short summary (3-6 bullets) and the question. The user answers in the app.
- When everything the user asked for is finished, end your final message with the exact line: STATUS: DONE
- Never ask the user to run terminal commands; if something is missing (e.g. Figma bridge not running), say what to open and stop.`;

interface ActiveRun {
  abort: AbortController;
  permissions: Map<string, (allow: boolean) => void>;
}

const active = new Map<string, ActiveRun>();
const subscribers = new Map<string, Set<Response>>();

export const isRunning = (id: string) => active.has(id);

export function subscribe(id: string, res: Response): () => void {
  let set = subscribers.get(id);
  if (!set) subscribers.set(id, (set = new Set()));
  set.add(res);
  return () => set!.delete(res);
}

function emit(id: string, e: StudioEvent): void {
  appendEvent(id, e);
  const data = `data: ${JSON.stringify(e)}\n\n`;
  for (const res of subscribers.get(id) ?? []) res.write(data);
}

const now = () => new Date().toISOString();

function setStatus(p: Project, status: ProjectStatus, note?: string): void {
  p.status = status;
  saveProject(p);
  emit(p.id, { kind: "status", status, note, at: now() });
}

export function answerPermission(id: string, requestId: string, allow: boolean): boolean {
  const resolve = active.get(id)?.permissions.get(requestId);
  if (!resolve) return false;
  resolve(allow);
  return true;
}

export function stop(id: string): boolean {
  const run = active.get(id);
  if (!run) return false;
  run.abort.abort();
  return true;
}

export function startPrompt(p: Project): string {
  const ref = p.ref ? ` ref: ${p.ref}` : "";
  return `/design-agent:design-app "${p.idea.replace(/"/g, "'")}"${ref}`;
}

/** Runs one agent turn (until it stops at a gate or finishes). Resumes the project's session when it has one. */
export async function runTurn(projectId: string, prompt: string, shownAs?: string): Promise<void> {
  const p = getProject(projectId);
  if (!p) throw new Error("project not found");
  if (active.has(projectId)) throw new Error("agent is already working on this project");

  const run: ActiveRun = { abort: new AbortController(), permissions: new Map() };
  active.set(projectId, run);
  emit(projectId, { kind: "user", text: shownAs ?? prompt, at: now() });
  setStatus(p, "running");

  let finalText = "";
  let failed: string | undefined;

  try {
    const q = query({
      prompt,
      options: {
        cwd: projectDir(projectId),
        resume: p.sessionId,
        settingSources: ["user"],
        permissionMode: "acceptEdits",
        allowedTools: AUTO_ALLOWED,
        abortController: run.abort,
        systemPrompt: { type: "preset", preset: "claude_code", append: STUDIO_INSTRUCTIONS },
        canUseTool: (toolName, input, { signal }) => askUser(projectId, run, toolName, input, signal),
        stderr: (d) => process.stderr.write(`[agent ${projectId.slice(0, 12)}] ${d}`),
      },
    });

    for await (const m of q) {
      const r = handleMessage(p, m);
      if (r?.final !== undefined) finalText = r.final;
      if (r?.error) failed = r.error;
    }
  } catch (e) {
    failed = run.abort.signal.aborted ? undefined : (e as Error).message;
  } finally {
    active.delete(projectId);
    for (const resolve of run.permissions.values()) resolve(false);
  }

  const latest = getProject(projectId) ?? p;
  latest.sessionId = p.sessionId;
  latest.costUsd = p.costUsd;
  if (run.abort.signal.aborted) return setStatus(latest, "stopped", "Stopped. Reply to continue from here.");
  if (failed) {
    emit(projectId, { kind: "error", text: failed, at: now() });
    const auth = /authenticat|oauth|login|401/i.test(failed);
    return setStatus(
      latest,
      "error",
      auth
        ? "Claude login problem. Start Design Studio from your own terminal (npm start), or run `claude` there and /login once, then reply to retry."
        : "The agent hit an error. Reply to retry.",
    );
  }
  latest.lastSummary = finalText.slice(0, 600);
  if (/STATUS:\s*DONE\s*$/i.test(finalText.trim())) setStatus(latest, "done", "Finished.");
  else setStatus(latest, "waiting", "Waiting for your approval or feedback.");
}

function askUser(
  projectId: string,
  run: ActiveRun,
  tool: string,
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<PermissionResult> {
  const requestId = randomUUID();
  emit(projectId, { kind: "permission", requestId, tool, summary: summarizeInput(tool, input, 600), at: now() });
  return new Promise((resolve) => {
    const done = (allow: boolean) => {
      run.permissions.delete(requestId);
      emit(projectId, { kind: "permission_done", requestId, allowed: allow, at: now() });
      resolve(allow ? { behavior: "allow", updatedInput: input } : { behavior: "deny", message: "The user denied this in Design Studio." });
    };
    run.permissions.set(requestId, done);
    signal.addEventListener("abort", () => run.permissions.has(requestId) && done(false), { once: true });
  });
}

type Block = { type: string; [k: string]: unknown };
const toolNames = new Map<string, string>(); // tool_use id → tool name, for labelling previews

function handleMessage(p: Project, m: SDKMessage): { final?: string; error?: string } | void {
  switch (m.type) {
    case "system":
      if (m.subtype === "init" && m.session_id && p.sessionId !== m.session_id) {
        p.sessionId = m.session_id;
        saveProject(p);
      }
      return;
    case "assistant": {
      if (m.parent_tool_use_id) return; // subagent internals — keep the feed readable
      for (const b of m.message.content as unknown as Block[]) {
        if (b.type === "text" && typeof b.text === "string" && b.text.trim()) {
          emit(p.id, { kind: "text", text: b.text, at: now() });
        } else if (b.type === "tool_use") {
          toolNames.set(String(b.id), String(b.name));
          emit(p.id, {
            kind: "tool",
            id: String(b.id),
            name: String(b.name),
            summary: summarizeInput(String(b.name), (b.input ?? {}) as Record<string, unknown>, 160),
            at: now(),
          });
        }
      }
      return;
    }
    case "user": {
      if (m.parent_tool_use_id) return;
      const content = m.message.content;
      if (!Array.isArray(content)) return;
      for (const b of content as unknown as Block[]) {
        if (b.type !== "tool_result") continue;
        const id = String(b.tool_use_id);
        const parts: Block[] = Array.isArray(b.content)
          ? (b.content as Block[])
          : [{ type: "text", text: String(b.content ?? "") }];
        const text = parts.filter((x) => x.type === "text").map((x) => String(x.text)).join("\n");
        emit(p.id, { kind: "tool_result", id, ok: !b.is_error, summary: text.slice(0, 1500) || "(no text output)", at: now() });
        for (const img of parts.filter((x) => x.type === "image")) savePreview(p.id, toolNames.get(id) ?? "tool", img);
      }
      return;
    }
    case "result":
      p.costUsd += m.total_cost_usd ?? 0;
      if (m.session_id) p.sessionId = m.session_id;
      saveProject(p);
      if (m.subtype === "success") return { final: m.result, error: m.is_error ? m.result || "Agent reported an error" : undefined };
      return { error: `${m.subtype}: ${(m.errors ?? []).join("; ")}` };
    default:
      return;
  }
}

let previewCounter = 0;
function savePreview(projectId: string, toolName: string, img: Block): void {
  const source = img.source as { type?: string; media_type?: string; data?: string } | undefined;
  if (source?.type !== "base64" || !source.data) return;
  const ext = source.media_type === "image/jpeg" ? "jpg" : source.media_type === "image/webp" ? "webp" : "png";
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const file = `${stamp}-${String(++previewCounter).padStart(3, "0")}.${ext}`;
  writeFileSync(join(projectDir(projectId), "previews", file), Buffer.from(source.data, "base64"));
  emit(projectId, { kind: "image", file, tool: toolName, at: now() });
}

function summarizeInput(tool: string, input: Record<string, unknown>, max: number): string {
  const pick = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : undefined);
  const s =
    pick("file_path") ??
    pick("command") ??
    pick("skill") ??
    pick("url") ??
    pick("pattern") ??
    pick("description") ??
    JSON.stringify(input);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Called on server start: a project left "running" by a crash/restart can't still be running. */
export function recoverStale(projects: Project[]): void {
  for (const p of projects) if (p.status === "running" && !active.has(p.id)) {
    p.status = "stopped";
    saveProject(p);
  }
}
