import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Data lives outside the plugin folder so plugin updates never wipe lessons or references. */
export const DATA_DIR = process.env.DESIGN_AGENT_HOME || join(homedir(), ".design-agent");
export const REFS_DIR = join(DATA_DIR, "refs");

export function refDir(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) throw new Error(`invalid slug: ${slug}`);
  const dir = join(REFS_DIR, slug);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "reference"
  );
}

export function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export interface ReferenceMeta {
  slug: string;
  source: "play_store" | "website";
  url: string;
  name: string;
  category?: string;
  description?: string;
  themeColor?: string;
  fetchedAt: string;
  screenshots: { file: string; sourceUrl: string; format: string }[];
  notes: string[];
}

export function loadMeta(slug: string): ReferenceMeta {
  const meta = readJson<ReferenceMeta>(join(refDir(slug), "meta.json"));
  if (!meta) throw new Error(`No reference "${slug}". Run fetch_reference first.`);
  return meta;
}
