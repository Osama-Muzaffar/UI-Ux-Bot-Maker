// End-to-end smoke test: spawns the built server over stdio and calls every tool.
// Usage: DESIGN_AGENT_HOME=/tmp/da-test node test/smoke.mjs [play-store-url]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || "https://play.google.com/store/apps/details?id=com.google.android.apps.fitness";
const client = new Client({ name: "smoke", version: "0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: ["--no-warnings", join(here, "../dist/index.js")], env: { ...process.env } }),
);

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const t = r.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  const imgs = r.content.filter((c) => c.type === "image").length;
  console.log(`\n=== ${name}${r.isError ? " (ERROR)" : ""}${imgs ? ` [${imgs} images]` : ""}\n${t.slice(0, 1800)}`);
  return { r, t };
};

console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "));

const { t } = await call("fetch_reference", { url });
const slug = JSON.parse(t).slug;
const { r: shots } = await call("analyze_screens", { slug });
const files = JSON.parse(t).screenshots.map((s) => s.file.split("/").pop());
await call("analyze_screens", {
  slug,
  screens: files.slice(0, 2).map((f, i) => ({
    file: f,
    screen_type: i === 0 ? "home" : "detail",
    layout_pattern: "TopBar · hero ring · cards list",
    navigation: "bottom_nav",
    notable: "smoke test entry",
  })),
});
await call("extract_style", { slug });
await call("extract_style", { slug, judgment: { font_style: "smoke", corner_radius: "smoke" } });
await call("pattern_report", { slug, good: ["g"], take: ["t"], avoid: ["a"] });

await call("lessons_search", { query: "bottom navigation items" });
await call("lessons_add", { category: "spacing", mistake: "Cards used 12dp side margin", why: "Off the 16dp screen margin rule", do_instead: "Use 16dp side margins on every screen", source: "reviewer" });
await call("lessons_add", { category: "spacing", mistake: "Cards used 12dp side margin on home", why: "Inconsistent", do_instead: "Use 16dp side margins on every screen", source: "user" });
await call("lessons_search", { query: "margin" });
await call("lessons_review", { min_seen: 2 });
await client.close();
