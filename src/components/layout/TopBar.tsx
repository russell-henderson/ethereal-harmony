// src/components/layout/TopBar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/utils/IconRegistry";
import { motion } from "framer-motion";
// If you have a search store or handler, import it here:
// import { useUIStore } from "@/lib/state/useUIStore";

type TopBarProps = {
  onSearchChange?: (q: string) => void; // optional external search handler
  onOpenSettings?: () => void;          // optional settings open handler
};

const DEBOUNCE_MS = 250;

/**
 * TopBar
 * - Brand + neutral silhouette (future social hint)
 * - Debounced search input
 * - Settings button
 *
 * A11y: proper labels, focus ring, minimum hit targets.
 * Glassmorphism styling relies on global utility classes per our tokens.
 */
const TopBar: React.FC<TopBarProps> = ({ onSearchChange, onOpenSettings }) => {
  const [query, setQuery] = useState("");
  const debounceRef = useRef<number | null>(null);

  // Debounce search updates
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onSearchChange?.(query.trim());
      // If you wire to a store, do it here:
      // useUIStore.getState().setSearch(query.trim());
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, onSearchChange]);

  const handleOpenSettings = () => {
    // Prefer external handler if provided; you can also wire to a modal store here
    onOpenSettings?.();
    // useUIStore.getState().openSettings();
  };

  return (
    <header
      className="topbar glass-surface"
      role="banner"
      aria-label="Application top bar"
    >
      {/* Left: Brand + silhouette */}
      <div className="topbar__left">
        <span className="brandmark" aria-hidden>
          <Icon name="music" width={18} height={18} />
        </span>
        <h1 className="topbar__title">Ethereal Harmony</h1>

        {/* Neutral silhouette to hint upcoming profiles (always present per blueprint) */}
        <div
          className="topbar__silhouette"
          role="img"
          aria-label="Profile placeholder"
          title="Coming soon"
        />
      </div>

      {/* Center: Search */}
      <div className="topbar__center">
        <label htmlFor="eh-search" className="sr-only">
          Search library
        </label>
        <input
          id="eh-search"
          className="topbar__search input-glass"
          type="search"
          inputMode="search"
          placeholder="Search…"
          aria-placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Right: Settings */}
      <div className="topbar__right">
        <motion.button
          type="button"
          className="glass-btn"
          aria-label="Open settings"
          onClick={handleOpenSettings}
          whileTap={{ scale: 0.96 }}
        >
          <Icon name="settings" width={18} height={18} />
        </motion.button>
      </div>
    </header>
  );
};

export default TopBar;
