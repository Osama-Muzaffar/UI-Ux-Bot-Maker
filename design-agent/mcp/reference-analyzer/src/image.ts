import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

export type Format = "png" | "jpg" | "webp" | "unknown";

export function sniffFormat(buf: Buffer): Format {
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "unknown";
}

interface Pixels {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

export function decode(file: string): Pixels | undefined {
  const buf = readFileSync(file);
  const f = sniffFormat(buf);
  if (f === "png") {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  if (f === "jpg") {
    const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 256 });
    return { width: j.width, height: j.height, data: j.data };
  }
  return undefined;
}

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

function luminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export interface StyleStats {
  width: number;
  height: number;
  palette: { hex: string; share: number }[]; // most common colors, merged
  background: string;
  theme: "light" | "dark";
  accents: string[]; // saturated colors that are not the background
  whitespace: number; // share of pixels ≈ background
  density: "airy" | "balanced" | "compact";
}

/** Quantize to 4 bits/channel, merge near colors, report palette, background, accents and density. */
export function analyzePixels(px: Pixels): StyleStats {
  const step = Math.max(1, Math.floor(Math.sqrt((px.width * px.height) / 60000))); // ~60k samples
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let y = 0; y < px.height; y += step) {
    for (let x = 0; x < px.width; x += step) {
      const i = (y * px.width + x) * 4;
      if (px.data[i + 3] < 128) continue;
      const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
      total++;
    }
  }
  const colors = [...buckets.values()]
    .map((e) => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, n: e.n }))
    .sort((a, b) => b.n - a.n);

  const merged: { r: number; g: number; b: number; n: number }[] = [];
  for (const c of colors) {
    const near = merged.find((m) => Math.hypot(m.r - c.r, m.g - c.g, m.b - c.b) < 28);
    if (near) {
      const n = near.n + c.n;
      near.r = (near.r * near.n + c.r * c.n) / n;
      near.g = (near.g * near.n + c.g * c.n) / n;
      near.b = (near.b * near.n + c.b * c.n) / n;
      near.n = n;
    } else merged.push({ ...c });
  }
  merged.sort((a, b) => b.n - a.n);

  const bg = merged[0];
  const whitespace = bg ? bg.n / total : 0;
  const accents = merged
    // Accent = clearly colored: saturated, not near-black (saturation is unstable there), not near-white.
    .filter((c) => c !== bg && Math.max(c.r, c.g, c.b) > 60 && Math.min(c.r, c.g, c.b) < 225 && saturation(c.r, c.g, c.b) > 0.35 && c.n / total > 0.003)
    .slice(0, 4)
    .map((c) => toHex(c.r, c.g, c.b));

  return {
    width: px.width,
    height: px.height,
    palette: merged.slice(0, 8).map((c) => ({ hex: toHex(c.r, c.g, c.b), share: Math.round((c.n / total) * 1000) / 10 })),
    background: bg ? toHex(bg.r, bg.g, bg.b) : "#000000",
    theme: bg && luminance(bg.r, bg.g, bg.b) < 0.3 ? "dark" : "light",
    accents,
    whitespace: Math.round(whitespace * 100) / 100,
    density: whitespace > 0.55 ? "airy" : whitespace < 0.35 ? "compact" : "balanced",
  };
}
