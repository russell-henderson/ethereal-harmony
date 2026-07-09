import React, { useRef, useEffect, useState } from "react";
import styles from "./PlaylistExportModal.module.css";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import { Playlist } from "@/lib/state/types";

interface PlaylistExportModalProps {
  open: boolean;
  onClose: () => void;
}

export const PlaylistExportModal: React.FC<PlaylistExportModalProps> = ({ open, onClose }) => {
  const playlists = usePlayerStore((s) => s.playlists);
  const queue = usePlayerStore((s) => s.queue);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<"m3u" | "json">("json");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPlaylist = (playlist: Playlist) => {
    try {
      const resolvedTracks = playlist.trackIds
        .map((tid) => queue.find((t) => t.id === tid))
        .filter(Boolean);

      if (resolvedTracks.length === 0) {
        setStatus(`Warning: Playlist "${playlist.name}" is empty.`);
        return;
      }

      if (selectedFormat === "json") {
        const jsonContent = JSON.stringify(
          {
            playlistName: playlist.name,
            exportedAt: new Date().toISOString(),
            tracks: resolvedTracks.map((t: any) => ({
              title: t.title,
              artist: t.artist || "Unknown Artist",
              album: t.album || "Unknown Album",
              url: t.url,
              duration: t.duration,
              mime: t.mime,
            })),
          },
          null,
          2
        );
        triggerDownload(
          jsonContent,
          `${playlist.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.json`,
          "application/json"
        );
      } else {
        // Generate M3U
        let m3u = "#EXTM3U\n";
        resolvedTracks.forEach((t: any) => {
          m3u += `#EXTINF:${Math.round(t.duration || 0)},${t.artist || "Unknown Artist"} - ${t.title}\n`;
          m3u += `${t.url}\n`;
        });
        triggerDownload(
          m3u,
          `${playlist.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.m3u`,
          "audio/x-mpegurl"
        );
      }

      setStatus(`Successfully exported "${playlist.name}"!`);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setStatus("Failed to export playlist.");
    }
  };

  const handleExportAll = () => {
    if (playlists.length === 0) {
      setStatus("No playlists to export.");
      return;
    }

    try {
      if (selectedFormat === "json") {
        const allPlaylistsJson = playlists.map((pl) => ({
          name: pl.name,
          tracks: pl.trackIds
            .map((tid) => queue.find((t) => t.id === tid))
            .filter(Boolean)
            .map((t: any) => ({
              title: t.title,
              artist: t.artist || "Unknown Artist",
              album: t.album || "Unknown Album",
              url: t.url,
              duration: t.duration,
            })),
        }));

        const jsonContent = JSON.stringify(
          {
            app: "Ethereal Harmony Playlists",
            exportedAt: new Date().toISOString(),
            playlists: allPlaylistsJson,
          },
          null,
          2
        );
        triggerDownload(jsonContent, "ethereal_harmony_all_playlists.json", "application/json");
      } else {
        // M3U with all tracks grouped
        let m3u = "#EXTM3U\n";
        playlists.forEach((pl) => {
          m3u += `\n# --- Playlist: ${pl.name} ---\n`;
          pl.trackIds.forEach((tid) => {
            const t = queue.find((tr) => tr.id === tid);
            if (t) {
              m3u += `#EXTINF:${Math.round(t.duration || 0)},${t.artist || "Unknown Artist"} - ${t.title}\n`;
              m3u += `${t.url}\n`;
            }
          });
        });
        triggerDownload(m3u, "ethereal_harmony_all_playlists.m3u", "audio/x-mpegurl");
      }

      setStatus("Successfully exported all playlists!");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setStatus("Failed to export all playlists.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.modal} eh-glass glass-surface`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-title"
      tabIndex={-1}
      open
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="export-title" className={styles.title}>Export Playlist Manager</h2>
          <button type="button" onClick={onClose} className={styles.closeHeaderBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {/* Format selection */}
          <div className={styles.formatSelectRow}>
            <span className={styles.sectionLabel}>Export Format:</span>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="export-format"
                value="json"
                checked={selectedFormat === "json"}
                onChange={() => setSelectedFormat("json")}
              />
              <span>JSON Metadata</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="export-format"
                value="m3u"
                checked={selectedFormat === "m3u"}
                onChange={() => setSelectedFormat("m3u")}
              />
              <span>M3U Playlist (Standard)</span>
            </label>
          </div>

          {/* Action Row */}
          {playlists.length > 0 && (
            <div className={styles.actionRow}>
              <button type="button" className="eh-btn" onClick={handleExportAll}>
                Export All Playlists
              </button>
            </div>
          )}

          {/* Playlists List */}
          <div className={styles.playlistListContainer}>
            <h3 className={styles.listTitle}>Available Playlists</h3>
            {playlists.length === 0 ? (
              <p className={styles.emptyMsg}>No playlists created. Save some tracks to playlists first.</p>
            ) : (
              <div className={styles.playlistGrid}>
                {playlists.map((pl) => (
                  <div key={pl.id} className={`${styles.playlistCard} eh-glass`}>
                    <div className={styles.playlistInfo}>
                      <span className={styles.playlistName}>{pl.name}</span>
                      <span className={styles.playlistTracks}>
                        {pl.trackIds.length} {pl.trackIds.length === 1 ? "track" : "tracks"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="eh-btn"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => handleExportPlaylist(pl)}
                    >
                      Export
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status notifications */}
          {status && <div className={styles.statusMsg}>{status}</div>}
        </div>

        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default PlaylistExportModal;
