// src/app/providers/ThemeProvider.tsx
import React, { ReactNode, useEffect, useRef } from "react";
import { useSettingsStore, ThemeMode as Theme, DensityMode as Density } from "@/lib/state/useSettingsStore";

// ------------------------------ DOM Utilities --------------------------------

/**
 * Ensure a <meta name="theme-color"> exists and is updated.
 * Helps Android address bar and some desktop UIs match the current theme.
 */
const ensureAndSetThemeColorMeta = (color: string) => {
  let meta = document.querySelector('meta[name="theme-color"]') as
    | HTMLMetaElement
    | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
};

/**
 * Apply root classes and attributes for theme and density.
 * This is idempotent and safe to call frequently.
 */
const applyRootAppearance = (theme: Theme, density: Density) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const effectiveTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  // Class management
  const cls = new Set((root.className || "").split(/\s+/).filter(Boolean));
  cls.delete("eh-light");
  cls.delete("eh-dark");
  cls.delete("eh-density-comfortable");
  cls.delete("eh-density-compact");

  cls.add(effectiveTheme === "dark" ? "eh-dark" : "eh-light");
  cls.add(density === "compact" ? "eh-density-compact" : "eh-density-comfortable");
  root.className = Array.from(cls).join(" ");

  // data-theme attribute for CSS hooks and testing
  root.setAttribute("data-theme", effectiveTheme);

  // color-scheme helps native form controls adapt
  root.style.colorScheme = effectiveTheme;

  // Browser UI tint (align with brand surfaces for each theme)
  // Using Deep Indigo for dark, Clean White for light to maximize contrast with UI chrome.
  ensureAndSetThemeColorMeta(effectiveTheme === "dark" ? "#1A2B45" : "#FFFFFF");
};

// ------------------------------- Provider ------------------------------------

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useSettingsStore((s) => s.theme);
  const density = useSettingsStore((s) => s.density);

  // Keep a stable reference to the media query to attach/detach listeners correctly.
  const mqlRef = useRef<MediaQueryList | null>(null);

  // Apply theme & density on mount and whenever settings change.
  useEffect(() => {
    applyRootAppearance(theme, density);
  }, [theme, density]);

  // React to OS theme changes when theme === "system".
  useEffect(() => {
    const mql =
      mqlRef.current ??
      window.matchMedia("(prefers-color-scheme: dark)");

    mqlRef.current = mql;

    const handleChange = () => {
      // Only re-apply when following the system.
      if (useSettingsStore.getState().theme === "system") {
        applyRootAppearance("system", useSettingsStore.getState().density);
      }
    };

    // Modern browsers use 'change', older WebKit may require addListener
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
    } else if (typeof (mql as any).addListener === "function") {
      (mql as any).addListener(handleChange);
    }

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", handleChange);
      } else if (typeof (mql as any).removeListener === "function") {
        (mql as any).removeListener(handleChange);
      }
    };
  }, []);

  return <>{children}</>;
};

export default ThemeProvider;
