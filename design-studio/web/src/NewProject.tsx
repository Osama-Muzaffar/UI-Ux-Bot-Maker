import { useState } from "react";
import { api, type Project } from "./api";

const EXAMPLES = [
  "Expense tracker for freelancers",
  "Gym workout tracker for beginners who train 3 times a week",
  "Habit tracker for university students",
];

export function NewProject({ onCreated }: { onCreated: (p: Project) => void }) {
  const [idea, setIdea] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refValid = !ref || /^https?:\/\/\S+$/.test(ref.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || !refValid) return;
    setBusy(true);
    setError("");
    try {
      onCreated(await api.create(idea.trim(), ref.trim() || undefined));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <header className="page-head">
        <h1>New design</h1>
        <p className="muted">
          Describe the app. The agent writes a brief, flow, wireframes and a design system, and stops for your
          approval after each step.
        </p>
      </header>
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">App idea</span>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. Expense tracker for freelancers"
            rows={3}
            required
            autoFocus
          />
        </label>
        <div className="chips">
          {EXAMPLES.map((x) => (
            <button type="button" key={x} className="chip" onClick={() => setIdea(x)}>
              {x}
            </button>
          ))}
        </div>
        <label className="field">
          <span className="field-label">
            Reference link <span className="muted">(optional)</span>
          </span>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=…"
            inputMode="url"
          />
          <span className={`field-help ${refValid ? "" : "field-error"}`}>
            {refValid
              ? "Play Store or website link. The agent takes patterns only — never icons, colors or text."
              : "Enter a full link starting with https://"}
          </span>
        </label>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !idea.trim() || !refValid}>
            {busy ? "Starting…" : "Start designing"}
          </button>
        </div>
      </form>
    </div>
  );
}
