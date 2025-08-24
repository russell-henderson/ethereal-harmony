/**
 * TopBar.tsx
 * Global header: brand slot (logomark + neutral silhouette), Search (center),
 * and Settings (right). Contains the single global toggle for the SidePanel.
 */

import React, { useState, useEffect } from "react";
import Hotkeys from "@/lib/utils/Hotkeys";
import { useUIStore } from "@/lib/state/useUIStore";
import Icon from "@/lib/utils/IconRegistry";
import SearchBar from "@/components/layout/SearchBar";
import MenuBar from "@/components/layout/MenuBar";
import styles from "./TopBar.module.css";

import ProfileModal from "@/components/profile/ProfileModal";
import SettingsModal from "@/components/settings/SettingsModal";

const TopBar: React.FC = () => {
  const isOpen = useUIStore((s) => s.sidePanelOpen);
  const toggleSidePanel = useUIStore((s) => s.toggleSidePanel);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Cmd/Ctrl+, shortcut to open Settings
  useEffect(() => {
    const off = Hotkeys.add(
      (navigator.platform.includes("Mac") ? "meta" : "ctrl") + "+,",
      (e) => {
        setSettingsOpen(true);
      },
      { preventDefault: true, scope: "settings" }
    );
    return () => off();
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <div className={styles["topbar-collapsed"]}>
        <button
          type="button"
          className={styles["collapse-toggle"]}
          onClick={toggleCollapse}
          aria-label="Expand topbar"
        >
          <Icon name="chevronDown" aria-hidden={true} />
        </button>
      </div>
    );
  }

  return (
    <header className={`${styles.topbar} eh-glass glass-surface`} role="banner">
      {/* Left cluster: global SidePanel toggle + LED indicator */}
      <div className={styles.topbar__left}>
        <button
          type="button"
          className={styles["icon-btn"]}
          aria-label="Toggle navigation"
          aria-pressed={isOpen}
          onClick={toggleSidePanel}
        >
          <Icon name="menu" aria-hidden={true} />
        </button>
        {/* LED Light Indicator */}
        <div className={styles["led-indicator"]} />
        {/* Application Title */}
        <div className={styles.topbar__title}>
          <span>ETHEREAL PLAYER</span>
        </div>
        {/* Action MenuBar */}
        <MenuBar />
      </div>

      {/* Center cluster: Empty space for balance */}
      <div className={styles.topbar__center} />

      {/* Right cluster: Search + User Avatar + Settings + Collapse Button */}
      <div className={"topbar__right"}>
        {/* Search moved to right side */}
        <div className={styles.topbar__search} role="search" aria-label="Library search">
          <SearchBar onSubmit={() => {}} />
        </div>
        {/* User Avatar - Enhanced glassmorphism */}
        <div className={styles.topbar__user}>
          <button
            type="button"
            className={styles["user-avatar"]}
            aria-label="Open profile"
            onClick={() => setProfileOpen(true)}
          >
            <Icon name="user" size={20} aria-hidden={true} />
          </button>
        </div>
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        {/* Settings Icon */}
        <button
          type="button"
          className={`${styles["icon-btn"]} topbar__settings`}
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Icon name="settings" aria-hidden={true} />
        </button>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {/* Collapse Button */}
        <button
          type="button"
          className={`${styles["icon-btn"]} ${styles["collapse-toggle"]}`}
          onClick={toggleCollapse}
          aria-label="Collapse topbar"
        >
          <Icon name="chevronUp" aria-hidden={true} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
