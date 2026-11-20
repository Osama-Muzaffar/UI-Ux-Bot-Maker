import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./store.js";

export const CATEGORIES = [
  "spacing", "color", "type", "layout", "flow", "component", "copy", "accessibility", "code", "figma",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Lesson {
  id: number;
  category: Category;
  mistake: string;
  why: string;
  do_instead: string;
  source: "user" | "reviewer" | "code";
  seen: number;
  added: string;
  updated: string;
  promoted: number;
}

const STOP = new Set("a an the and or of to in on for with is are be not no than more less mein se ka ki ke ko na nahi hai ho".split(" "));
export const tokens = (s: string) =>
  new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

const SEED: Omit<Lesson, "id" | "updated" | "promoted">[] = [
  {
    category: "component",
    mistake: "Bottom navigation with more than 5 destinations.",
    why: "Material 3 nav bar supports 3–5 items; more makes targets too small and labels truncate.",
    do_instead: "Keep 3–5 top-level destinations; move the rest into a More/profile screen or a navigation drawer.",
    source: "user",
    seen: 1,
    added: "2026-11-20",
  },
];

export class LessonStore {
  private db: DatabaseSync;
  readonly mdPath: string;

  constructor(dir = DATA_DIR) {
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(join(dir, "lessons.db"));
    this.mdPath = join(dir, "LESSONS.md");
    this.db.exec(`CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, mistake TEXT NOT NULL, why TEXT NOT NULL, do_instead TEXT NOT NULL,
      source TEXT NOT NULL, seen INTEGER NOT NULL DEFAULT 1,
      added TEXT NOT NULL, updated TEXT NOT NULL, promoted INTEGER NOT NULL DEFAULT 0)`);
    const { n } = this.db.prepare("SELECT COUNT(*) AS n FROM lessons").get() as { n: number };
    if (n === 0) {
      for (const s of SEED) this.insert(s);
      this.exportMarkdown();
    }
  }

  private insert(l: Omit<Lesson, "id" | "updated" | "promoted">): number {
    const r = this.db
      .prepare("INSERT INTO lessons (category, mistake, why, do_instead, source, seen, added, updated) VALUES (?,?,?,?,?,?,?,?)")
      .run(l.category, l.mistake, l.why, l.do_instead, l.source, l.seen, l.added, l.added);
    return Number(r.lastInsertRowid);
  }

  all(): Lesson[] {
    return this.db.prepare("SELECT * FROM lessons ORDER BY promoted, seen DESC, id").all() as unknown as Lesson[];
  }

  /** Adds a lesson, or bumps `seen` on a near-duplicate (same category, similar mistake). */
  add(input: { category: Category; mistake: string; why: string; do_instead: string; source: Lesson["source"] }) {
    const today = new Date().toISOString().slice(0, 10);
    const t = tokens(`${input.mistake} ${input.do_instead}`);
    const dup = this.all()
      .filter((l) => l.category === input.category)
      .map((l) => ({ l, score: jaccard(t, tokens(`${l.mistake} ${l.do_instead}`)) }))
      .sort((a, b) => b.score - a.score)[0];
    if (dup && dup.score >= 0.5) {
      this.db.prepare("UPDATE lessons SET seen = seen + 1, updated = ? WHERE id = ?").run(today, dup.l.id);
      this.exportMarkdown();
      return { action: "merged" as const, lesson: this.get(dup.l.id)!, similarity: Math.round(dup.score * 100) / 100 };
    }
    const id = this.insert({ ...input, seen: 1, added: today });
    this.exportMarkdown();
    return { action: "added" as const, lesson: this.get(id)! };
  }

  get(id: number): Lesson | undefined {
    return this.db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as Lesson | undefined;
  }

  search(query: string, category?: Category, limit = 10) {
    const q = tokens(query);
    return this.all()
      .filter((l) => !l.promoted && (!category || l.category === category))
      .map((l) => {
        const words = tokens(`${l.category} ${l.mistake} ${l.why} ${l.do_instead}`);
        let hits = 0;
        for (const w of q) if (words.has(w) || [...words].some((x) => x.startsWith(w) || w.startsWith(x))) hits++;
        return { lesson: l, score: q.size ? hits / q.size + Math.min(l.seen, 5) * 0.02 : l.seen };
      })
      .filter((r) => !q.size || r.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  promotable(minSeen = 3): Lesson[] {
    return this.all().filter((l) => !l.promoted && l.seen >= minSeen);
  }

  markPromoted(id: number): Lesson | undefined {
    this.db.prepare("UPDATE lessons SET promoted = 1, updated = ? WHERE id = ?").run(new Date().toISOString().slice(0, 10), id);
    this.exportMarkdown();
    return this.get(id);
  }

  exportMarkdown(): void {
    const fmt = (l: Lesson) =>
      `### L-${String(l.id).padStart(3, "0")} · ${l.category} · seen: ${l.seen} · source: ${l.source} · added: ${l.added}\n` +
      `- Mistake: ${l.mistake}\n- Why: ${l.why}\n- Do instead: ${l.do_instead}\n`;
    const all = this.all();
    const md =
      "# Design lessons\n\n_Generated from lessons.db by the reference-analyzer MCP — edit via /learn, not by hand._\n\n" +
      "## Active\n\n" + (all.filter((l) => !l.promoted).map(fmt).join("\n") || "_(none)_\n") +
      "\n## Promoted (now rules in ux-thinking/SKILL.md)\n\n" + (all.filter((l) => l.promoted).map(fmt).join("\n") || "_(none yet)_\n");
    writeFileSync(this.mdPath, md);
  }
}
