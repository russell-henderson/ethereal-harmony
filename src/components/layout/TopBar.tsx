// src/components/layout/TopBar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/lib/utils/IconRegistry";
import { useHotkeys } from "@/lib/utils/useHotkeys";
// Store-driven UI (V1): lightweight view switching and modals
import { useUIStore } from "@/lib/state/useUIStore";

/**
 * TopBar
 * -----------------------------------------------------------------------------
 * App header with product title on the left and actions on the right.
 * - Glassmorphism per tokens
 * - Search input (debounced -> store)
 * - Settings button opens Settings modal (store-driven)
 * - Neutral avatar silhouette (future profile)
 * - Keyboard: "/" focuses search, "Ctrl+K" clears + focuses search
 * - WCAG AA: proper labels, focus ring, good contrast on glass
 */

type IconButtonProps = {
  icon: string;
  label: string;
  onClick?: () => void;
};

const IconButton: React.FC<IconButtonProps> = ({ icon, label, onClick }) => {
  return (
    <motion.button
      type="button"
      className="eh-focus"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.9 }}
      style={{
        height: 34,
        width: 38,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(255,255,255,0.12)",
        color: "var(--eh-color-text, #FFFFFF)",
        cursor: "pointer",
      }}
    >
      <Icon name={icon} width={18} height={18} color="currentColor" aria-hidden="true" />
    </motion.button>
  );
};

const TopBar: React.FC = () => {
  // UI store actions (store-driven routing/modal controls)
  // Modal open/close via UI store
  const openSettings = () => useUIStore.getState().openModal("about");

  // Search state (debounced write to store so Library view can filter)
  // No setSearchQuery in UIStore; use local state only

  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // Use Icon component directly

  // Debounce search updates (no-op, no setSearchQuery in store)
  useEffect(() => {
    // Placeholder for future search store integration
  }, [query]);

  // Hotkeys
  useHotkeys({
    enableDefaults: false,
    extra: [
      {
        combo: "/",
        handler: (e: KeyboardEvent) => {
          // Avoid hijacking when typing in inputs
          const el = document.activeElement;
          const isTyping =
            el &&
            (el.tagName === "INPUT" ||
              el.tagName === "TEXTAREA" ||
              (el as HTMLElement).isContentEditable);
          if (isTyping) return;
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        },
      },
      {
        combo: "ctrl+k",
        handler: (e: KeyboardEvent) => {
          e.preventDefault();
          setQuery("");
          searchRef.current?.focus();
        },
      },
    ],
  });

  return (
    <header
      className="eh-glass"
      aria-label="Application header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px",
        position: "sticky",
        top: 0,
        zIndex: 20,
        // Glass tokens
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(16px) saturate(120%)",
        WebkitBackdropFilter: "blur(16px) saturate(120%)",
        border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 16,
        boxShadow:
          "0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      {/* Brand / Title */}
      <div
        className="eh-hstack"
        aria-label="Brand"
        style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
      >
        <div
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background:
              "radial-gradient(42% 42% at 50% 50%, #00F0FF 0%, rgba(0,240,255,0.35) 65%, rgba(0,240,255,0) 100%)",
            boxShadow: "0 0 16px rgba(0,240,255,0.55)",
            flex: "0 0 auto",
          }}
        />
        <h1
          className="eh-title"
          style={{
            margin: 0,
            fontSize: 18,
            fontFamily: 'Montserrat, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            whiteSpace: "nowrap",
          }}
        >
          Ethereal&nbsp;Harmony
        </h1>
      </div>

      {/* Actions */}
      <div
        className="eh-hstack"
        aria-label="Header actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        {/* Search */}
        <div
          role="search"
          aria-label="Search the library"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            minWidth: 200,
            width: "min(38vw, 520px)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 10,
              display: "inline-flex",
              width: 18,
              height: 18,
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.9,
              pointerEvents: "none",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <Icon name="search" width={16} height={16} />
          </span>

          <label htmlFor="eh-search" className="sr-only">
            Search library
          </label>
          <input
            id="eh-search"
            ref={searchRef}
            type="search"
            placeholder="Search library…"
            aria-label="Search library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Styling: glass field with strong contrast and big tap target
            style={{
              width: "100%",
              height: 34,
              padding: "0 10px 0 32px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)",
              color: "var(--eh-color-text, #FFFFFF)",
              outline: "none",
              fontFamily:
                'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
              fontSize: 14,
            }}
            className="eh-focus"
          />
        </div>

        {/* Neutral silhouette avatar */}
        <div
          aria-hidden
          title="Profile"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #1A2B45 0%, #7F6A9F 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.22) inset",
          }}
        />

        {/* Settings */}
        <IconButton
          icon="settings"
          label="Settings"
          onClick={openSettings}
        />

        {/* Keyboard hint */}
        <small
          aria-hidden="true"
          style={{
            marginLeft: 2,
            opacity: 0.85,
            fontFamily:
              'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontSize: 11,
            color: "rgba(255,255,255,0.8)",
            whiteSpace: "nowrap",
          }}
        >
          Press <kbd style={kbdStyle}>/</kbd> to search
        </small>
      </div>
    </header>
  );
};

const kbdStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 6,
  padding: "0 6px",
  fontSize: 11,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  color: "rgba(255,255,255,0.95)",
};

export default TopBar;
