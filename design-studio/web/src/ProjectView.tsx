import { useEffect, useMemo, useRef, useState } from "react";
import { api, type ProjectDetail, type StudioEvent } from "./api";
import { Markdown, StatusBadge, timeAgo } from "./ui";

type Tab = "activity" | "files" | "previews";

export function ProjectView({ id, onChange }: { id: string; onChange: () => void }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [events, setEvents] = useState<StudioEvent[]>([]);
  const [tab, setTab] = useState<Tab>("activity");
  const [error, setError] = useState("");

  const load = () => api.project(id).then(setProject).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    setEvents([]);
    const es = new EventSource(`/api/projects/${id}/events`);
    es.onmessage = (m) => {
      const e = JSON.parse(m.data) as StudioEvent;
      setEvents((prev) => [...prev, e]);
      if (e.kind === "status" || e.kind === "image" || (e.kind === "tool_result" && e.ok)) {
        load();
        onChange();
      }
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <div className="page"><div className="banner banner-error">{error}</div></div>;
  if (!project) return <div className="page muted">Loading…</div>;

  return (
    <div className="page project-page">
      <div className="project-top">
      <header className="page-head row-between">
        <div className="min0">
          <h1 className="clamp1" title={project.idea}>{project.idea}</h1>
          <p className="muted small">
            {project.ref ? (
              <>Reference: <a href={project.ref} target="_blank" rel="noreferrer">{shortUrl(project.ref)}</a> · </>
            ) : null}
            Started {timeAgo(project.createdAt)}
            {project.costUsd > 0 && <> · ${project.costUsd.toFixed(2)} API-equivalent</>}
          </p>
        </div>
        <div className="row gap">
          <StatusBadge status={project.status} />
          {project.status === "running" && (
            <button className="btn btn-danger" onClick={() => api.stop(id).then(load)}>
              <span className="stop-square" aria-hidden /> Stop
            </button>
          )}
        </div>
      </header>

      <div className="tabs" role="tablist">
        <TabBtn cur={tab} me="activity" set={setTab}>Activity</TabBtn>
        <TabBtn cur={tab} me="files" set={setTab}>Design files ({project.files.length})</TabBtn>
        <TabBtn cur={tab} me="previews" set={setTab}>Previews ({project.previews.length})</TabBtn>
      </div>
      </div>

      {tab === "activity" && <Activity id={id} project={project} events={events} onSent={load} />}
      {tab === "files" && <Files id={id} files={project.files} />}
      {tab === "previews" && <Previews id={id} previews={project.previews} />}
    </div>
  );
}

function TabBtn({ cur, me, set, children }: { cur: Tab; me: Tab; set: (t: Tab) => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={cur === me} className={`tab ${cur === me ? "active" : ""}`} onClick={() => set(me)}>
      {children}
    </button>
  );
}

const shortUrl = (u: string) => u.replace(/^https?:\/\//, "").slice(0, 60);

function Activity({ id, project, events, onSent }: { id: string; project: ProjectDetail; events: StudioEvent[]; onSent: () => void }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [stopping, setStopping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const running = project.status === "running";

  // Follow new events only when the user is already near the bottom — don't yank them away while reading.
  // Block body on purpose: scrollIntoView may return a Promise, and an effect must return nothing or a cleanup fn.
  useEffect(() => {
    const scroller = bottom.current?.closest(".main");
    const nearBottom = !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 240;
    if (nearBottom) bottom.current?.scrollIntoView({ block: "end" });
  }, [events.length]);

  // When a run ends, "Approve & continue" appears where "Stop" was. Hold the buttons briefly so a click
  // meant for Stop can't land on Approve and start the next step.
  const [cooldown, setCooldown] = useState(false);
  const wasRunning = useRef(running);
  useEffect(() => {
    if (!running) setStopping(false);
    if (wasRunning.current && !running) {
      setCooldown(true);
      const t = setTimeout(() => setCooldown(false), 1200);
      wasRunning.current = running;
      return () => clearTimeout(t);
    }
    wasRunning.current = running;
  }, [running]);

  async function stop() {
    if (stopping) return;
    setStopping(true);
    try {
      await api.stop(id);
      onSent();
    } catch (e) {
      setErr((e as Error).message);
      setStopping(false);
    }
  }

  // Esc stops the agent while it is working (ignored while typing in a field or when a lightbox is open).
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "Escape" && !document.querySelector(".lightbox") && !(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) stop();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, id]);

  const resolved = useMemo(
    () => new Set(events.filter((e) => e.kind === "permission_done").map((e) => (e as { requestId: string }).requestId)),
    [events],
  );
  const results = useMemo(() => {
    const m = new Map<string, { ok: boolean; summary: string }>();
    for (const e of events) if (e.kind === "tool_result") m.set(e.id, e);
    return m;
  }, [events]);

  async function send(text: string) {
    if (!text.trim()) return;
    setSending(true);
    setErr("");
    try {
      await api.reply(id, text.trim());
      setMsg("");
      onSent();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const canReply = project.status !== "running";

  return (
    <div className="activity">
      <div className="feed">
        {events.length === 0 && <p className="muted">Waiting for the agent…</p>}
        {events.map((e, i) => (
          <EventRow key={i} e={e} id={id} result={e.kind === "tool" ? results.get(e.id) : undefined} pending={e.kind === "permission" && !resolved.has(e.requestId)} />
        ))}
        <div ref={bottom} />
      </div>

      <div className={`composer card ${canReply ? "" : "disabled"}`}>
        {err && <div className="banner banner-error">{err}</div>}
        {running && (
          <div className="working-bar">
            <div className="typing"><span /><span /><span /> {stopping ? "Stopping…" : "Agent is working"}</div>
            <button className="btn btn-danger" onClick={stop} disabled={stopping} title="Stop the agent (Esc)">
              <span className="stop-square" aria-hidden /> {stopping ? "Stopping…" : "Stop"}
              {!stopping && <kbd>Esc</kbd>}
            </button>
          </div>
        )}
        {project.status === "waiting" && (
          <p className="composer-hint">The agent stopped at an approval gate. Approve to continue, or write what to change.</p>
        )}
        {project.status === "stopped" && (
          <p className="composer-hint">Stopped. Write what to do next, or approve to continue from where it stopped.</p>
        )}
        {!running && (<>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={canReply ? "Write feedback or a change request…" : "The agent is working — you can reply when it stops."}
          rows={2}
          disabled={!canReply || sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(msg);
          }}
        />
        <div className="row gap end">
          <button className="btn btn-outline" disabled={!canReply || sending || cooldown || !msg.trim()} onClick={() => send(msg)}>
            Send changes
          </button>
          <button
            className="btn btn-primary"
            disabled={!canReply || sending || cooldown}
            onClick={() => send("Approved. Continue to the next step of the pipeline.")}
          >
            Approve & continue
          </button>
        </div>
        </>)}
      </div>
    </div>
  );
}

function EventRow({ e, id, result, pending }: { e: StudioEvent; id: string; result?: { ok: boolean; summary: string }; pending: boolean }) {
  switch (e.kind) {
    case "user":
      return <div className="ev ev-user"><Markdown text={e.text} /></div>;
    case "text":
      return <div className="ev ev-text"><Markdown text={e.text} /></div>;
    case "tool":
      return (
        <details className={`ev ev-tool ${result ? (result.ok ? "ok" : "fail") : "run"}`}>
          <summary>
            <span className="tool-icon">{result ? (result.ok ? "✓" : "!") : "…"}</span>
            <span className="tool-name">{prettyTool(e.name)}</span>
            <span className="tool-sum">{e.summary}</span>
          </summary>
          {result && <pre className="tool-out">{result.summary}</pre>}
        </details>
      );
    case "image":
      return (
        <figure className="ev ev-image">
          <img src={api.previewUrl(id, e.file)} alt={`Screenshot from ${e.tool}`} loading="lazy" />
          <figcaption className="muted small">{prettyTool(e.tool)}</figcaption>
        </figure>
      );
    case "permission":
      return <PermissionCard e={e} id={id} pending={pending} />;
    case "status":
      return e.status === "running" ? null : (
        <div className={`ev ev-status st-${e.status}`}>{e.note || e.status}</div>
      );
    case "error":
      return <div className="banner banner-error">{e.text}</div>;
    default:
      return null;
  }
}

function PermissionCard({ e, id, pending }: { e: Extract<StudioEvent, { kind: "permission" }>; id: string; pending: boolean }) {
  const [done, setDone] = useState<null | boolean>(null);
  const answer = async (allow: boolean) => {
    await api.permission(id, e.requestId, allow);
    setDone(allow);
  };
  return (
    <div className="ev ev-permission card">
      <div><strong>Allow {prettyTool(e.tool)}?</strong></div>
      <pre className="tool-out">{e.summary}</pre>
      {pending && done === null ? (
        <div className="row gap">
          <button className="btn btn-outline" onClick={() => answer(false)}>Deny</button>
          <button className="btn btn-primary" onClick={() => answer(true)}>Allow</button>
        </div>
      ) : (
        <span className="muted small">{done === false ? "Denied" : "Answered"}</span>
      )}
    </div>
  );
}

function prettyTool(name: string): string {
  const m = name.match(/^mcp__(?:plugin_[^_]+(?:-[^_]+)*_)?([^_]+(?:-[^_]+)*)__(.+)$/);
  if (m) return `${m[2]} · ${m[1]}`;
  return name;
}

function Files({ id, files }: { id: string; files: ProjectDetail["files"] }) {
  const [sel, setSel] = useState<string | null>(files[0]?.path ?? null);
  const [text, setText] = useState("");
  useEffect(() => {
    if (sel) api.file(id, sel).then(setText).catch((e) => setText(`Error: ${e.message}`));
  }, [id, sel]);
  if (!files.length) return <p className="muted">No design files yet. They appear here as the agent writes them.</p>;
  return (
    <div className="files">
      <ul className="file-list">
        {files.map((f) => (
          <li key={f.path}>
            <button className={`file-item ${sel === f.path ? "active" : ""}`} onClick={() => setSel(f.path)}>
              <span className="clamp1">{f.path.split("/").pop()}</span>
              <span className="muted small clamp1">{f.path.split("/").slice(0, -1).join("/")}</span>
            </button>
          </li>
        ))}
      </ul>
      <article className="file-view card">
        {sel?.endsWith(".md") ? <Markdown text={text} /> : <pre className="code">{text}</pre>}
      </article>
    </div>
  );
}

function Previews({ id, previews }: { id: string; previews: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!previews.length)
    return (
      <p className="muted">
        No previews yet. Figma screenshots and reference screens the agent looks at are saved here automatically.
      </p>
    );
  return (
    <>
      <div className="grid">
        {previews.map((p) => (
          <button key={p} className="thumb" onClick={() => setOpen(p)}>
            <img src={api.previewUrl(id, p)} alt={p} loading="lazy" />
            <span className="small muted clamp1">{p}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-label={open}>
          <img src={api.previewUrl(id, open)} alt={open} />
        </div>
      )}
    </>
  );
}
