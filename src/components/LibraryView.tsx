import React from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import TrackList from "./TrackList";

/**
 * LibraryView
 * - Main library view with search and virtualized track list
 */
const LibraryView: React.FC = () => {
  const searchQuery = useSettingsStore((s) => s.searchQuery || "");
  const queue = usePlayerStore((s) => s.queue);

  // Filter tracks by search query (simple title/artist/album match)
  const filtered = queue.filter(track => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      (track.album?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <section aria-label="Library list" style={{ height: "100%" }}>
      <TrackList tracks={filtered} />
    </section>
  );
};

export default LibraryView;
