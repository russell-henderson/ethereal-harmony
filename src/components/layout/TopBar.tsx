/**
 * TopBar.tsx
 * Global header: brand slot (logomark + neutral silhouette), Search (center),
 * and Settings (right). Contains the single global toggle for the SidePanel.
 */

import React, { useState } from "react";
import { useUIStore } from "@/lib/state/useUIStore";
import Icon from "@/lib/utils/IconRegistry";
import SearchBar from "@/components/layout/SearchBar";

export const TopBar: React.FC = () => {
  const isOpen = useUIStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useUIStore((s) => s.toggleSidePanel);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Optional: wire to library filtering when that store lands.
  const handleSearch = (q: string) => {
    // TODO: integrate with library filter action (e.g., useLibraryStore.getState().setQuery(q))
    // For now, this is a no-op to keep TopBar decoupled.
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className="topbar-collapsed">
        <button
          type="button"
          className="collapse-toggle"
          onClick={toggleCollapse}
          aria-label="Expand topbar"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="chevronDown" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <header className="topbar eh-glass glass-surface" role="banner">
      {/* Left cluster: global SidePanel toggle + LED indicator */}
      <div className="topbar__left">
        <button
          type="button"
          className="icon-btn"
          aria-label="Toggle navigation"
          aria-expanded={isOpen ? "true" : "false"}
          aria-controls="eh-sidepanel"
          onClick={toggleSidePanel}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="menu" aria-hidden="true" />
        </button>
        
        {/* LED Light Indicator */}
        <div className="led-indicator" style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "var(--eh-aqua)",
          boxShadow: "0 0 10px var(--eh-aqua), 0 0 20px rgba(0,240,255,.6)",
          marginLeft: "8px",
          animation: "pulse 2s ease-in-out infinite alternate"
        }} />
        
        {/* Application Title */}
        <div className="topbar__title">
          <h1 style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--eh-text)",
            margin: 0,
            letterSpacing: "0.5px"
          }}>
            ETHEREAL PLAYER
          </h1>
        </div>
        
        {/* Menu Items */}
        <div className="topbar__menu">
          <span className="menu-item">File</span>
          <span className="menu-item">Edit</span>
          <span className="menu-item">View</span>
          <span className="menu-item">Analyze</span>
          <span className="menu-item">Tools</span>
          <span className="menu-item">Help</span>
        </div>
      </div>

      {/* Center cluster: Empty space for balance */}
      <div className="topbar__center" />

      {/* Right cluster: Search + User Avatar + Settings + Collapse Button */}
      <div className="topbar__right">
        {/* Search moved to right side */}
        <div className="topbar__search" role="search" aria-label="Library search">
          <SearchBar onSearch={handleSearch} />
        </div>
        
        {/* User Avatar - Enhanced glassmorphism */}
        <div className="topbar__user" aria-hidden="true">
          <div className="user-avatar" style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}>
            <Icon name="user" size={20} aria-hidden="true" />
          </div>
        </div>
        
        {/* Settings Icon - Enhanced glassmorphism */}
        <button
          type="button"
          className="icon-btn topbar__settings"
          aria-label="Settings"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="settings" aria-hidden="true" />
        </button>

        {/* Collapse Button */}
        <button
          type="button"
          className="icon-btn collapse-toggle"
          onClick={toggleCollapse}
          aria-label="Collapse topbar"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            backdropFilter: "blur(12px)",
            opacity: 0.75
          }}
        >
          <Icon name="chevronUp" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
