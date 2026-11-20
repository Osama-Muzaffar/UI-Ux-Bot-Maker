import { useEffect, useState } from "react";
import { api, type Lesson } from "./api";

export function Lessons() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [items, setItems] = useState<Lesson[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = () => api.lessons(q, category).then(setItems).catch((e) => setError(e.message));

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const active = items.filter((l) => !l.promoted);
  const promoted = items.filter((l) => l.promoted);
  const candidates = active.filter((l) => l.seen >= 3);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Lessons</h1>
        <p className="muted">
          What the agent has learned from the reviewer and from your fixes. It searches these before every new design.
        </p>
      </header>

      {candidates.length > 0 && (
        <div className="banner banner-info">
          {candidates.length} lesson{candidates.length > 1 ? "s have" : " has"} come up 3+ times. Add {candidates.length > 1 ? "them" : "it"} to
          the ux-thinking skill as a permanent rule, then mark {candidates.length > 1 ? "them" : "it"} promoted.
        </div>
      )}

      <div className="toolbar">
        <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons (e.g. bottom nav, spacing)" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {error && <div className="banner banner-error">{error}</div>}
      {note && <div className="banner banner-ok">{note}</div>}

      <div className="lessons">
        {active.length === 0 && <p className="muted">No lessons match.</p>}
        {active.map((l) => (
          <LessonCard key={l.id} l={l} onPromote={() => api.promote(l.id).then(() => { setNote(`L-${pad(l.id)} marked promoted.`); load(); })} />
        ))}
      </div>

      {promoted.length > 0 && (
        <>
          <h2 className="section-title">Promoted to rules</h2>
          <div className="lessons">{promoted.map((l) => <LessonCard key={l.id} l={l} />)}</div>
        </>
      )}

      <AddLesson
        cats={cats}
        onAdded={(r) => {
          setNote(r.action === "merged" ? `Merged into L-${pad(r.lesson.id)} (seen ${r.lesson.seen}×).` : `Added L-${pad(r.lesson.id)}.`);
          load();
        }}
      />
    </div>
  );
}

const pad = (n: number) => String(n).padStart(3, "0");

function LessonCard({ l, onPromote }: { l: Lesson; onPromote?: () => void }) {
  return (
    <article className={`card lesson ${l.promoted ? "is-promoted" : ""}`}>
      <div className="row-between">
        <div className="row gap">
          <span className="lesson-id">L-{pad(l.id)}</span>
          <span className="tag">{l.category}</span>
          <span className="muted small">{l.source} · {l.added}</span>
        </div>
        <span className={`seen ${l.seen >= 3 ? "seen-hot" : ""}`} title="Times this came up">×{l.seen}</span>
      </div>
      <p className="lesson-rule">{l.do_instead}</p>
      <p className="small"><span className="muted">Avoid:</span> {l.mistake}</p>
      <p className="small"><span className="muted">Why:</span> {l.why}</p>
      {onPromote && l.seen >= 3 && (
        <div className="row end">
          <button className="btn btn-outline btn-sm" onClick={onPromote}>Mark promoted</button>
        </div>
      )}
    </article>
  );
}

function AddLesson({ cats, onAdded }: { cats: string[]; onAdded: (r: { action: string; lesson: Lesson }) => void }) {
  const [f, setF] = useState({ category: "", mistake: "", why: "", do_instead: "" });
  const [err, setErr] = useState("");
  const ok = f.category && f.mistake.trim().length >= 5 && f.why.trim().length >= 5 && f.do_instead.trim().length >= 5;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="card form add-lesson"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ok) return;
        try {
          onAdded(await api.addLesson(f));
          setF({ category: f.category, mistake: "", why: "", do_instead: "" });
          setErr("");
        } catch (x) {
          setErr((x as Error).message);
        }
      }}
    >
      <h2 className="section-title">Add a lesson</h2>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Category</span>
          <select value={f.category} onChange={set("category")} required>
            <option value="">Choose…</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="field span2">
          <span className="field-label">Do instead (the rule)</span>
          <input value={f.do_instead} onChange={set("do_instead")} placeholder="Keep bottom nav to 3–5 items" />
        </label>
        <label className="field span2">
          <span className="field-label">Mistake</span>
          <input value={f.mistake} onChange={set("mistake")} placeholder="Bottom nav had 6 items" />
        </label>
        <label className="field">
          <span className="field-label">Why</span>
          <input value={f.why} onChange={set("why")} placeholder="Labels truncate, targets shrink" />
        </label>
      </div>
      {err && <div className="banner banner-error">{err}</div>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={!ok}>Save lesson</button>
      </div>
    </form>
  );
}
