/**
 * SidePanel.tsx
 * Primary navigation drawer (Library, Playlists, Discovery).
 * - Redesigned with premium glassmorphism, capsule items, and active glow.
 * - Displays a live dancing waveform next to the header when music is playing.
 */

import React, { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/lib/state/useUIStore";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import SearchBar from "@/components/layout/SearchBar";
import { Icon } from "@/lib/utils/IconRegistry";
import styles from "./SidePanel.module.css";

const SidePanel: React.FC = () => {
  const isOpen = useUIStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useUIStore((s) => s.toggleSidePanel);
  const mainView = useUIStore((s) => s.mainView);
  const setMainView = useUIStore((s) => s.setMainView);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem("eh-sidepanel-collapsed");
    return stored === "true";
  });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const widthPresets = ["160px", "260px", "360px"];
  const [widthIndex, setWidthIndex] = useState(() => {
    const stored = localStorage.getItem("eh-sidepanel-width-index");
    return stored ? Number(stored) : 1; // default to M (260px)
  });
  
  const setSearchQuery = useSettingsStore((s) => s.setSearchQuery);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      localStorage.setItem("eh-sidepanel-collapsed", String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = "width 0.25s cubic-bezier(.4,0,.2,1)";
    el.style.overflow = "hidden";
    el.style.width = isCollapsed ? "48px" : widthPresets[widthIndex] || "260px";
    if (!isCollapsed) {
      localStorage.setItem("eh-sidepanel-width-index", String(widthIndex));
    }
  }, [isCollapsed, widthIndex]);

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
      <div ref={panelRef} className={styles.sidepanel_collapsed}>
        <button
          type="button"
          className={styles.collapse_toggle}
          onClick={toggleCollapse}
          aria-label="Expand sidepanel"
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
      className={styles.sidepanel}
      data-open={isOpen ? "true" : "false"}
      data-state={isOpen ? "open" : "closed"}
      aria-label="Primary navigation"
      aria-hidden={!isOpen ? "true" : "false"}
    >
      <div className={styles.sidepanel__header}>
        <div className={styles.sidepanel__brand}>
          <span className={styles.sidepanel__label}>Ethereal</span>
          
          {/* Active audio waveform next to Brand name */}
          <div 
            className={styles.eh_waveform} 
            data-playing={isPlaying ? "true" : "false"}
            title={isPlaying ? "Playing audio" : "Paused"}
            aria-hidden="true"
          >
            <span className={styles.eh_waveform__bar} />
            <span className={styles.eh_waveform__bar} />
            <span className={styles.eh_waveform__bar} />
            <span className={styles.eh_waveform__bar} />
            <span className={styles.eh_waveform__bar} />
          </div>
        </div>
        <button
          type="button"
          className={styles.sidepanel__toggle}
          aria-label="Hide sidepanel"
          onClick={toggleCollapse}
        >
          <Icon name="chevronLeft" aria-hidden={true} />
        </button>
      </div>
      <nav className={styles.sidepanel__nav}>
        <div className={styles.sidepanel__search} role="search" aria-label="Library search">
          <SearchBar onSubmit={setSearchQuery} />
        </div>
        <ul className={styles.navlist} role="list">
          <li>
            <button
              className={`${styles.navitem} ${mainView === "library" ? styles.navitem_active : ""}`}
              onClick={() => setMainView("library")}
              aria-current={mainView === "library" ? "page" : undefined}
            >
              <span className={styles.navitem__icon} aria-hidden="true">
                <Icon name="library" aria-hidden={true} />
              </span>
              <span className={styles.navitem__label}>Library</span>
            </button>
          </li>
          <li>
            <button
              className={`${styles.navitem} ${mainView === "playlists" ? styles.navitem_active : ""}`}
              onClick={() => setMainView("playlists")}
              aria-current={mainView === "playlists" ? "page" : undefined}
            >
              <span className={styles.navitem__icon} aria-hidden="true">
                <Icon name="playlists" aria-hidden={true} />
              </span>
              <span className={styles.navitem__label}>Playlists</span>
            </button>
          </li>
          <li>
            <button
              className={`${styles.navitem} ${mainView === "discovery" ? styles.navitem_active : ""}`}
              onClick={() => setMainView("discovery")}
              aria-current={mainView === "discovery" ? "page" : undefined}
            >
              <span className={styles.navitem__icon} aria-hidden="true">
                <Icon name="discovery" aria-hidden={true} />
              </span>
              <span className={styles.navitem__label}>Discovery</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default SidePanel;
