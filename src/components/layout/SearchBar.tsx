import React from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./SearchBar.module.css";
import { Icon } from "@/lib/utils/IconRegistry";

/**
 * SearchBar
 * - Default: compact width, expands on focus/typing
 * - <= sm screens: icon-only button; opens modal overlay
 * - Keyboard: Ctrl/Cmd+K to focus/open
 * - A11y: proper labeling, roles, aria-expanded on container
 */
type SearchBarProps = {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  /** If you already have a global store modal, pass controlled props; otherwise this self-manages */
  useModalOnSmall?: boolean;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search library…",
  onSubmit,
  className,
  useModalOnSmall = true,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchQuery = useSettingsStore((s) => s.searchQuery || "");
  const setSearchQuery = useSettingsStore((s) => s.setSearchQuery);
  const [value, setValue] = React.useState(searchQuery);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isSmall, setIsSmall] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  // Responsive breakpoint (match our small layout)
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsSmall("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handle(mql);
  mql.addEventListener?.("change", handle);
  return () => mql.removeEventListener?.("change", handle);
  }, []);

  // Ctrl/Cmd+K opens/focuses search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key.toLowerCase() === "k")) {
        e.preventDefault();
        if (useModalOnSmall && isSmall) {
          setModalOpen(true);
          return;
        }
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSmall, useModalOnSmall]);

  // Debounce search input and update store
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(value);
    }, 250);
    return () => clearTimeout(handler);
  }, [value, setSearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(value.trim());
    onSubmit?.(value.trim());
  };

  // Small-screen entry point: icon that triggers modal
  if (useModalOnSmall && isSmall) {
    return (
      <>
        <button
          type="button"
          className={`${styles.iconBtn} eh-glass`}
          aria-label="Open search"
          aria-haspopup="dialog"
          aria-expanded={!!modalOpen}
          onClick={() => setModalOpen(true)}
        >
          <Icon name="search" aria-hidden={true} />
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              className={styles.modalBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {modalOpen && (
            <motion.dialog
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className={`${styles.modal} eh-glass glass-surface`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClose={() => setModalOpen(false)}
              open
            >
              <form className={styles.form} onSubmit={handleSubmit}>
                <span className={styles.leadingIcon} aria-hidden="true">
                  <Icon name="search" />
                </span>

                <input
                  ref={inputRef}
                  type="search"
                  className={styles.input}
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                  aria-label="Search library"
                />

                <button
                  type="button"
                  className={styles.trailingBtn}
                  onClick={() => {
                    setValue("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <Icon name="x" aria-hidden={true} />
                </button>

                <button type="submit" className={styles.submitBtn} aria-label="Run search">
                  <Icon name="enter" aria-hidden={true} />
                </button>
              </form>

              <div className={styles.helpRow}>
                <span><kbd>↑↓</kbd> navigate</span>
                <span><kbd>Enter</kbd> open</span>
                <span><kbd>Esc</kbd> close</span>
              </div>

              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
                aria-label="Close search"
              >
                <Icon name="x" aria-hidden={true} />
              </button>
            </motion.dialog>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Keep input in sync with store (if changed externally)
  React.useEffect(() => {
    if (searchQuery !== value) setValue(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Desktop / large layout: compact → expands on focus or when typing
  const expanded = isFocused || value.length > 0;

  return (
    <form
      role="search"
      aria-label="Search library"
      className={[
        styles.searchShell,
        "eh-glass glass-surface",
        expanded ? styles.expanded : styles.compact,
        className ?? "",
      ].join(" ")}
      data-state={expanded ? "expanded" : "compact"}
      onSubmit={handleSubmit}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // collapse only if focus leaves the whole shell
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
    >
      <span className={styles.leadingIcon} aria-hidden="true">
        <Icon name="search" />
      </span>

      <input
        ref={inputRef}
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search library"
      />

      <div className={styles.trailing}>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          aria-disabled={value.length === 0}
          disabled={value.length === 0}
        >
          <Icon name="x" aria-hidden={true} />
        </button>
        <kbd className={styles.kbd}>⌘K</kbd>
      </div>
    </form>
  );
};

export default SearchBar;
