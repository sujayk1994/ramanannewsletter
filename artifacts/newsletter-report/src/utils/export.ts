/**
 * export.ts
 *
 * Exports a DOM element as a PNG data URL using html-to-image.
 *
 * Problems solved:
 *  1. oklch() colors in Tailwind v4 → SVG renderer rejects → blank output.
 *     Fix: patch <style> tags (oklch → rgb via canvas pixel sampling).
 *
 *  2. Chrome clips SVG foreignObject rendering to the current viewport width.
 *     A 1200px report inside an 800px preview pane gets truncated.
 *     Fix: temporarily set document.documentElement.style.minWidth to the
 *     full report width so Chrome "thinks" the viewport is wide enough.
 *
 *  3. overflow-x:auto / height:0 containers clip content before capture.
 *     Fix: flatten them to overflow:visible / height:auto temporarily.
 *
 *  4. Cross-origin font failures → blank SVG.
 *     Fix: skipFonts:true.
 */

import { toPng } from "html-to-image";

// ── oklch → rgb ──────────────────────────────────────────────────────────────

const _cache = new Map<string, string>();

function oklchToRgb(oklchStr: string): string {
  if (_cache.has(oklchStr)) return _cache.get(oklchStr)!;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = oklchStr;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const result =
      a === 255
        ? `rgb(${r},${g},${b})`
        : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
    _cache.set(oklchStr, result);
    return result;
  } catch {
    return oklchStr;
  }
}

type StyleBackup = { el: HTMLStyleElement; original: string };

function patchStylesheets(): StyleBackup[] {
  const backups: StyleBackup[] = [];
  document.querySelectorAll<HTMLStyleElement>("style").forEach((el) => {
    const original = el.textContent ?? "";
    if (!original.includes("oklch")) return;
    backups.push({ el, original });
    el.textContent = original.replace(/oklch\([^)]+\)/g, oklchToRgb);
  });
  return backups;
}

function restoreStylesheets(backups: StyleBackup[]): void {
  backups.forEach(({ el, original }) => (el.textContent = original));
}

// ── overflow flattening ───────────────────────────────────────────────────────

type OverflowBackup = { el: HTMLElement; overflow: string; height: string };

function flattenOverflow(root: HTMLElement): OverflowBackup[] {
  const backups: OverflowBackup[] = [];
  [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach((el) => {
    const cs = getComputedStyle(el);
    const needsOv =
      cs.overflowX === "auto" || cs.overflowX === "hidden" ||
      cs.overflowX === "scroll" || cs.overflowY === "auto" ||
      cs.overflowY === "hidden" || cs.overflowY === "scroll";
    const needsH = el.style.height === "0" || el.style.height === "0px";
    if (!needsOv && !needsH) return;
    backups.push({ el, overflow: el.style.overflow, height: el.style.height });
    if (needsOv) el.style.overflow = "visible";
    if (needsH) el.style.height = "auto";
  });
  return backups;
}

function restoreOverflow(backups: OverflowBackup[]): void {
  backups.forEach(({ el, overflow, height }) => {
    el.style.overflow = overflow;
    el.style.height = height;
  });
}

// ── public API ───────────────────────────────────────────────────────────────

export interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  removeSelectors?: string[];
}

export async function exportReportAsImage(
  liveElement: HTMLElement,
  options: ExportOptions = {}
): Promise<string> {
  const {
    pixelRatio = 2,
    backgroundColor = "#ffffff",
    removeSelectors = [],
  } = options;

  // 1. Flatten overflow/height clipping inside the report
  const overflowBackups = flattenOverflow(liveElement);

  // 2. Expand the HTML root so Chrome's SVG foreignObject viewport matches
  //    the report width (Chrome clips foreignObject to the viewport width)
  await new Promise<void>((res) => requestAnimationFrame(() => res()));
  const width = liveElement.scrollWidth;
  const height = liveElement.scrollHeight;

  const prevDocMinWidth = document.documentElement.style.minWidth;
  const prevDocWidth = document.documentElement.style.width;
  document.documentElement.style.minWidth = `${width}px`;
  document.documentElement.style.width = `${width}px`;

  // Give the browser one more frame to acknowledge the new viewport width
  await new Promise<void>((res) => requestAnimationFrame(() => res()));

  const styleBackups = patchStylesheets();

  try {
    return await toPng(liveElement, {
      pixelRatio,
      backgroundColor,
      skipFonts: true,
      width,
      height,
      filter(node) {
        if (node instanceof Element && removeSelectors.length) {
          for (const sel of removeSelectors) {
            if (node.matches(sel)) return false;
          }
        }
        return true;
      },
    });
  } finally {
    restoreStylesheets(styleBackups);
    restoreOverflow(overflowBackups);
    document.documentElement.style.minWidth = prevDocMinWidth;
    document.documentElement.style.width = prevDocWidth;
  }
}
