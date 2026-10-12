import { useEffect, useState } from "react";

/** Colours read from the page's CSS tokens, so 3D scenes follow light and dark mode. */
export type Palette = { ink: string; muted: string; paper: string; surface: string; rule: string; settled: string; owes: string; dark: boolean };

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: token("--lp-ink", "#111111"),
    muted: token("--lp-muted", "#6B6A64"),
    paper: token("--lp-paper", "#FAFAF7"),
    surface: token("--lp-surface", "#FFFFFF"),
    rule: token("--lp-rule", "#E6E4DD"),
    settled: token("--lp-settled", "#1F7A5A"),
    owes: token("--lp-owes", "#B54708"),
    dark: document.documentElement.classList.contains("dark"),
  };
}

export function usePalette() {
  const [palette, setPalette] = useState(readPalette);
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return palette;
}
