/**
 * export.ts
 *
 * Clean, self-contained utility for exporting a DOM element as a PNG data URL.
 *
 * Problem solved:
 *   Tailwind CSS v4 uses oklch() color functions. html-to-image (and html2canvas)
 *   cannot parse oklch(), so captures produce blank/white output.
 *
 * Solution (two complementary layers, both needed):
 *   1. INLINE STYLES on the clone  — walk the live element tree in parallel with
 *      the cloned tree, read getComputedStyle() from each live element, convert
 *      any oklch() value to rgb() via a 1×1 canvas pixel read, and write the
 *      rgb() as an inline style on the clone.  Because inline styles have the
 *      highest specificity, html-to-image's own getComputedStyle() pass on the
 *      clone returns rgb() values — no oklch() ever reaches the SVG renderer.
 *
 *   2. STYLESHEET PATCH during capture — html-to-image also copies raw <style>
 *      tags verbatim into the SVG foreignObject.  For the duration of the single
 *      toPng() call the oklch() tokens in those tags are swapped for rgb(), then
 *      restored immediately in a finally block.
 *
 * Guarantees:
 *   • The original DOM is never mutated permanently.
 *   • No UI flicker (clone is fixed off-screen at z-index -1).
 *   • Works for all nested elements including SVG children.
 *   • Gradients containing oklch() have each token converted individually.
 */

import { toPng } from "html-to-image";

// ---------------------------------------------------------------------------
// oklch → rgb conversion
// ---------------------------------------------------------------------------

/** Persistent cache — oklch strings are repeated across thousands of elements. */
const _cache = new Map<string, string>();

/**
 * Convert a single `oklch(...)` token to `rgb()` / `rgba()`.
 *
 * Strategy: assign the value as a canvas fillStyle and read back the pixel.
 * The browser's color engine performs the oklch → sRGB conversion; we simply
 * observe the rendered RGBA bytes.  Results are cached for performance.
 */
export function oklchToRgb(oklchStr: string): string {
  if (_cache.has(oklchStr)) return _cache.get(oklchStr)!;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
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

/**
 * Replace every `oklch(...)` token inside an arbitrary CSS value string.
 * Safe for compound values such as `box-shadow`, `background`, gradients.
 */
function convertOklchInValue(value: string): string {
  if (!value.includes("oklch")) return value;
  return value.replace(/oklch\([^)]+\)/g, oklchToRgb);
}

// ---------------------------------------------------------------------------
// CSS properties that carry color values
// ---------------------------------------------------------------------------

/**
 * The set of CSS properties whose values may contain oklch() tokens.
 * Add more here if a future Tailwind version introduces additional color props.
 */
const COLOR_PROPS: readonly string[] = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
  "caret-color",
  "column-rule-color",
  "accent-color",
  "box-shadow",
  "text-shadow",
];

// ---------------------------------------------------------------------------
// Tree walker
// ---------------------------------------------------------------------------

/**
 * Read computed color styles from `liveEl` (which is already in the document)
 * and write rgb-converted values as inline styles on `cloneEl`.
 *
 * Only properties whose computed value actually contains `oklch` are touched;
 * every other property is left to the clone's stylesheet inheritance.
 *
 * IMPORTANT: this function is called only on the clone, never the original.
 */
function applyConvertedColors(liveEl: Element, cloneEl: Element): void {
  const cs = window.getComputedStyle(liveEl);
  const style = (cloneEl as HTMLElement).style;
  if (!style) return;
  for (const prop of COLOR_PROPS) {
    const val = cs.getPropertyValue(prop);
    if (val && val.includes("oklch")) {
      style.setProperty(prop, convertOklchInValue(val));
    }
  }
}

/**
 * Recursively walk `liveEl` and `cloneEl` in parallel.
 * For each pair of corresponding elements, oklch computed colors on the live
 * element are converted to rgb and applied as inline styles on the clone.
 *
 * No mutation of the original DOM ever occurs.
 */
function walkAndConvertColors(liveEl: Element, cloneEl: Element): void {
  applyConvertedColors(liveEl, cloneEl);
  const liveKids = liveEl.children;
  const cloneKids = cloneEl.children;
  const len = Math.min(liveKids.length, cloneKids.length);
  for (let i = 0; i < len; i++) {
    walkAndConvertColors(liveKids[i], cloneKids[i]);
  }
}

// ---------------------------------------------------------------------------
// Stylesheet patch helpers
// ---------------------------------------------------------------------------

type StyleBackup = { el: HTMLStyleElement; original: string };

function patchStylesheets(): StyleBackup[] {
  const backups: StyleBackup[] = [];
  for (const el of Array.from(
    document.querySelectorAll<HTMLStyleElement>("style")
  )) {
    const original = el.textContent ?? "";
    if (!original.includes("oklch")) continue;
    backups.push({ el, original });
    el.textContent = original.replace(/oklch\([^)]+\)/g, oklchToRgb);
  }
  return backups;
}

function restoreStylesheets(backups: StyleBackup[]): void {
  for (const { el, original } of backups) {
    el.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Device pixel ratio for the output canvas. Default: 2 (retina). */
  pixelRatio?: number;
  /** Background fill colour. Default: "#ffffff". */
  backgroundColor?: string;
  /**
   * CSS selectors for elements that should be removed from the export clone
   * (e.g. edit controls, delete buttons).
   */
  removeSelectors?: string[];
}

/**
 * Export a DOM element as a PNG data URL.
 *
 * The function:
 *   1. Measures the live element's full scroll dimensions.
 *   2. Deep-clones the element and positions it off-screen at full width.
 *   3. Replaces <input> and <textarea> form controls with static text nodes
 *      so their current values appear in the export.
 *   4. Removes any UI-only elements matched by `removeSelectors`.
 *   5. Converts oklch() computed colors to rgb() inline styles on the clone.
 *   6. Briefly patches document <style> tags (restored in finally).
 *   7. Calls html-to-image toPng() on the clone.
 *   8. Cleans up and returns the data URL.
 *
 * @param liveElement  The element currently rendered in the page.
 * @param options      Optional tweaks (see ExportOptions).
 * @returns            A `data:image/png;base64,...` string.
 */
export async function exportReportAsImage(
  liveElement: HTMLElement,
  options: ExportOptions = {}
): Promise<string> {
  const { pixelRatio = 2, backgroundColor = "#ffffff", removeSelectors = [] } =
    options;

  const width = liveElement.scrollWidth;
  const height = liveElement.scrollHeight;

  // ── 1. Deep-clone ──────────────────────────────────────────────────────────
  const clone = liveElement.cloneNode(true) as HTMLElement;

  // Position off-screen at the element's true full width so that html-to-image
  // is not constrained by the browser viewport (the preview pane is narrower
  // than the 1200 px report).
  clone.style.position = "fixed";
  clone.style.top = "-99999px";
  clone.style.left = "0px";
  clone.style.width = `${width}px`;
  clone.style.maxWidth = "none";
  clone.style.overflow = "visible";
  clone.style.zIndex = "-1";

  // ── 2. Replace form controls with static text ──────────────────────────────
  // Capture live values before touching the clone.
  const liveInputs = Array.from(
    liveElement.querySelectorAll<HTMLInputElement>("input[type=text]")
  );
  clone
    .querySelectorAll<HTMLInputElement>("input[type=text]")
    .forEach((inp, i) => {
      const span = document.createElement("span");
      span.textContent = liveInputs[i]?.value ?? inp.value;
      span.className = inp.className;
      span.style.border = "none";
      span.style.outline = "none";
      span.style.display = "inline-block";
      inp.replaceWith(span);
    });

  const liveTAs = Array.from(
    liveElement.querySelectorAll<HTMLTextAreaElement>("textarea")
  );
  clone
    .querySelectorAll<HTMLTextAreaElement>("textarea")
    .forEach((ta, i) => {
      const div = document.createElement("div");
      div.textContent = liveTAs[i]?.value ?? ta.value;
      div.className = ta.className;
      div.style.border = "none";
      div.style.outline = "none";
      ta.replaceWith(div);
    });

  // ── 3. Remove UI-only elements ─────────────────────────────────────────────
  for (const sel of removeSelectors) {
    clone
      .querySelectorAll<HTMLElement>(sel)
      .forEach((el) => el.remove());
  }

  // ── 4. Fix rendering quirks in the clone ──────────────────────────────────
  // SVG pie-chart labels overflow their bounding box intentionally.
  clone
    .querySelectorAll<SVGElement>("svg")
    .forEach((s) => (s.style.overflow = "visible"));

  // Scroll containers would clip table columns; flatten them.
  clone
    .querySelectorAll<HTMLElement>(".overflow-x-auto")
    .forEach((t) => (t.style.overflow = "visible"));

  // ── 5. Convert oklch() → rgb() on all clone elements (Layer 1) ────────────
  // Read getComputedStyle() from the LIVE element (in the DOM), convert any
  // oklch tokens to rgb via canvas pixel sampling, write rgb as inline styles
  // on the CLONE.  Because inline styles override class styles, html-to-image's
  // own getComputedStyle() pass on the clone will see rgb, not oklch.
  walkAndConvertColors(liveElement, clone);

  // Append clone to body so html-to-image can measure it.
  document.body.appendChild(clone);

  // ── 6. Patch <style> tags for the duration of the toPng() call (Layer 2) ──
  // html-to-image copies raw <style> textContent verbatim into the SVG
  // foreignObject.  Swap oklch tokens for rgb tokens now; restore after.
  const styleBackups = patchStylesheets();

  try {
    // ── 7. Capture ────────────────────────────────────────────────────────────
    const dataUrl = await toPng(clone, {
      pixelRatio,
      backgroundColor,
      width,
      height,
    });
    return dataUrl;
  } finally {
    // ── 8. Always restore — even if toPng() throws ────────────────────────────
    restoreStylesheets(styleBackups);
    document.body.removeChild(clone);
  }
}
