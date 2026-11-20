import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { refDir, slugify, writeJson, type ReferenceMeta } from "./store.js";
import { sniffFormat } from "./image.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_SCREENSHOTS = 8;

async function get(url: string, timeoutMs = 20_000): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    throw new Error(`${(e as Error).message}${cause ? ` (${cause.code ?? cause.message})` : ""}`);
  }
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res;
}

/** Run tasks with limited concurrency (Play's image CDN drops bursts of parallel downloads). */
async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function meta(html: string, key: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decode(content).trim() : undefined;
}

function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const v = JSON.parse(m[1]);
      out.push(...(Array.isArray(v) ? v : [v]));
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out;
}

export function parsePlayStoreId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname !== "play.google.com") return undefined;
    return u.searchParams.get("id") || undefined;
  } catch {
    return undefined;
  }
}

/** Play Store screenshot <img> tags carry alt="Screenshot image"; their URLs take a size suffix. */
export function extractPlayScreenshots(html: string): string[] {
  const urls: string[] = [];
  for (const tag of html.match(/<img[^>]+>/gi) ?? []) {
    if (!/alt=["'][^"']*screenshot/i.test(tag)) continue;
    const src = tag.match(/(?:src|data-src)=["'](https:\/\/play-lh\.googleusercontent\.com\/[^"'\s]+)["']/i)?.[1];
    if (!src) continue;
    // Strip the size/format suffix and request a ~540px PNG/JPEG (no "-rw" → not WebP).
    const base = decode(src).replace(/=[^/]*$/, "");
    const full = `${base}=w540`;
    if (!urls.includes(full)) urls.push(full);
  }
  return urls.slice(0, MAX_SCREENSHOTS);
}

async function download(url: string, dir: string, index: number) {
  let buf: Buffer;
  try {
    buf = Buffer.from(await (await get(url, 45_000)).arrayBuffer());
  } catch {
    buf = Buffer.from(await (await get(url, 45_000)).arrayBuffer()); // one retry
  }
  const format = sniffFormat(buf);
  const file = join(dir, `screen-${String(index + 1).padStart(2, "0")}.${format === "unknown" ? "bin" : format}`);
  writeFileSync(file, buf);
  return { file, sourceUrl: url, format };
}

export async function fetchReference(url: string, slugOverride?: string): Promise<ReferenceMeta> {
  const playId = parsePlayStoreId(url);
  const notes: string[] = [];

  if (playId) {
    const pageUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(playId)}&hl=en&gl=US`;
    const html = await (await get(pageUrl)).text();
    const ld = jsonLd(html).find((x) => x["@type"] === "SoftwareApplication");
    const name =
      (ld?.name as string | undefined) || meta(html, "og:title")?.replace(/ - Apps on Google Play$/, "") || playId;
    const slug = slugOverride || slugify(name);
    const dir = refDir(slug);
    const shotUrls = extractPlayScreenshots(html);
    if (!shotUrls.length) notes.push("No screenshots found on the Play Store page (layout may have changed).");
    const settled = await pool(shotUrls, 3, (u, i) => download(u, dir, i));
    const screenshots = settled.flatMap((r, i) => {
      if (r.status === "fulfilled") return [r.value];
      notes.push(`Screenshot ${i + 1} failed: ${(r.reason as Error).message}`);
      return [];
    });
    notes.push("Play Store screenshots are often marketing images (device frames, captions) — judge the UI inside them.");
    const result: ReferenceMeta = {
      slug,
      source: "play_store",
      url: pageUrl,
      name,
      category: (ld?.applicationCategory as string | undefined)?.replace(/_/g, " ").toLowerCase(),
      description: meta(html, "og:description") || meta(html, "description"),
      fetchedAt: new Date().toISOString(),
      screenshots,
      notes,
    };
    writeJson(join(dir, "meta.json"), result);
    return result;
  }

  // Website
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http(s) links are supported.");
  const html = await (await get(url)).text();
  const title = meta(html, "og:title") || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const name = title || parsed.hostname;
  const slug = slugOverride || slugify(name);
  const dir = refDir(slug);
  const screenshots = [];
  const ogImage = meta(html, "og:image");
  if (ogImage) {
    try {
      screenshots.push(await download(new URL(ogImage, url).toString(), dir, 0));
    } catch (e) {
      notes.push(`og:image failed: ${(e as Error).message}`);
    }
  }
  notes.push(
    "Websites only give the og:image. For real page screenshots, open the site in a browser tool, save screenshots into this reference folder, then run analyze_screens.",
  );
  const result: ReferenceMeta = {
    slug,
    source: "website",
    url,
    name,
    description: meta(html, "og:description") || meta(html, "description"),
    themeColor: meta(html, "theme-color"),
    fetchedAt: new Date().toISOString(),
    screenshots,
    notes,
  };
  writeJson(join(dir, "meta.json"), result);
  return result;
}
