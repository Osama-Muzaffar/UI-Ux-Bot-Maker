import { marked } from "marked";
import { useMemo } from "react";
import type { ProjectStatus } from "./api";

const LABEL: Record<ProjectStatus, string> = {
  running: "Working",
  waiting: "Needs you",
  done: "Done",
  error: "Error",
  stopped: "Stopped",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge badge-${status}`}>{LABEL[status]}</span>;
}

/** Renders markdown the agent wrote. Content is local and agent-generated; raw HTML is escaped. */
export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => {
    const escaped = text.replace(/</g, "&lt;");
    return marked.parse(escaped, { async: false, gfm: true }) as string;
  }, [text]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
