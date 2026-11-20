import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DATA_DIR,
  createProject,
  getProject,
  listFiles,
  listPreviews,
  listProjects,
  readEvents,
  safePath,
} from "./projects.ts";
import { answerPermission, isRunning, recoverStale, runTurn, startPrompt, stop, subscribe } from "./runner.ts";
import { CATEGORIES, LessonStore, type Category } from "./lessons.ts";

const PORT = Number(process.env.STUDIO_PORT || 5174);
const HOST = "127.0.0.1"; // local-only: this app drives an agent with file access
const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(here, "..", "dist-web");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Reject cross-site requests: only same-origin pages (the app itself) may call the API.
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) return void res.status(403).json({ error: "forbidden origin" });
  next();
});

const lessons = new LessonStore();
const wrap = (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);
const param = (req: Request, k: string) => String(req.params[k]);

// ---------- health ----------
app.get(
  "/api/health",
  wrap(async (_req, res) => {
    const figmaBridge = await new Promise<boolean>((resolve) => {
      const s = createConnection({ host: "127.0.0.1", port: 9223 });
      const end = (ok: boolean) => (s.destroy(), resolve(ok));
      s.setTimeout(600, () => end(false));
      s.once("connect", () => end(true));
      s.once("error", () => end(false));
    });
    const pluginInstalled = existsSync(join(homedir(), ".claude", "plugins", "cache", "osama-local", "design-agent"));
    res.json({ figmaBridge, pluginInstalled, dataDir: DATA_DIR });
  }),
);

// ---------- projects ----------
app.get("/api/projects", (_req, res) => {
  res.json(listProjects());
});

app.post(
  "/api/projects",
  wrap((req, res) => {
    const idea = String(req.body?.idea ?? "").trim();
    const ref = req.body?.ref ? String(req.body.ref).trim() : undefined;
    if (idea.length < 3 || idea.length > 500) return void res.status(400).json({ error: "Idea must be 3–500 characters." });
    if (ref && !/^https?:\/\/\S+$/.test(ref)) return void res.status(400).json({ error: "Reference must be an http(s) link." });
    const p = createProject(idea, ref);
    runTurn(p.id, startPrompt(p), ref ? `${idea}\n\nReference: ${ref}` : idea).catch((e) => console.error(e));
    res.status(201).json(p);
  }),
);

app.get("/api/projects/:id", (req, res) => {
  const p = getProject(param(req, "id"));
  if (!p) return void res.status(404).json({ error: "not found" });
  res.json({ ...p, files: listFiles(p.id), previews: listPreviews(p.id) });
});

app.get("/api/projects/:id/events", (req, res) => {
  const id = param(req, "id");
  if (!getProject(id)) return void res.status(404).end();
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  for (const e of readEvents(id)) res.write(`data: ${JSON.stringify(e)}\n\n`);
  const unsub = subscribe(id, res);
  const ping = setInterval(() => res.write(": ping\n\n"), 20000);
  req.on("close", () => {
    clearInterval(ping);
    unsub();
  });
});

app.post("/api/projects/:id/reply", (req, res) => {
  const id = param(req, "id");
  const p = getProject(id);
  if (!p) return void res.status(404).json({ error: "not found" });
  if (isRunning(id)) return void res.status(409).json({ error: "The agent is still working." });
  const message = String(req.body?.message ?? "").trim();
  if (!message) return void res.status(400).json({ error: "Empty message." });
  // A project that never got a session (e.g. failed on start) restarts the pipeline instead of resuming.
  const prompt = p.sessionId ? message : `${startPrompt(p)}\n\n${message}`;
  runTurn(id, prompt, message).catch((e) => console.error(e));
  res.json({ ok: true });
});

app.post("/api/projects/:id/permission", (req, res) => {
  const ok = answerPermission(param(req, "id"), String(req.body?.requestId), !!req.body?.allow);
  res.status(ok ? 200 : 404).json(ok ? { ok: true } : { error: "No pending request (it may have expired)." });
});

app.post("/api/projects/:id/stop", (req, res) => {
  res.json({ ok: stop(param(req, "id")) });
});

app.get("/api/projects/:id/file", (req, res) => {
  try {
    const rel = String(req.query.path ?? "");
    if (!/\.(md|txt|json|kt)$/i.test(rel)) return void res.status(400).send("unsupported file type");
    res.type("text/plain; charset=utf-8").send(readFileSync(safePath(param(req, "id"), rel), "utf8"));
  } catch {
    res.status(404).send("not found");
  }
});

app.get("/api/projects/:id/preview/:name", (req, res) => {
  const name = param(req, "name");
  if (!/^[\w.-]+\.(png|jpe?g|webp)$/i.test(name)) return void res.status(400).end();
  try {
    res.sendFile(safePath(param(req, "id"), `previews/${name}`));
  } catch {
    res.status(404).end();
  }
});

// ---------- lessons ----------
app.get("/api/lessons/categories", (_req, res) => {
  res.json(CATEGORIES);
});

app.get("/api/lessons", (req, res) => {
  const q = String(req.query.q ?? "");
  const cat = String(req.query.category ?? "");
  const category = (CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : undefined;
  const all = lessons.all().filter((l) => !category || l.category === category);
  if (!q.trim()) return void res.json(all);
  const ids = new Set(lessons.search(q, category, 200).map((r) => r.lesson.id));
  res.json(all.filter((l) => ids.has(l.id)));
});

app.post("/api/lessons", (req, res) => {
  const { category, mistake, why, do_instead } = req.body ?? {};
  if (!(CATEGORIES as readonly string[]).includes(category)) return void res.status(400).json({ error: "Unknown category." });
  for (const [k, v] of Object.entries({ mistake, why, do_instead }))
    if (typeof v !== "string" || v.trim().length < 5) return void res.status(400).json({ error: `${k} must be at least 5 characters.` });
  res.json(lessons.add({ category, mistake: mistake.trim(), why: why.trim(), do_instead: do_instead.trim(), source: "user" }));
});

app.post("/api/lessons/:id/promote", (req, res) => {
  const l = lessons.markPromoted(Number(param(req, "id")));
  if (!l) return void res.status(404).json({ error: "not found" });
  res.json({ lesson: l });
});

// ---------- built web app (production) ----------
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.use((req, res, next) => (req.method === "GET" && !req.path.startsWith("/api") ? res.sendFile(join(WEB_DIST, "index.html")) : next()));
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

recoverStale(listProjects());
app.listen(PORT, HOST, () => {
  console.log(`Design Studio API on http://${HOST}:${PORT}  (data: ${DATA_DIR})`);
  if (existsSync(WEB_DIST)) console.log(`Open http://${HOST}:${PORT}`);
});
