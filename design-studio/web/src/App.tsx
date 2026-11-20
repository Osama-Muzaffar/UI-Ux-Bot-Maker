import { useCallback, useEffect, useState } from "react";
import { api, type Health, type Project } from "./api";
import { NewProject } from "./NewProject";
import { ProjectView } from "./ProjectView";
import { Lessons } from "./Lessons";
import { StatusBadge } from "./ui";

type View = { name: "new" } | { name: "project"; id: string } | { name: "lessons" };

function readHash(): View {
  const h = location.hash.slice(1);
  if (h.startsWith("project/")) return { name: "project", id: h.slice(8) };
  if (h === "lessons") return { name: "lessons" };
  return { name: "new" };
}

export function App() {
  const [view, setView] = useState<View>(readHash);
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  const go = (v: View) => {
    location.hash = v.name === "project" ? `project/${v.id}` : v.name;
    setView(v);
  };

  const refresh = useCallback(() => {
    api.projects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    api.health().then(setHealth).catch(() => setHealth(null));
    const t = setInterval(refresh, 4000);
    const onHash = () => setView(readHash());
    addEventListener("hashchange", onHash);
    return () => {
      clearInterval(t);
      removeEventListener("hashchange", onHash);
    };
  }, [refresh]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>◆</span>
          <span>Design Studio</span>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => go({ name: "new" })}>
          + New design
        </button>
        <nav className="nav">
          <button className={`nav-item ${view.name === "lessons" ? "active" : ""}`} onClick={() => go({ name: "lessons" })}>
            Lessons
          </button>
        </nav>
        <div className="nav-label">Projects</div>
        <div className="project-list">
          {projects.length === 0 && <p className="muted small pad">No projects yet.</p>}
          {projects.map((p) => (
            <button
              key={p.id}
              className={`project-item ${view.name === "project" && view.id === p.id ? "active" : ""}`}
              onClick={() => go({ name: "project", id: p.id })}
              title={p.idea}
            >
              <span className="project-title">{p.idea}</span>
              <StatusBadge status={p.status} />
            </button>
          ))}
        </div>
        <div className="health">
          <Dot ok={!!health?.pluginInstalled} label="design-agent plugin" />
          <Dot ok={!!health?.figmaBridge} label="Figma bridge" />
        </div>
      </aside>
      <main className="main">
        {view.name === "new" && (
          <NewProject
            onCreated={(p) => {
              refresh();
              go({ name: "project", id: p.id });
            }}
          />
        )}
        {view.name === "project" && <ProjectView key={view.id} id={view.id} onChange={refresh} />}
        {view.name === "lessons" && <Lessons />}
      </main>
    </div>
  );
}

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="health-row" title={ok ? "connected" : "not connected"}>
      <span className={`dot ${ok ? "dot-ok" : "dot-off"}`} />
      <span>{label}</span>
    </div>
  );
}
