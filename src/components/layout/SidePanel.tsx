// src/components/layout/SidePanel.tsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { getIcon, type IconKey } from "@/lib/utils/IconRegistry";
// Store-driven routing per blueprint (V1: no React Router)
import { useUIStore } from "@/lib/state/useUIStore";

/**
 * SidePanel
 * -----------------------------------------------------------------------------
 * Primary navigation rail (Library, Playlists, Discovery).
 * - Store-driven routing (no full router in V1).
 * - Glassmorphism styling via `eh-glass` token class.
 * - WCAG AA: high-contrast focus ring, clear aria-current, keyboard friendly.
 * - Motion: subtle press/hover scaled interactions, reduced when user prefers.
 */

type NavKey = "library" | "playlists" | "discovery";

type NavItem = {
  key: NavKey;
  label: string;
  icon: IconKey;          // IconRegistry semantic id
  ariaLabel?: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "library",   label: "Library",   icon: "nav.library",   ariaLabel: "Go to Library" },
  { key: "playlists", label: "Playlists", icon: "nav.playlists", ariaLabel: "Go to Playlists" },
  { key: "discovery", label: "Discovery", icon: "nav.discovery", ariaLabel: "Go to Discovery" },
];

const SideLink: React.FC<{
  item: NavItem;
  active: boolean;
  onSelect: (key: NavKey) => void;
}> = ({ item, active, onSelect }) => {
  const Icon = useMemo(() => getIcon(item.icon), [item.icon]);

  return (
    <motion.button
      type="button"
      className="eh-focus"
      onClick={() => onSelect(item.key)}
      aria-label={item.ariaLabel ?? item.label}
      aria-current={active ? "page" : undefined}
      // Button over anchor to avoid fake href; layout local, colors via CSS vars.
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 12,
        border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
        background: active ? "rgba(255,255,255,0.12)" : "transparent",
        color: "var(--eh-color-text, #FFFFFF)",
        cursor: "pointer",
      }}
      whileHover={{ scale: 0.995 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.9 }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          width: 24,
          height: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon width={20} height={20} color="currentColor" aria-hidden="true" />
      </span>
      <span
        style={{
          fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
          fontSize: 14,
          lineHeight: 1.25,
          letterSpacing: 0.2,
          userSelect: "none",
        }}
      >
        {item.label}
      </span>
    </motion.button>
  );
};

const SidePanel: React.FC = () => {
  const view = useUIStore((s) => s.view as NavKey);
  const setView = useUIStore((s) => s.setView);

  return (
    <nav
      aria-label="Primary"
      aria-orientation="vertical"
      className="eh-glass"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        borderRadius: 16,
      }}
    >
      {/* Panel header / brand silhouette (future profiles; neutral avatar now) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 8px 10px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          marginBottom: 8,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1A2B45 0%, #7F6A9F 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.22) inset",
            flex: "0 0 auto",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'Montserrat, ui-sans-serif, system-ui, "Segoe UI", Roboto',
              fontWeight: 700,
              fontSize: 13,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Ethereal Harmony
          </span>
          <span
            style={{
              fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
            }}
          >
            v1 · Glass UI
          </span>
        </div>
      </div>

      <div role="list" aria-label="Primary sections" style={{ display: "grid", gap: 6 }}>
        {NAV_ITEMS.map((item) => (
          <div role="listitem" key={item.key}>
            <SideLink item={item} active={view === item.key} onSelect={setView} />
          </div>
        ))}
      </div>

      {/* Optional footer actions (Phase 2+) */}
      <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <small
          style={{
            display: "block",
            opacity: 0.9,
            fontFamily: 'Lato, ui-sans-serif, system-ui, "Segoe UI", Roboto',
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            lineHeight: 1.3,
          }}
        >
          Tip: Press <kbd style={kbdStyle}>T</kbd> to cycle themes,{" "}
          <kbd style={kbdStyle}>P</kbd> for presets.
        </small>
      </div>
    </nav>
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

export default SidePanel;
