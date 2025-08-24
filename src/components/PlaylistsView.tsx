
import React, { useState } from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

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
    <div className="eh-playlists-view" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>Playlists</h2>
      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New playlist name"
          aria-label="New playlist name"
        />
        <button type="submit" disabled={!newName.trim()}>Create</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {playlists.map((pl) => (
          <li key={pl.id} style={{ marginBottom: 16, border: "1px solid #ccc", borderRadius: 8, padding: 12, background: selected === pl.id ? "#f0f8ff" : "#fff" }}>
            {rename && rename.id === pl.id ? (
              <form onSubmit={handleRename} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={rename.name}
                  onChange={(e) => setRename({ ...rename, name: e.target.value })}
                  aria-label="Rename playlist"
                  autoFocus
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setRename(null)}>Cancel</button>
              </form>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setSelected(pl.id)} style={{ fontWeight: selected === pl.id ? "bold" : undefined, background: "none", border: "none", cursor: "pointer" }}>
                  {pl.name}
                </button>
                <button onClick={() => setRename({ id: pl.id, name: pl.name })} aria-label="Rename playlist">✏️</button>
                <button onClick={() => deletePlaylist(pl.id)} aria-label="Delete playlist">🗑️</button>
              </div>
            )}
            {selected === pl.id && (
              <div style={{ marginTop: 8 }}>
                <strong>Tracks:</strong>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {pl.trackIds.length === 0 && <li>No tracks in this playlist.</li>}
                  {pl.trackIds.map((tid) => {
                    const track = queue.find((t) => t.id === tid);
                    return track ? (
                      <li key={tid} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {track.title} — {track.artist}
                        <button onClick={() => removeFromPlaylist(pl.id, tid)} aria-label="Remove from playlist">❌</button>
                      </li>
                    ) : null;
                  })}
                </ul>
                <details style={{ marginTop: 8 }}>
                  <summary>Add track</summary>
                  <ul style={{ listStyle: "none", padding: 0, maxHeight: 120, overflow: "auto" }}>
                    {queue.filter((t) => !pl.trackIds.includes(t.id)).map((t) => (
                      <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {t.title} — {t.artist}
                        <button onClick={() => addToPlaylist(pl.id, t.id)} aria-label="Add to playlist">➕</button>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistsView;
