/**
 * export.ts
 *
 * Exports a DOM element as a PNG data URL using html2canvas.
 * html2canvas renders by painting directly to a <canvas> via the browser's
 * own drawing API, reading computed styles (already resolved to rgb/rgba by
 * the browser) so oklch / cross-origin CSS issues do not apply.
 */

import html2canvas from "html2canvas";

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

  // Temporarily hide UI-only elements so they don't appear in the export
  const hidden: Array<{ el: HTMLElement; prev: string }> = [];
  for (const sel of removeSelectors) {
    liveElement.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      hidden.push({ el, prev: el.style.visibility });
      el.style.visibility = "hidden";
    });
  }

  try {
    const canvas = await html2canvas(liveElement, {
      scale: pixelRatio,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      // Capture the full scrollable area, not just the visible viewport
      width: liveElement.scrollWidth,
      height: liveElement.scrollHeight,
      windowWidth: liveElement.scrollWidth,
      windowHeight: liveElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
    return canvas.toDataURL("image/png");
  } finally {
    for (const { el, prev } of hidden) {
      el.style.visibility = prev;
    }
  }
}
