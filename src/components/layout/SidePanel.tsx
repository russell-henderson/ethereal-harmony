/**
 * SidePanel.tsx
 * Primary navigation drawer (Library, Playlists, Discovery).
 * - Opens/closes via global toggle (TopBar) and a local header chevron.
 * - Auto-opens on desktop (≥1024px) on first mount so it's “out” by default.
 * - Includes compact SearchBar in header.
 * - Collapse/expand with animation and localStorage persistence.
 * - Shared search with TopBar (useSettingsStore).
 * - Accessible landmark, ARIA, and keyboard shortcuts.
 */

import React, { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/lib/state/useUIStore";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import SearchBar from "@/components/layout/SearchBar";
import { Icon } from "@/lib/utils/IconRegistry";

const SidePanel: React.FC = () => {
  const isOpen = useUIStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useUIStore((s) => s.toggleSidePanel);
  const mainView = useUIStore((s) => s.mainView);
  const setMainView = useUIStore((s) => s.setMainView);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem("eh-sidepanel-collapsed");
    return stored === "true";
  });
  const panelRef = useRef<HTMLDivElement>(null);
  // SidePanel width presets (S/M/L)
  const widthPresets = ["160px", "260px", "360px"];
  const [widthIndex, setWidthIndex] = useState(() => {
    const stored = localStorage.getItem("eh-sidepanel-width-index");
    return stored ? Number(stored) : 1; // default to M (260px)
  });
  const setSearchQuery = useSettingsStore((s) => s.setSearchQuery);

  // Collapse/expand logic with animation and persistence
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      localStorage.setItem("eh-sidepanel-collapsed", String(!prev));
      return !prev;
    });
  };

  // Animate width on collapse/expand
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = "width 0.25s cubic-bezier(.4,0,.2,1)";
    el.style.overflow = "hidden";
    el.style.width = isCollapsed ? "48px" : widthPresets[widthIndex] || "260px";
    // Persist width index
    if (!isCollapsed) {
      localStorage.setItem("eh-sidepanel-width-index", String(widthIndex));
    }
  }, [isCollapsed, widthIndex]);

  // Auto-open on desktop by default (first mount only)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const state: any = useUIStore.getState();
    if (mql.matches && state.sidePanelOpen === false) {
      if (typeof state.setSidePanelOpen === "function") {
        state.setSidePanelOpen(true);
      } else {
        useUIStore.setState({ sidePanelOpen: true });
      }
    }
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+B toggles, Esc closes, [ and ] resize
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const metaB = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b";
      if (metaB) {
        e.preventDefault();
        toggleSidePanel();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        toggleSidePanel();
      } else if (!isCollapsed && (e.key === "[" || e.key === "]")) {
        // Only resize if not collapsed
        e.preventDefault();
        setWidthIndex((prev) => {
          let next = prev;
          if (e.key === "[") next = Math.max(0, prev - 1);
          if (e.key === "]") next = Math.min(widthPresets.length - 1, prev + 1);
          localStorage.setItem("eh-sidepanel-width-index", String(next));
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, toggleSidePanel, isCollapsed, widthPresets.length]);

  const panelId = "eh-sidepanel";

  if (isCollapsed) {
    return (
      <div ref={panelRef} className="sidepanel-collapsed">
        <button
          type="button"
          className="collapse-toggle"
          onClick={toggleCollapse}
          aria-label="Expand sidepanel"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="chevronRight" aria-hidden={true} />
        </button>
      </div>
    );
  }

  return (
    <aside
      ref={panelRef}
      id={panelId}
      className="sidepanel eh-glass glass-surface"
      data-open={isOpen ? "true" : "false"}
      data-state={isOpen ? "open" : "closed"}
      aria-label="Primary navigation"
  aria-hidden={!isOpen ? "true" : "false"}
    >
      <div className="sidepanel__header">
        <div className="sidepanel__brand">
          <span className="sidepanel__label">Navigation</span>
        </div>
        <button
          type="button"
          className="icon-btn sidepanel__toggle"
          aria-label="Hide sidepanel"
          onClick={toggleCollapse}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="chevronLeft" aria-hidden={true} />
        </button>
      </div>
      <nav className="sidepanel__nav">
        <div className="sidepanel__search" role="search" aria-label="Library search">
          <SearchBar onSubmit={setSearchQuery} />
        </div>
        <ul className="navlist" role="list">
          <li>
            <button
              className={`navitem${mainView === "library" ? " is-active" : ""}`}
              onClick={() => setMainView("library")}
              aria-current={mainView === "library" ? "page" : undefined}
            >
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="library" aria-hidden={true} />
              </span>
              <span className="navitem__label">Library</span>
            </button>
          </li>
          <li>
            <button
              className={`navitem${mainView === "playlists" ? " is-active" : ""}`}
              onClick={() => setMainView("playlists")}
              aria-current={mainView === "playlists" ? "page" : undefined}
            >
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="playlists" aria-hidden={true} />
              </span>
              <span className="navitem__label">Playlists</span>
            </button>
          </li>
          <li>
            <button
              className={`navitem${mainView === "discovery" ? " is-active" : ""}`}
              onClick={() => setMainView("discovery")}
              aria-current={mainView === "discovery" ? "page" : undefined}
            >
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="discovery" aria-hidden={true} />
              </span>
              <span className="navitem__label">Discovery</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default SidePanel;

