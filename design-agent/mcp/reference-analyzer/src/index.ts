#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fetchReference } from "./fetch.js";
import { analyzePixels, decode, sniffFormat, type StyleStats } from "./image.js";
import { CATEGORIES, LessonStore } from "./lessons.js";
import { STYLES, iconSvg, searchIcons } from "./icons.js";
import { DATA_DIR, loadMeta, readJson, refDir, writeJson } from "./store.js";

const server = new McpServer({ name: "design-agent-reference-analyzer", version: "0.1.0" });
let lessonsStore: LessonStore | undefined;
const lessons = () => (lessonsStore ??= new LessonStore());

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const json = (v: unknown) => text(JSON.stringify(v, null, 2));
const fail = (e: unknown) => ({ ...text(`Error: ${(e as Error).message}`), isError: true });

const COPY_RULE =
  "COPY LIMIT: take patterns and structure only. Never reuse this app's icons, illustrations, brand colors or text.";

// ---------- Phase 3: reference analyzer ----------

server.registerTool(
  "fetch_reference",
  {
    title: "Fetch reference app",
    description:
      "Fetch a reference app from a Google Play Store link or a website URL. Saves app name, category, description and screenshots locally. Run this first; the other reference tools take the returned slug.",
    inputSchema: {
      url: z.string().url().describe("Play Store link (play.google.com/store/apps/details?id=…) or website URL"),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/).optional().describe("Optional folder name; defaults to the app name"),
    },
  },
  async ({ url, slug }) => {
    try {
      const m = await fetchReference(url, slug);
      return json({ ...m, folder: refDir(m.slug), next: "Call analyze_screens with this slug.", rule: COPY_RULE });
    } catch (e) {
      return fail(e);
    }
  },
);

const ScreenAnalysis = z.object({
  file: z.string().describe("Screenshot file name, e.g. screen-01.png"),
  screen_type: z.enum(["onboarding", "auth", "home", "dashboard", "list", "detail", "form", "search", "settings", "profile", "empty_state", "paywall", "other"]),
  layout_pattern: z.string().describe("Regions top→bottom, e.g. 'TopBar · hero card · horizontal chips · vertical list · FAB'"),
  navigation: z.enum(["bottom_nav", "top_tabs", "drawer", "stack_only", "none_visible"]),
  notable: z.string().optional().describe("One pattern worth learning from (structure, not visuals to copy)"),
});

server.registerTool(
  "analyze_screens",
  {
    title: "Analyze reference screens",
    description:
      "Step 1 (no `screens`): returns the reference screenshots as images plus the fields to fill. Look at them yourself. Step 2: call again with `screens` filled in to save the structured analysis.",
    inputSchema: {
      slug: z.string(),
      screens: z.array(ScreenAnalysis).optional(),
    },
  },
  async ({ slug, screens }) => {
    try {
      const meta = loadMeta(slug);
      const dir = refDir(slug);
      if (screens) {
        const known = new Set(meta.screenshots.map((s) => basename(s.file)));
        const unknown = screens.filter((s) => !known.has(basename(s.file))).map((s) => s.file);
        writeJson(join(dir, "analysis.json"), { slug, analyzedAt: new Date().toISOString(), screens });
        return json({ saved: join(dir, "analysis.json"), count: screens.length, unknownFiles: unknown, next: "Call extract_style." });
      }
      const images = meta.screenshots
        .filter((s) => s.format === "png" || s.format === "jpg" || s.format === "webp")
        .map((s) => ({
          type: "image" as const,
          data: readFileSync(s.file).toString("base64"),
          mimeType: s.format === "jpg" ? "image/jpeg" : `image/${s.format}`,
        }));
      if (!images.length) return text(`No screenshots for "${slug}". Add PNG/JPG files to ${dir} and update meta.json, or re-run fetch_reference.`);
      return {
        content: [
          {
            type: "text" as const,
            text:
              `${meta.name} (${meta.category ?? meta.source}) — ${images.length} screenshots, in order: ` +
              meta.screenshots.map((s) => basename(s.file)).join(", ") +
              `.\nFor each, decide screen_type, layout_pattern (regions top→bottom), navigation and one notable pattern, then call analyze_screens again with \`screens\`.\n${COPY_RULE}`,
          },
          ...images,
        ],
      };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "extract_style",
  {
    title: "Extract visual style",
    description:
      "Measures the reference screenshots' pixels: palette, background, light/dark theme, accent colors and density (whitespace). Pass `judgment` (font style, corner radius — things you see in the images) to save the combined style profile.",
    inputSchema: {
      slug: z.string(),
      judgment: z
        .object({
          font_style: z.string().describe("e.g. 'geometric sans, bold headlines, tabular numbers'"),
          corner_radius: z.string().describe("e.g. 'large ~20dp cards, pill buttons'"),
          density_override: z.enum(["airy", "balanced", "compact"]).optional().describe("Only if the measured density is misleading (e.g. marketing frames)"),
          notes: z.string().optional(),
        })
        .optional(),
    },
  },
  async ({ slug, judgment }) => {
    try {
      const meta = loadMeta(slug);
      const per: (StyleStats & { file: string })[] = [];
      const skipped: string[] = [];
      for (const s of meta.screenshots) {
        const px = decode(s.file);
        if (px) per.push({ file: basename(s.file), ...analyzePixels(px) });
        else skipped.push(`${basename(s.file)} (${sniffFormat(readFileSync(s.file))})`);
      }
      if (!per.length) return text(`No decodable PNG/JPG screenshots for "${slug}". Skipped: ${skipped.join(", ") || "none"}`);

      const count = (xs: string[]) => {
        const m = new Map<string, number>();
        xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      };
      const avgWhitespace = Math.round((per.reduce((a, p) => a + p.whitespace, 0) / per.length) * 100) / 100;
      const measured = {
        theme: count(per.map((p) => p.theme))[0],
        backgrounds: count(per.map((p) => p.background)).slice(0, 3),
        accents: count(per.flatMap((p) => p.accents)).slice(0, 5),
        avgWhitespace,
        density: avgWhitespace > 0.55 ? "airy" : avgWhitespace < 0.35 ? "compact" : "balanced",
        perScreen: per.map(({ file, background, theme, accents, whitespace, density }) => ({ file, background, theme, accents, whitespace, density })),
        skipped,
      };
      if (!judgment) {
        return json({
          measured,
          next: "Look at the screenshots (analyze_screens) for font style and corner radius, then call extract_style again with `judgment` to save.",
          rule: COPY_RULE + " The accents above are the reference's BRAND colors — do not reuse them.",
        });
      }
      const style = {
        slug,
        savedAt: new Date().toISOString(),
        ...measured,
        density: judgment.density_override ?? measured.density,
        fontStyle: judgment.font_style,
        cornerRadius: judgment.corner_radius,
        notes: judgment.notes,
      };
      writeJson(join(refDir(slug), "style.json"), style);
      return json({ saved: join(refDir(slug), "style.json"), style, next: "Call pattern_report." });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "pattern_report",
  {
    title: "Write pattern report",
    description:
      "Combine fetch/analysis/style results with your verdicts into report.md: what's good, what to take, what to avoid. Feed this report to the ux-thinking skill.",
    inputSchema: {
      slug: z.string(),
      good: z.array(z.string()).min(1).describe("What the reference does well (patterns, flow, hierarchy)"),
      take: z.array(z.string()).min(1).describe("Patterns to adapt in OUR app — structure, never assets"),
      avoid: z.array(z.string()).min(1).describe("What to avoid (their problems, or things that would be copying)"),
    },
  },
  async ({ slug, good, take, avoid }) => {
    try {
      const meta = loadMeta(slug);
      const dir = refDir(slug);
      const analysis = readJson<{ screens: z.infer<typeof ScreenAnalysis>[] }>(join(dir, "analysis.json"));
      const style = readJson<Record<string, unknown> & { accents?: string[] }>(join(dir, "style.json"));
      const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");
      const md = [
        `# Pattern report — ${meta.name}`,
        "",
        `Source: ${meta.url}  \nCategory: ${meta.category ?? "—"} · Fetched: ${meta.fetchedAt.slice(0, 10)} · Screens: ${meta.screenshots.length}`,
        "",
        `> ${COPY_RULE}`,
        "",
        "## Screens",
        analysis
          ? "| File | Type | Layout (top→bottom) | Navigation | Notable |\n|---|---|---|---|---|\n" +
            analysis.screens.map((s) => `| ${s.file} | ${s.screen_type} | ${s.layout_pattern} | ${s.navigation} | ${s.notable ?? ""} |`).join("\n")
          : "_Not analyzed — run analyze_screens._",
        "",
        "## Style profile",
        style
          ? [
              `- Theme: ${style.theme} · Density: ${style.density} (whitespace ${style.avgWhitespace})`,
              `- Type: ${style.fontStyle}`,
              `- Shape: ${style.cornerRadius}`,
              `- Brand accents (**do not reuse**): ${(style.accents ?? []).join(", ") || "—"}`,
              style.notes ? `- Notes: ${style.notes}` : "",
            ].filter(Boolean).join("\n")
          : "_No style profile — run extract_style with judgment._",
        "",
        "## What's good",
        list(good),
        "",
        "## Take (adapt as patterns)",
        list(take),
        "",
        "## Avoid",
        list(avoid),
        "",
      ].join("\n");
      const path = join(dir, "report.md");
      writeFileSync(path, md);
      return text(`Saved ${path}\n\n${md}`);
    } catch (e) {
      return fail(e);
    }
  },
);

// ---------- Icons (Material Symbols) ----------

const PLACE_ICON_JS = `// Paste into figma_execute. ICONS = { name: svg } from icons_svg.
function placeIcon(parent, name, svg, { size = 24, color = "#1C1B1F", index } = {}) {
  const node = figma.createNodeFromSvg(svg);          // 24x24 frame with vector paths
  node.name = "Icon/" + name;
  node.fills = [];                                     // no frame background
  if (size !== 24) node.rescale(size / 24);
  const h = color.replace("#", "");
  const rgb = { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 };
  for (const v of node.findAll((n) => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION")) v.fills = [{ type: "SOLID", color: rgb }];
  if (index === undefined) parent.appendChild(node); else parent.insertChild(index, node);
  return node;
}`;

server.registerTool(
  "icon_search",
  {
    title: "Search Material Symbols icons",
    description:
      "Find the right Material Symbols icon name for a meaning (e.g. 'settings', 'add expense', 'back arrow', 'profile'). Returns icon names to pass to icons_svg. Use this whenever a screen needs an icon and you are not sure of the exact name.",
    inputSchema: {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(30).default(8),
    },
  },
  async ({ query, limit }) => {
    try {
      return json({ query, results: await searchIcons(query, limit) });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "icons_svg",
  {
    title: "Get icon SVGs",
    description:
      "Get SVG markup for Material Symbols icons (Google's official Android icons, Apache 2.0) to place real icons in Figma with figma.createNodeFromSvg(). Fetch every icon a screen needs in ONE call. The result includes a placeIcon() helper for figma_execute.",
    inputSchema: {
      names: z.array(z.string()).min(1).max(40).describe("Material Symbols names, e.g. ['home', 'arrow_back', 'settings']"),
      style: z.enum(STYLES).default("outlined").describe("Match the design system: outlined (default), rounded or sharp"),
      filled: z.boolean().default(false).describe("Filled variant — use for the selected/active state (e.g. active nav item)"),
    },
  },
  async ({ names, style, filled }) => {
    const icons: Record<string, string> = {};
    const missing: { name: string; error: string; suggestions?: string[] }[] = [];
    await Promise.all(
      [...new Set(names)].map(async (n) => {
        try {
          icons[n] = await iconSvg(n, style, filled);
        } catch (e) {
          let suggestions: string[] | undefined;
          try {
            suggestions = (await searchIcons(n.replace(/_/g, " "), 5)).map((r) => r.name);
          } catch {
            /* metadata unavailable */
          }
          missing.push({ name: n, error: (e as Error).message, suggestions });
        }
      }),
    );
    return json({ style, filled, icons, missing, placeIconHelper: PLACE_ICON_JS });
  },
);

// ---------- Phase 4: lessons memory ----------

server.registerTool(
  "lessons_add",
  {
    title: "Add design lesson",
    description:
      "Save a design lesson (a mistake caught by the reviewer, or a manual fix the user made). Near-duplicates in the same category are merged and their `seen` count goes up instead.",
    inputSchema: {
      category: z.enum(CATEGORIES),
      mistake: z.string().min(5),
      why: z.string().min(5),
      do_instead: z.string().min(5),
      source: z.enum(["user", "reviewer", "code"]),
    },
  },
  async (input) => {
    try {
      const r = lessons().add(input);
      return json({ ...r, markdown: lessons().mdPath });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "lessons_search",
  {
    title: "Search design lessons",
    description:
      "Find lessons relevant to a new design before starting it (e.g. query 'bottom nav list fitness onboarding'). Empty query returns the most-seen lessons.",
    inputSchema: {
      query: z.string().default(""),
      category: z.enum(CATEGORIES).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    },
  },
  async ({ query, category, limit }) => {
    try {
      const results = lessons().search(query, category, limit);
      return json({
        count: results.length,
        lessons: results.map(({ lesson: l, score }) => ({
          id: `L-${String(l.id).padStart(3, "0")}`,
          category: l.category,
          seen: l.seen,
          rule: `${l.do_instead} (avoid: ${l.mistake})`,
          why: l.why,
          score: Math.round(score * 100) / 100,
        })),
      });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "lessons_review",
  {
    title: "Review lessons for promotion",
    description:
      "Monthly review: lists lessons seen at least `min_seen` times that should become permanent rules in ux-thinking/SKILL.md. Pass `promote_id` after you have added the rule to the skill, to mark it promoted.",
    inputSchema: {
      min_seen: z.number().int().min(1).default(3),
      promote_id: z.number().int().optional().describe("Numeric id (L-007 → 7) to mark as promoted"),
    },
  },
  async ({ min_seen, promote_id }) => {
    try {
      if (promote_id !== undefined) {
        const l = lessons().markPromoted(promote_id);
        return l ? json({ promoted: l }) : fail(new Error(`No lesson ${promote_id}`));
      }
      return json({ candidates: lessons().promotable(min_seen), dataDir: DATA_DIR });
    } catch (e) {
      return fail(e);
    }
  },
);

await server.connect(new StdioServerTransport());
console.error(`design-agent reference-analyzer MCP running (data: ${DATA_DIR})`);
