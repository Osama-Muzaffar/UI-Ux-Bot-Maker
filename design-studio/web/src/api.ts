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

export interface ProjectDetail extends Project {
  files: { path: string; size: number; modified: string }[];
  previews: string[];
}

export interface Lesson {
  id: number;
  category: string;
  mistake: string;
  why: string;
  do_instead: string;
  source: string;
  seen: number;
  added: string;
  updated: string;
  promoted: number;
}

export interface Health {
  figmaBridge: boolean;
  pluginInstalled: boolean;
  dataDir: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  health: () => req<Health>("/api/health"),
  projects: () => req<Project[]>("/api/projects"),
  project: (id: string) => req<ProjectDetail>(`/api/projects/${id}`),
  create: (idea: string, ref?: string) =>
    req<Project>("/api/projects", { method: "POST", body: JSON.stringify({ idea, ref }) }),
  reply: (id: string, message: string) =>
    req<{ ok: true }>(`/api/projects/${id}/reply`, { method: "POST", body: JSON.stringify({ message }) }),
  permission: (id: string, requestId: string, allow: boolean) =>
    req<{ ok: true }>(`/api/projects/${id}/permission`, {
      method: "POST",
      body: JSON.stringify({ requestId, allow }),
    }),
  stop: (id: string) => req<{ ok: true }>(`/api/projects/${id}/stop`, { method: "POST" }),
  file: async (id: string, path: string) => {
    const res = await fetch(`/api/projects/${id}/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  },
  previewUrl: (id: string, name: string) => `/api/projects/${id}/preview/${encodeURIComponent(name)}`,
  lessons: (q: string, category: string) =>
    req<Lesson[]>(`/api/lessons?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`),
  categories: () => req<string[]>("/api/lessons/categories"),
  addLesson: (l: { category: string; mistake: string; why: string; do_instead: string }) =>
    req<{ action: string; lesson: Lesson }>("/api/lessons", { method: "POST", body: JSON.stringify(l) }),
  promote: (id: number) => req<{ lesson: Lesson }>(`/api/lessons/${id}/promote`, { method: "POST" }),
};
