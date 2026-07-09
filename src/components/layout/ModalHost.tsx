import React from "react";
import { useUIStore } from "@/lib/state/useUIStore";
import AudioDevicePicker from "@/components/settings/AudioDevicePicker";
import StreamTestWizard from "@/components/streaming/StreamTestWizard";
import AudioInspectorModal from "@/components/diagnostics/AudioInspectorModal";
import PlaylistExportModal from "@/components/player/PlaylistExportModal";
import styles from "./ModalHost.module.css";

export const ModalHost: React.FC = () => {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);

  if (modal === "none") return null;

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modalWrapper} onClick={(e) => e.stopPropagation()}>
        {/* Output Device Picker Modal */}
        {modal === "device-picker" && (
          <dialog className={`${styles.dialog} eh-glass glass-surface`} open>
            <div className={styles.header}>
              <h2 className={styles.title}>Audio Output Settings</h2>
              <button type="button" onClick={closeModal} className={styles.closeHeaderBtn}>✕</button>
            </div>
            <div className={styles.body}>
              <AudioDevicePicker />
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={closeModal} className={styles.footerCloseBtn}>Done</button>
            </div>
          </dialog>
        )}

        {/* Stream Wizard Modal */}
        {modal === "stream-wizard" && (
          <dialog className={`${styles.dialog} ${styles.wideDialog} eh-glass glass-surface`} open>
            <div className={styles.header}>
              <h2 className={styles.title}>Network Audio Stream Tester</h2>
              <button type="button" onClick={closeModal} className={styles.closeHeaderBtn}>✕</button>
            </div>
            <div className={styles.body}>
              <StreamTestWizard />
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={closeModal} className={styles.footerCloseBtn}>Close</button>
            </div>
          </dialog>
        )}

        {/* Audio Inspector Modal */}
        {modal === "audio-inspector" && (
          <AudioInspectorModal open={true} onClose={closeModal} />
        )}

        {/* Playlist Exporter Modal */}
        {modal === "playlist-export" && (
          <PlaylistExportModal open={true} onClose={closeModal} />
        )}

        {/* About Modal */}
        {modal === "about" && (
          <dialog className={`${styles.dialog} eh-glass glass-surface`} open>
            <div className={styles.header}>
              <h2 className={styles.title}>About Ethereal Harmony</h2>
              <button type="button" onClick={closeModal} className={styles.closeHeaderBtn}>✕</button>
            </div>
            <div className={styles.body} style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" }}>
              <div className={styles.logoSlot}>📡</div>
              <h3>Ethereal Harmony</h3>
              <p className={styles.subtext}>Version 1.0.0 (Beta)</p>
              <p>
                A high-fidelity Web Audio visualizer, stream analyzer, and local player.
                Features real-time frequency mapping, customized glassmorphic design systems,
                and zero-dependency metadata signal extraction.
              </p>
              <div className={styles.detailsGrid}>
                <div><strong>Engine:</strong> Three.js (WebGL)</div>
                <div><strong>State:</strong> Zustand & Store-driven</div>
                <div><strong>A11y:</strong> WCAG AA Compliant</div>
                <div><strong>Build:</strong> Vite & React 19</div>
              </div>
              <p style={{ fontSize: "12px", color: "var(--eh-text-subtle)", marginTop: "8px" }}>
                © 2026 Ethereal Harmony Project. All rights reserved.
              </p>
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={closeModal} className={styles.footerCloseBtn}>Done</button>
            </div>
          </dialog>
        )}

        {/* Hotkeys / Keyboard Shortcuts Modal */}
        {modal === "hotkeys" && (
          <dialog className={`${styles.dialog} eh-glass glass-surface`} open>
            <div className={styles.header}>
              <h2 className={styles.title}>Keyboard Navigation</h2>
              <button type="button" onClick={closeModal} className={styles.closeHeaderBtn}>✕</button>
            </div>
            <div className={styles.body}>
              <p style={{ marginBottom: "16px", fontSize: "14px", color: "var(--eh-text-muted)" }}>
                Use these hotkeys anywhere in the app to control playback and drawer states.
              </p>
              <table className={styles.shortcutTable}>
                <thead>
                  <tr>
                    <th>Shortcut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><kbd>Space</kbd></td>
                    <td>Play / Pause Toggle</td>
                  </tr>
                  <tr>
                    <td><kbd>M</kbd></td>
                    <td>Mute / Unmute Toggle</td>
                  </tr>
                  <tr>
                    <td><kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd></td>
                    <td>Volume Up / Down (5% steps)</td>
                  </tr>
                  <tr>
                    <td><kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd></td>
                    <td>Seek Backwards / Forwards (5s steps)</td>
                  </tr>
                  <tr>
                    <td><kbd>Ctrl + B</kbd> / <kbd>Cmd + B</kbd></td>
                    <td>Toggle Navigation Side Panel</td>
                  </tr>
                  <tr>
                    <td><kbd>Ctrl + ,</kbd> / <kbd>Cmd + ,</kbd></td>
                    <td>Open Settings Modal</td>
                  </tr>
                  <tr>
                    <td><kbd>[</kbd> / <kbd>]</kbd></td>
                    <td>Resize Side Panel (S / M / L steps)</td>
                  </tr>
                  <tr>
                    <td><kbd>Escape</kbd></td>
                    <td>Close active drawer or modal</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.footer}>
              <button type="button" onClick={closeModal} className={styles.footerCloseBtn}>Got It</button>
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
};

export default ModalHost;
