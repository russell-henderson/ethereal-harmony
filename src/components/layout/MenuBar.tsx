import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { openModal, toggleSidePanel, toggleFps } from "@/lib/state/useUIStore";
import styles from "./MenuBar.module.css";

const menuConfig = [
  {
    label: "File",
    items: [
      { label: "Open Files…", id: "openFiles", action: () => openModal("device-picker") },
      { label: "Open Stream URL…", id: "openStream", action: () => openModal("stream-wizard") },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Toggle Side Panel", id: "toggleSidePanel", action: () => toggleSidePanel() },
      // Visualizer toggle would be added here if available in UI store
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "Stream Test Wizard", id: "streamTest", action: () => openModal("stream-wizard") },
      { label: "Diagnostics Overlay", id: "diagnostics", action: () => toggleFps() },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Export Playlist (M3U/JSON)", id: "exportPlaylist", action: () => openModal("about") }, // Placeholder modal
    ],
  },
  {
    label: "Help",
    items: [
      { label: "What’s New", id: "whatsNew", action: () => openModal("about") },
      { label: "Keyboard Shortcuts", id: "shortcuts", action: () => openModal("hotkeys") },
    ],
  },
];

export const MenuBar: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const menuRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemRefs = useRef<Array<Array<HTMLButtonElement | null>>>([]);

  // Keyboard navigation handlers
  const handleMenuKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight") {
      setOpenMenu((idx + 1) % menuConfig.length);
      menuRefs.current[(idx + 1) % menuConfig.length]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      setOpenMenu((idx - 1 + menuConfig.length) % menuConfig.length);
      menuRefs.current[(idx - 1 + menuConfig.length) % menuConfig.length]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      setOpenMenu(idx);
      itemRefs.current[idx]?.[0]?.focus();
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpenMenu(null);
      menuRefs.current[idx]?.blur();
      e.preventDefault();
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, menuIdx: number, itemIdx: number) => {
    const items = menuConfig[menuIdx].items;
    if (e.key === "ArrowDown") {
      const next = (itemIdx + 1) % items.length;
      itemRefs.current[menuIdx]?.[next]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      const prev = (itemIdx - 1 + items.length) % items.length;
      itemRefs.current[menuIdx]?.[prev]?.focus();
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpenMenu(null);
      menuRefs.current[menuIdx]?.focus();
      e.preventDefault();
    } else if (e.key === "Tab") {
      setOpenMenu(null);
    }
  };

  return (
    <nav className={styles["eh-menubar"]} aria-label="Main menu" role="menubar">
      {menuConfig.map((menu, idx) => (
        <div key={menu.label} className={styles["eh-menu"]} role="presentation">
          <motion.button
            ref={el => { menuRefs.current[idx] = el || null; }}
            className={styles.ehMenuTrigger}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === idx}
            tabIndex={0}
            onClick={() => setOpenMenu(openMenu === idx ? null : idx)}
            onKeyDown={e => handleMenuKeyDown(e, idx)}
            onBlur={() => setTimeout(() => setOpenMenu(null), 100)}
            whileTap={{ scale: 0.95, backgroundColor: "rgba(0,240,255,0.18)" }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            id={`menubar-menu-${idx}`}
            aria-controls={openMenu === idx ? `menubar-list-${idx}` : undefined}
          >
            {menu.label}
          </motion.button>
          <AnimatePresence>
            {openMenu === idx && (
              <motion.div
                className={styles.ehMenuList}
                role="menu"
                id={`menubar-list-${idx}`}
                aria-labelledby={`menubar-menu-${idx}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {menu.items.map((item, itemIdx) => (
                  <motion.button
                    key={item.id}
                    ref={el => {
                      if (!itemRefs.current[idx]) itemRefs.current[idx] = [];
                      itemRefs.current[idx][itemIdx] = el;
                    }}
                    className={styles.ehMenuItem}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => {
                      setOpenMenu(null);
                      item.action();
                    }}
                    onKeyDown={e => handleItemKeyDown(e, idx, itemIdx)}
                    whileTap={{ scale: 0.96, backgroundColor: "rgba(0,240,255,0.13)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    id={`menubar-item-${idx}-${itemIdx}`}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );
};

export default MenuBar;
