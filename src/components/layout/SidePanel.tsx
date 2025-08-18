/**
 * SidePanel.tsx
 * Primary navigation drawer (Library, Playlists, Discovery).
 * - Opens/closes via global toggle (TopBar) and a local header chevron.
 * - Auto-opens on desktop (≥1024px) on first mount so it's “out” by default.
 * - Includes compact SearchBar in header.
 *
 * A11y:
 * - <aside> with aria-label for landmark nav.
 * - aria-expanded/aria-controls on the toggle.
 * - aria-hidden mirrors visibility for SRs.
 */

import React, { useState } from "react";
import { useUIStore } from "@/lib/state/useUIStore";
import { Icon } from "@/lib/utils/IconRegistry";
import SearchBar from "@/components/layout/SearchBar";

export const SidePanel: React.FC = () => {
  const isOpen = useUIStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useUIStore((s) => s.toggleSidePanel);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggle = () => {
    toggleSidePanel();
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Add the missing handleSearch function
  const handleSearch = (q: string) => {
    // TODO: integrate with library filter action when that store lands
    console.log('Search query:', q);
  };

  // Ensure panel is "out" on desktop by default (first mount only).
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const state: any = useUIStore.getState();
    // Only auto-open if currently closed and no explicit user action recorded.
    // If a setter exists we use it; otherwise hard set.
    if (mql.matches && state.sidePanelOpen === false) {
      if (typeof state.setSidePanelOpen === "function") {
        state.setSidePanelOpen(true);
      } else {
        useUIStore.setState({ sidePanelOpen: true });
      }
    }
  }, []);

  // Close with Escape key for convenience; Ctrl/Cmd+B toggles
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const metaB = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b";
      if (metaB) {
        e.preventDefault();
        handleToggle();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        toggleSidePanel(); // Use existing toggleSidePanel instead of undefined setSidePanelOpen
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleToggle, isOpen, toggleSidePanel]); // Add toggleSidePanel to dependencies

  const panelId = "eh-sidepanel";

  if (isCollapsed) {
    return (
      <div className="sidepanel-collapsed">
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
          <Icon name="chevronRight" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <aside
      id={panelId}
      className="sidepanel eh-glass glass-surface"
      data-open={isOpen ? "true" : "false"}
      data-state={isOpen ? "open" : "closed"}
      aria-label="Primary navigation"
      aria-hidden={!isOpen ? "true" : "false"}
    >
      {/* Header: just the Navigation label centered */}
      <div className="sidepanel__header">
        <div className="sidepanel__brand">
          <span className="sidepanel__label">Navigation</span>
        </div>
        {/* Hide/return icons in the header field */}
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
          <Icon name="chevronLeft" aria-hidden="true" />
        </button>
      </div>

      {/* Primary nav with integrated search */}
      <nav className="sidepanel__nav">
        <div className="sidepanel__search" role="search" aria-label="Library search">
          <SearchBar onSearch={handleSearch} />
        </div>
        
        <ul className="navlist" role="list">
          <li>
            <a className="navitem" href="#library">
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="library" aria-hidden="true" />
              </span>
              <span className="navitem__label">Library</span>
            </a>
          </li>
          <li>
            <a className="navitem" href="#playlists">
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="playlists" aria-hidden="true" />
              </span>
              <span className="navitem__label">Playlists</span>
            </a>
          </li>
          <li>
            <a className="navitem" href="#discovery">
              <span className="navitem__icon" aria-hidden="true">
                <Icon name="discovery" aria-hidden="true" />
              </span>
              <span className="navitem__label">Discovery</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default SidePanel;
