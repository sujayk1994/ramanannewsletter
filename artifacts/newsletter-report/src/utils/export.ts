/**
 * export.ts
 *
 * Exports a DOM element as a PNG data URL using html-to-image.
 *
 * Tailwind v4 uses oklch() for all color values. html-to-image embeds raw
 * <style> tags verbatim into its SVG foreignObject, which makes the browser's
 * SVG renderer reject those rules and produce blank output.
 *
 * Fix:
 *  1. Before calling toPng, scan every <style> tag and replace oklch() tokens
 *     with rgb() equivalents (sampled via a 1×1 canvas so the browser's own
 *     color engine does the conversion). Restore the originals in a finally.
 *  2. Call toPng on the LIVE element (not an off-screen clone) so the browser
 *     has already painted it and the capture is non-blank.
 *  3. Use the filter callback to strip UI-only nodes (delete buttons etc.).
 *  4. skipFonts: true avoids cross-origin failures with Google Fonts.
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
    const rgb =
      a === 255
        ? `rgb(${r},${g},${b})`
        : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
    _cache.set(oklchStr, rgb);
    return rgb;
  } catch {
    return oklchStr;
  }
}

// ── stylesheet patch ─────────────────────────────────────────────────────────

type Backup = { el: HTMLStyleElement; original: string };

function patchStylesheets(): Backup[] {
  const backups: Backup[] = [];
  document.querySelectorAll<HTMLStyleElement>("style").forEach((el) => {
    const original = el.textContent ?? "";
    if (!original.includes("oklch")) return;
    backups.push({ el, original });
    el.textContent = original.replace(/oklch\([^)]+\)/g, oklchToRgb);
  });
  return backups;
}

function restoreStylesheets(backups: Backup[]): void {
  backups.forEach(({ el, original }) => (el.textContent = original));
}

// ── public API ───────────────────────────────────────────────────────────────

export interface ExportOptions {
  pixelRatio?: number;
  backgroundColor?: string;
  /** CSS selectors for nodes that should be excluded from the export. */
  removeSelectors?: string[];
}

/**
 * Capture `liveElement` (already rendered in the page) as a PNG data URL.
 * The element is captured in-place — no off-screen clone — so the browser
 * has already painted it and the result is never blank.
 */
export async function exportReportAsImage(
  liveElement: HTMLElement,
  options: ExportOptions = {}
): Promise<string> {
  const {
    pixelRatio = 2,
    backgroundColor = "#ffffff",
    removeSelectors = [],
  } = options;

  // Measure the full scrollable size BEFORE patching stylesheets
  const width = liveElement.scrollWidth;
  const height = liveElement.scrollHeight;

  const backups = patchStylesheets();

  try {
    return await toPng(liveElement, {
      pixelRatio,
      backgroundColor,
      skipFonts: true,
      // Capture the full report width, not just the visible viewport portion
      width,
      height,
      // Exclude UI-only nodes without touching the DOM
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
    restoreStylesheets(backups);
  }
}
