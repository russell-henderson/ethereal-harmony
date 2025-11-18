import React, { useState } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import SplitPane from "./layout/SplitPane";
import EmptyState from "./layout/EmptyState";
import type { Playlist } from "@/lib/state/types";

const PlaylistsView: React.FC = () => {
  const playlists = usePlayerStore((s) => s.playlists);
  const queue = usePlayerStore((s) => s.queue);
  const createPlaylist = usePlayerStore((s) => s.createPlaylist);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  const removeFromPlaylist = usePlayerStore((s) => s.removeFromPlaylist);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  
  const selectedPlaylist = playlists.find((p) => p.id === selected);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const id = createPlaylist(newName.trim());
      setSelected(id);
      setNewName("");
    }
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (rename && rename.name.trim()) {
      // Remove and re-add with new name (simple for now)
      const pl = playlists.find((p) => p.id === rename.id);
      if (pl) {
        deletePlaylist(pl.id);
        const newId = createPlaylist(rename.name.trim());
        pl.trackIds.forEach((tid) => addToPlaylist(newId, tid));
        setSelected(newId);
      }
      setRename(null);
    }
  };

  return (
    <section aria-label="Playlists" style={{ height: "100%", minHeight: 0 }}>
      <SplitPane
        leftPaneWidth="300px"
        paneLeft={
          <div style={{ padding: "var(--eh-gap-12, 12px)" }}>
            <h2 style={{ marginBottom: "var(--eh-gap-16, 16px)", fontSize: "var(--eh-fs-lg, 18px)" }}>Playlists</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New playlist name"
                aria-label="New playlist name"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "8px",
                  color: "var(--eh-text)",
                }}
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                style={{
                  padding: "8px 16px",
                  background: "rgba(0, 240, 255, 0.2)",
                  border: "1px solid rgba(0, 240, 255, 0.4)",
                  borderRadius: "8px",
                  color: "var(--eh-text)",
                  cursor: "pointer",
                }}
              >
                Create
              </button>
            </form>
            {playlists.length === 0 ? (
              <EmptyState message="No playlists" subtitle="Create a playlist to get started" />
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {playlists.map((pl) => (
                  <li key={pl.id} style={{ marginBottom: 8 }}>
                    {rename && rename.id === pl.id ? (
                      <form onSubmit={handleRename} style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          value={rename.name}
                          onChange={(e) => setRename({ ...rename, name: e.target.value })}
                          aria-label="Rename playlist"
                          autoFocus
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            borderRadius: "8px",
                            color: "var(--eh-text)",
                          }}
                        />
                        <button type="submit" style={{ padding: "8px 12px" }}>Save</button>
                        <button type="button" onClick={() => setRename(null)} style={{ padding: "8px 12px" }}>Cancel</button>
                      </form>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={() => setSelected(pl.id)}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            padding: "8px 12px",
                            fontWeight: selected === pl.id ? "bold" : "normal",
                            background: selected === pl.id ? "rgba(0, 240, 255, 0.15)" : "transparent",
                            border: "none",
                            borderRadius: "8px",
                            color: "var(--eh-text)",
                            cursor: "pointer",
                          }}
                        >
                          {pl.name}
                        </button>
                        <button
                          onClick={() => setRename({ id: pl.id, name: pl.name })}
                          aria-label="Rename playlist"
                          style={{ padding: "4px 8px", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePlaylist(pl.id)}
                          aria-label="Delete playlist"
                          style={{ padding: "4px 8px", background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
        paneRightHeader={
          selectedPlaylist && (
            <div style={{ padding: "var(--eh-gap-12, 12px)" }}>
              <div style={{ fontSize: "var(--eh-fs-sm, 14px)", color: "var(--eh-text-muted)" }}>
                {selectedPlaylist.trackIds.length} {selectedPlaylist.trackIds.length === 1 ? "track" : "tracks"}
              </div>
            </div>
          )
        }
        paneRightBody={
          selectedPlaylist ? (
            <div style={{ padding: "var(--eh-gap-24, 24px)" }}>
              <h3 style={{ marginBottom: "var(--eh-gap-16, 16px)" }}>{selectedPlaylist.name}</h3>
              <div style={{ marginBottom: "var(--eh-gap-16, 16px)" }}>
                <strong>Tracks:</strong>
                <ul style={{ listStyle: "none", padding: 0, marginTop: "var(--eh-gap-8, 8px)" }}>
                  {selectedPlaylist.trackIds.length === 0 ? (
                    <li>
                      <EmptyState message="No tracks in this playlist" subtitle="Add tracks from your library" />
                    </li>
                  ) : (
                    selectedPlaylist.trackIds.map((tid) => {
                      const track = queue.find((t) => t.id === tid);
                      return track ? (
                        <li
                          key={tid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            marginBottom: 4,
                            background: "rgba(255, 255, 255, 0.04)",
                            borderRadius: "8px",
                          }}
                        >
                          <span style={{ flex: 1 }}>
                            {track.title} — {track.artist || "Unknown Artist"}
                          </span>
                          <button
                            onClick={() => removeFromPlaylist(selectedPlaylist.id, tid)}
                            aria-label="Remove from playlist"
                            style={{ padding: "4px 8px", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            ❌
                          </button>
                        </li>
                      ) : null;
                    })
                  )}
                </ul>
              </div>
              <details style={{ marginTop: "var(--eh-gap-16, 16px)" }}>
                <summary style={{ cursor: "pointer", marginBottom: "var(--eh-gap-8, 8px)" }}>Add track</summary>
                <ul style={{ listStyle: "none", padding: 0, maxHeight: 200, overflow: "auto" }}>
                  {queue.filter((t) => !selectedPlaylist.trackIds.includes(t.id)).length === 0 ? (
                    <li>No tracks available to add.</li>
                  ) : (
                    queue
                      .filter((t) => !selectedPlaylist.trackIds.includes(t.id))
                      .map((t) => (
                        <li
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            marginBottom: 4,
                            background: "rgba(255, 255, 255, 0.04)",
                            borderRadius: "8px",
                          }}
                        >
                          <span style={{ flex: 1 }}>
                            {t.title} — {t.artist || "Unknown Artist"}
                          </span>
                          <button
                            onClick={() => addToPlaylist(selectedPlaylist.id, t.id)}
                            aria-label="Add to playlist"
                            style={{ padding: "4px 8px", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            ➕
                          </button>
                        </li>
                      ))
                  )}
                </ul>
              </details>
            </div>
          ) : (
            <EmptyState message="Select a playlist" subtitle="Choose a playlist from the list to view and manage tracks" />
          )
        }
      />
    </section>
  );
};

export default PlaylistsView;
