import React, { useState } from "react";
import styles from "./SettingsModal.module.css";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import AudioDevicePicker from "@/components/settings/AudioDevicePicker";
import EqPanel from "@/components/settings/EqPanel";
import SettingsPanel from "@/components/settings/SettingsPanel";

const TABS = ["General", "Audio", "Visualizer", "Storage", "Privacy"];

const SettingsModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [tab, setTab] = useState(0);
  const settings = useSettingsStore();

  if (!open) return null;

  return (
    <dialog
      className={`${styles.modal} eh-glass glass-surface`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      tabIndex={-1}
      open
    >
      <form className={styles.form} onSubmit={e => e.preventDefault()}>
        <h2 id="settings-title">Settings</h2>
        <nav className={styles.tabs} role="tablist">
          {TABS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === i}
              tabIndex={tab === i ? 0 : -1}
              className={tab === i ? styles.activeTab : undefined}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className={styles.tabPanel} role="tabpanel">
          {/* General Tab */}
          {tab === 0 && (
            <div className="eh-vstack" style={{ gap: 20 }}>
              <label className={styles.fieldColumn}>
                <span className={styles.fieldLabel}>Theme</span>
                <select
                  value={settings.theme}
                  onChange={e => settings.setTheme(e.target.value as "system" | "dark")}
                  className={styles.select}
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className={styles.fieldRow}>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion ?? false}
                  onChange={e => settings.setReducedMotion(e.target.checked)}
                />
                <span>Reduce motion</span>
              </label>
              <label className={styles.fieldRow}>
                <input
                  type="checkbox"
                  checked={settings.hotkeysEnabled}
                  onChange={e => settings.setHotkeysEnabled(e.target.checked)}
                />
                <span>Enable global hotkeys</span>
              </label>
              <div className={styles.metaText}>
                <span>App version: <b>{import.meta.env.VITE_APP_VERSION ?? 'dev'}</b></span>
              </div>
            </div>
          )}
          {/* Audio Tab */}
          {tab === 1 && (
            <div className={styles.vstack}>
              <React.Suspense fallback={<span>Loading audio settings…</span>}>
                <AudioDevicePicker />
              </React.Suspense>
              <React.Suspense fallback={<span>Loading equalizer…</span>}>
                <EqPanel />
              </React.Suspense>
            </div>
          )}
          {/* Visualizer Tab */}
          {tab === 2 && (
            <div className={styles.vstack}>
              <React.Suspense fallback={<span>Loading visualizer controls…</span>}>
                <SettingsPanel mode="full" />
              </React.Suspense>
            </div>
          )}
          {/* Storage Tab */}
          {tab === 3 && (
            <div className={styles.vstack}>
              <div>
                <span className={styles.fieldLabel}>Cache Usage</span>
                <div className={styles.metaText}>
                  (Coming soon) View and manage local cache for offline playback.
                </div>
              </div>
              <button type="button" className="eh-btn" disabled>
                Purge Cache (coming soon)
              </button>
            </div>
          )}
          {/* Privacy Tab */}
          {tab === 4 && (
            <div className={styles.vstack}>
              <label className={styles.fieldRow}>
                <input type="checkbox" disabled />
                <span>Allow telemetry (coming soon)</span>
              </label>
              <button type="button" className="eh-btn" disabled>
                Export Diagnostics (coming soon)
              </button>
            </div>
          )}
        </div>
        <div className={styles.buttonRow}>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close settings">Close</button>
        </div>
      </form>
    </dialog>
  );
};

export default SettingsModal;
