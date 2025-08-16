// src/components/layout/TopBar.tsx
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/utils/IconRegistry";
import { motion } from "framer-motion";

type TopBarProps = {
  onSearchChange?: (q: string) => void;
  onOpenSettings?: () => void;
};

const DEBOUNCE_MS = 250;

/**
 * TopBar
 * - Left: brand icon + title + neutral silhouette
 * - Center: debounced search
 * - Right: settings button
 * A11y: labels, focus order, keyboard shortcut for search (/)
 */
const TopBar: React.FC<TopBarProps> = ({ onSearchChange, onOpenSettings }) => {
  const [query, setQuery] = useState("");
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounce external search updates
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onSearchChange?.(query.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, onSearchChange]);

  // Press "/" to focus search unless typing in an input already
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (target as any)?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOpenSettings = () => {
    onOpenSettings?.();
  };

  return (
    <header
      className="topbar eh-glass glass-surface"
      role="banner"
      aria-label="Application top bar"
    >
      {/* Left: brand + silhouette */}
      <div className="topbar__left" aria-label="Brand">
        <span className="brandmark" aria-hidden>
          <Icon name="app" width={18} height={18} />
        </span>
        <h1 className="topbar__title">Ethereal Harmony</h1>
        {/* Neutral silhouette: always shown per blueprint */}
        <div
          className="topbar__silhouette"
          role="img"
          aria-label="Profile placeholder"
          title="Coming soon"
        />
      </div>

      {/* Center: search */}
      <div className="topbar__center">
        <label htmlFor="eh-search" className="sr-only">
          Search library
        </label>
        <input
          ref={inputRef}
          id="eh-search"
          className="topbar__search input-glass"
          type="search"
          inputMode="search"
          placeholder="Search…"
          aria-placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Optional inline icon for visual affordance; purely decorative */}
        <span className="topbar__searchIcon" aria-hidden>
          <Icon name="search" width={16} height={16} />
        </span>
      </div>

      {/* Right: settings */}
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
