/**
 * export.ts
 *
 * Exports a DOM element as a PNG data URL using html-to-image.
 *
 * Key problems solved:
 *  1. Tailwind v4 uses oklch() colors → SVG renderer rejects them → blank output.
 *     Fix: patch every <style> tag to convert oklch() to rgb() before capture,
 *     restore in a finally block.
 *
 *  2. Overflow / clipped containers (overflow-x:auto, height:0 flex trick)
 *     clip the captured content to the visible viewport area.
 *     Fix: temporarily set overflow:visible and height:auto on every element
 *     whose computed overflow or inline height would clip content.
 *
 *  3. Cross-origin font failures (Google Fonts) produce blank SVG output.
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

// ── overflow / height flattening ─────────────────────────────────────────────

type OverflowBackup = {
  el: HTMLElement;
  overflowX: string;
  overflowY: string;
  overflow: string;
  height: string;
  maxHeight: string;
};

/**
 * Walk every element inside `root` and flatten any overflow clipping or
 * height:0 tricks so the full content is visible to html-to-image.
 * Returns the backup list needed to restore the original styles.
 */
function flattenOverflow(root: HTMLElement): OverflowBackup[] {
  const backups: OverflowBackup[] = [];
  const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const el of all) {
    const cs = getComputedStyle(el);
    const ovX = cs.overflowX;
    const ovY = cs.overflowY;
    const ov = cs.overflow;
    const needsOverflow =
      ovX === "auto" || ovX === "hidden" || ovX === "scroll" ||
      ovY === "auto" || ovY === "hidden" || ovY === "scroll";

    // height:0 inline style (used for the flex grow trick on the table div)
    const inlineH = el.style.height;
    const needsHeight = inlineH === "0" || inlineH === "0px";

    // max-height that could clip content
    const inlineMH = el.style.maxHeight;
    const cssMH = cs.maxHeight;
    const needsMaxHeight = inlineMH !== "" || (cssMH !== "none" && cssMH !== "" && parseInt(cssMH) < 9999);

    if (!needsOverflow && !needsHeight) continue;

    backups.push({
      el,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      overflow: el.style.overflow,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
    });

    if (needsOverflow) {
      el.style.overflow = "visible";
    }
    if (needsHeight) {
      el.style.height = "auto";
    }
  }

  return backups;
}

function restoreOverflow(backups: OverflowBackup[]): void {
  for (const { el, overflowX, overflowY, overflow, height, maxHeight } of backups) {
    el.style.overflowX = overflowX;
    el.style.overflowY = overflowY;
    el.style.overflow = overflow;
    el.style.height = height;
    el.style.maxHeight = maxHeight;
  }
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

  // Flatten overflow clipping so the full content is visible to html-to-image
  const overflowBackups = flattenOverflow(liveElement);

  // Wait one frame for the browser to reflow after overflow changes
  await new Promise<void>((res) => requestAnimationFrame(() => res()));

  // Now measure full dimensions after reflow
  const width = liveElement.scrollWidth;
  const height = liveElement.scrollHeight;

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
  }
}
