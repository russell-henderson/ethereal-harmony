import React, { useRef, useEffect } from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { usePlayerStore } from "@/lib/state/usePlayerStore";

/**
 * LibraryList
 * - Renders the filtered track list based on searchQuery
 * - Focuses the first item on search submit
 */
export const LibraryList: React.FC = () => {
  const searchQuery = useSettingsStore((s) => s.searchQuery || "");
  const queue = usePlayerStore((s) => s.queue);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter tracks by search query (simple title/artist/album match)
  const filtered = queue.filter(track => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      (track.album?.toLowerCase().includes(q) ?? false)
    );
  });

  // Focus first item on search submit
  useEffect(() => {
    if (listRef.current && filtered.length > 0) {
      const first = listRef.current.querySelector('li button');
      if (first) (first as HTMLButtonElement).focus();
    }
  }, [searchQuery, filtered.length]);

  return (
    <ul ref={listRef} role="list" aria-label="Track list">
      {filtered.map((track) => (
        <li key={track.id}>
          <button tabIndex={0}>
            {track.title} — {track.artist}
          </button>
        </li>
      ))}
      {filtered.length === 0 && <li>No tracks found.</li>}
    </ul>
  );
};

export default LibraryList;
