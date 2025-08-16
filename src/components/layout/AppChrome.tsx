// src/components/layout/AppChrome.tsx
/**
 * AppChrome
 * -----------------------------------------------------------------------------
 * Purpose
 * - Provides header/footer "chrome" around the core application content.
 * - Hosts DevToggle (perf stats), quick-access icon actions, and keyboard focus
 *   management (FocusRing utilities) for a11y.
 *
 * Design
 * - Glassmorphism surfaces using project tokens/classes (see globals.css/tokens.css).
 * - Keyboard-only focus rings via :focus-visible AND a modality attribute helper.
 * - Fully accessible: landmark roles, skip link, ARIA labels/states, tooltips.
 *
 * Integration points
 * - Reads/writes settings from useSettingsStore (theme, view, showStats, hotkeys).
 * - Uses IconRegistry for consistent, cachable SVG icons.
 * - Emits "eh:viz:stats" via setShowStats() (store dispatches DOM event).
 *
 * Notes
 * - Keep this component dumb: it orchestrates chrome & actions but does not render
 *   the main route content. AppShell/Routes will sit between header/footer.
 * - No external CSS-in-JS; we rely on our global tokens and utility classes.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  useSettingsStore,
  selectTheme,
  selectView,
  selectShowStats,
  selectHotkeysEnabled,
  selectVizPreset,
  selectHdrEnabled,
  selectDimmerEnabled,
  selectDimmerStrength,
} from "@/lib/state/useSettingsStore";
import { setTheme, setView, setShowStats } from "@/lib/state/useSettingsStore";
import type { ThemeMode, AppView } from "@/lib/state/useSettingsStore";
import { Icon } from "@/lib/utils/IconRegistry";

/* ----------------------------------------------------------------------------
 * FocusRing utilities
 * - :focus-visible covers most modern browsers. We add a tiny "modality" helper
 *   to annotate the <html> element with data-modality="keyboard" | "pointer"
 *   so we can gate any future component behaviors (e.g., show focus only if kbd).
 * ------------------------------------------------------------------------- */

function useFocusModality() {
  useEffect(() => {
    const root = document.documentElement;

    const toKeyboard = (e: KeyboardEvent) => {
      // Only consider real navigation keys (Tab/Arrows) to avoid toggling when typing.
      const navKeys = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
      if (!navKeys.has(e.key)) return;
      root.setAttribute("data-modality", "keyboard");
    };

    const toPointer = () => {
      root.setAttribute("data-modality", "pointer");
    };

    // Initialize
    root.setAttribute("data-modality", "pointer");

    window.addEventListener("keydown", toKeyboard, { passive: true });
    window.addEventListener("mousedown", toPointer, { passive: true });
    window.addEventListener("pointerdown", toPointer, { passive: true });
    window.addEventListener("touchstart", toPointer, { passive: true });

    return () => {
      window.removeEventListener("keydown", toKeyboard);
      window.removeEventListener("mousedown", toPointer);
      window.removeEventListener("pointerdown", toPointer);
      window.removeEventListener("touchstart", toPointer);
    };
  }, []);
}

/* ----------------------------------------------------------------------------
 * A11y: Skip link for keyboard users to jump over repeated chrome.
 * - Appears on focus, otherwise visually hidden.
 * ------------------------------------------------------------------------- */

const SkipLink: React.FC<{ targetId?: string }> = ({ targetId = "main-content" }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only"
      onFocus={(e) => {
        // Reveal while focused (CSS-only alternative is fine; here’s a tiny JS nudge)
        (e.currentTarget as HTMLAnchorElement).style.position = "static";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.position = "";
      }}
    >
      Skip to main content
    </a>
  );
};

/* ----------------------------------------------------------------------------
 * DevToggle
 * - Button to toggle perf stats overlay (wired to useSettingsStore.showStats).
 * - Announces state to screen readers via aria-pressed and tooltip text.
 * ------------------------------------------------------------------------- */

const DevToggle: React.FC = () => {
  const showStats = useSettingsStore(selectShowStats);
  const buttonId = useId();

  return (
    <button
      id={buttonId}
      type="button"
      className="eh-btn eh-iconbtn"
      aria-pressed={showStats}
      aria-label={showStats ? "Hide performance overlay" : "Show performance overlay"}
      onClick={() => setShowStats(!showStats)}
      title={showStats ? "Hide FPS (Alt+S)" : "Show FPS (Alt+S)"}
    >
      {/* Icon name should exist in IconRegistry; "bar-chart" is a common alias */}
      <Icon name="bar-chart" aria-hidden="true" />
    </button>
  );
};

/* ----------------------------------------------------------------------------
 * ThemeToggle
 * - Cycles between "dark" and "system" (we only ship dark/system in V1).
 * - Instant DOM theme class reflection handled by store side-effects.
 * ------------------------------------------------------------------------- */

const ThemeToggle: React.FC = () => {
  const theme = useSettingsStore(selectTheme);
  const isDark = theme === "dark";
  const next: ThemeMode = isDark ? "system" : "dark";

  return (
    <button
      type="button"
      className="eh-btn eh-iconbtn"
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to system theme" : "Switch to dark theme"}
      onClick={() => setTheme(next)}
      title={isDark ? "System theme" : "Dark theme"}
    >
      {/* Common names: moon (dark), desktop (system) */}
      <Icon name={isDark ? "moon" : "desktop"} aria-hidden="true" />
    </button>
  );
};

/* ----------------------------------------------------------------------------
 * HotkeysToggle
 * - Toggle global keyboard shortcuts on/off (for users who prefer none).
 * ------------------------------------------------------------------------- */

const HotkeysToggle: React.FC = () => {
  const hotkeysEnabled = useSettingsStore(selectHotkeysEnabled);
  const setHotkeysEnabled = useSettingsStore((s) => s.setHotkeysEnabled);

  return (
    <button
      type="button"
      className="eh-btn eh-iconbtn"
      aria-pressed={hotkeysEnabled}
      aria-label={hotkeysEnabled ? "Disable keyboard shortcuts" : "Enable keyboard shortcuts"}
      onClick={() => setHotkeysEnabled(!hotkeysEnabled)}
      title={hotkeysEnabled ? "Hotkeys on (toggle)" : "Hotkeys off (toggle)"}
    >
      <Icon name="keyboard" aria-hidden="true" />
    </button>
  );
};

/* ----------------------------------------------------------------------------
 * ViewSwitch
 * - Quickly jump between primary views (player, settings).
 * - Uses store-driven router (no external routing library in V1).
 * ------------------------------------------------------------------------- */

const ViewSwitch: React.FC = () => {
  const view = useSettingsStore(selectView);
  const goPlayer = () => setView("player");
  const goSettings = () => setView("settings");

  return (
    <div className="eh-hstack" role="group" aria-label="Primary views">
      <button
        type="button"
        className="eh-btn eh-iconbtn"
        aria-pressed={view === "player"}
        aria-label="Go to Player"
        title="Player"
        onClick={goPlayer}
      >
        <Icon name="home" aria-hidden="true" />
      </button>

      <button
        type="button"
        className="eh-btn eh-iconbtn"
        aria-pressed={view === "settings"}
        aria-label="Go to Settings"
        title="Settings"
        onClick={goSettings}
      >
        <Icon name="settings" aria-hidden="true" />
      </button>
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * Header
 * - Brand area + quick actions aligned right.
 * - Uses glass surface; height is governed by --eh-topbar-h.
 * ------------------------------------------------------------------------- */

const HeaderChrome: React.FC = () => {
  return (
    <header
      className="eh-glass"
      role="banner"
      style={{
        // Keep inline styles minimal; we rely on tokens for most styling.
        height: "var(--eh-topbar-h)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        paddingInline: "var(--eh-gap-lg)",
        gap: "var(--eh-gap-lg)",
      }}
    >
      <div className="eh-hstack" aria-label="Brand">
        {/* Brand indicator dot (Radiant Aqua) + Title */}
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "var(--eh-highlight)",
            boxShadow: "0 0 16px rgba(0,240,255,0.5)",
          }}
        />
        <h1 className="eh-title" style={{ fontSize: "var(--eh-fs-lg)", margin: 0 }}>
          Ethereal Harmony
        </h1>
      </div>

      {/* Quick actions: view switch, dev toggle, hotkeys, theme */}
      <nav aria-label="Quick actions">
        <div className="eh-hstack">
          <ViewSwitch />
          <DevToggle />
          <HotkeysToggle />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
};

/* ----------------------------------------------------------------------------
 * Footer
 * - Subtle status bar: current viz preset and visual flags (HDR/Dimmer).
 * - Keep compact to avoid stealing vertical real estate.
 * ------------------------------------------------------------------------- */

const FooterChrome: React.FC = () => {
  const preset = useSettingsStore(selectVizPreset);
  const hdr = useSettingsStore(selectHdrEnabled);
  const dimmer = useSettingsStore(selectDimmerEnabled);
  const dimmerStrength = useSettingsStore(selectDimmerStrength);

  const status = useMemo(() => {
    const bits: string[] = [`Preset: ${preset}`];
    if (hdr) bits.push("HDR");
    if (dimmer) bits.push(`Dimmer ${Math.round(dimmerStrength * 100)}%`);
    return bits.join(" • ");
  }, [preset, hdr, dimmer, dimmerStrength]);

  return (
    <footer
      className="eh-glass"
      role="contentinfo"
      style={{
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--eh-gap-md)",
        padding: "6px var(--eh-gap-lg)",
        marginTop: "var(--eh-gap-lg)",
      }}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: "var(--eh-fs-sm)", color: "var(--eh-text-muted)" }}
      >
        {status}
      </div>

      {/* Room for small right-aligned affordances (e.g., help/about) */}
      <div className="eh-hstack" aria-label="Footer actions">
        <a href="https://example.com/docs" target="_blank" rel="noreferrer" title="Docs">
          <span className="sr-only">Open documentation</span>
          <Icon name="book-open" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
};

/* ----------------------------------------------------------------------------
 * AppChrome (default export)
 * - Renders SkipLink + HeaderChrome + slot for children + FooterChrome.
 * - Applies focus modality helpers for a11y polish.
 * ------------------------------------------------------------------------- */

export interface AppChromeProps {
  /** The main application content; ensure it renders an element with id="main-content". */
  children?: React.ReactNode;
  /** Optionally override the main landmark id used by the skip link. */
  mainId?: string;
  /** Optional className for the wrapper (useful when composing in AppShell). */
  className?: string;
}

const AppChrome: React.FC<AppChromeProps> = ({ children, mainId = "main-content", className }) => {
  useFocusModality();

  // Ensure the main content has a landmark and an id for skip link.
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Ensure role="main" is present for a11y tools (SSR-safe).
    if (!el.getAttribute("role")) el.setAttribute("role", "main");
    // Ensure id matches skip link target
    if (el.id !== mainId) el.id = mainId;
  }, [mainId]);

  return (
    <div
      className={className}
      style={{
        minHeight: "100%",
        display: "grid",
        gridTemplateRows: "var(--eh-topbar-h) 1fr auto",
        gap: "var(--eh-gap-lg)",
      }}
    >
      {/* Skip to content link for keyboard users (appears on focus). */}
      <SkipLink targetId={mainId} />

      {/* Header chrome */}
      <HeaderChrome />

      {/* Main application content slot.
          - The parent (AppShell) should render routes inside this slot,
            or you can directly pass children when composing locally. */}
      <section ref={mainRef as any} />

      {/* Render children into the main slot if provided. */}
      {children}

      {/* Footer chrome */}
      <FooterChrome />
    </div>
  );
};

export default AppChrome;
