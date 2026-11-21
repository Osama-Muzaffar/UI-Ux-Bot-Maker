import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./store.js";

/**
 * Material Symbols (Apache 2.0) — Google's official Android icon set.
 * SVGs come from Google's font CDN and are cached in ~/.design-agent/icons/.
 */
const CDN = "https://fonts.gstatic.com/s/i/short-term/release";
const METADATA_URL = "https://fonts.google.com/metadata/icons";
const ICON_DIR = join(DATA_DIR, "icons");
const META_FILE = join(ICON_DIR, "metadata.json");
const META_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export const STYLES = ["outlined", "rounded", "sharp"] as const;
export type IconStyle = (typeof STYLES)[number];

interface IconMeta {
  name: string;
  popularity: number;
  categories: string[];
  tags: string[];
}

let cache: IconMeta[] | undefined;

async function fetchWithTimeout(url: string, ms = 20_000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms), headers: { "User-Agent": "design-agent" } });
}

export async function loadMetadata(): Promise<IconMeta[]> {
  if (cache) return cache;
  mkdirSync(ICON_DIR, { recursive: true });
  const fresh = existsSync(META_FILE) && Date.now() - statSync(META_FILE).mtimeMs < META_MAX_AGE_MS;
  if (!fresh) {
    try {
      const raw = await (await fetchWithTimeout(METADATA_URL, 30_000)).text();
      const data = JSON.parse(raw.slice(raw.indexOf("{"))) as { icons: (IconMeta & { unsupported_families?: string[] })[] };
      const icons = data.icons
        .filter((i) => !(i.unsupported_families ?? []).some((f) => f.startsWith("Material Symbols")))
        .map(({ name, popularity, categories, tags }) => ({ name, popularity, categories, tags }));
      writeFileSync(META_FILE, JSON.stringify(icons));
    } catch (e) {
      if (!existsSync(META_FILE)) throw new Error(`Could not download the icon list: ${(e as Error).message}`);
      // fall back to the stale copy
    }
  }
  cache = JSON.parse(readFileSync(META_FILE, "utf8")) as IconMeta[];
  return cache;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Rank icons by name and tag matches, then popularity. */
export async function searchIcons(query: string, limit = 12) {
  const icons = await loadMetadata();
  const q = words(query);
  if (!q.length) return [];
  const maxPop = Math.max(...icons.map((i) => i.popularity || 0), 1);
  return icons
    .map((i) => {
      const nameWords = words(i.name);
      const tags = new Set(i.tags.flatMap(words));
      let score = 0;
      for (const w of q) {
        if (i.name === q.join("_")) score += 10;
        if (nameWords.includes(w)) score += 4;
        else if (i.name.includes(w)) score += 2;
        if (tags.has(w)) score += 1.5;
        else if ([...tags].some((t) => t.startsWith(w))) score += 0.5;
      }
      return { i, score: score ? score + (i.popularity / maxPop) * 1.5 : 0 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ i }) => ({ name: i.name, categories: i.categories, tags: i.tags.slice(0, 6) }));
}

export async function iconSvg(name: string, style: IconStyle = "outlined", filled = false): Promise<string> {
  if (!/^[a-z0-9_]{1,64}$/.test(name)) throw new Error(`Invalid icon name "${name}" (use names like "home", "arrow_back").`);
  const dir = join(ICON_DIR, style);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}${filled ? "-fill" : ""}.svg`);
  if (existsSync(file)) return readFileSync(file, "utf8");
  const url = `${CDN}/materialsymbols${style}/${name}/${filled ? "fill1" : "default"}/24px.svg`;
  const res = await fetchWithTimeout(url);
  if (res.status === 404) throw new Error(`No Material Symbol named "${name}". Use icon_search to find the right name.`);
  if (!res.ok) throw new Error(`Icon download failed (HTTP ${res.status}) for "${name}"`);
  const svg = (await res.text()).trim();
  if (!svg.startsWith("<svg")) throw new Error(`Unexpected response for "${name}"`);
  writeFileSync(file, svg);
  return svg;
}
