import React, { useState } from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import TrackList from "./TrackList";
import SplitPane from "./layout/SplitPane";
import EmptyState from "./layout/EmptyState";
import type { Track } from "@/lib/state/types";

/**
 * LibraryView
 * - Main library view with split-pane layout:
 *   - E1 (left): Track list
 *   - E2 (right header): Filters/sort controls (optional)
 *   - E3 (right body): Selected track detail or queue contents
 */
const LibraryView: React.FC = () => {
  const searchQuery = useSettingsStore((s) => s.searchQuery || "");
  const queue = usePlayerStore((s) => s.queue);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  // Filter tracks by search query (simple title/artist/album match)
  const filtered = queue.filter(track => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist?.toLowerCase().includes(q) ||
      (track.album?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <section aria-label="Library" style={{ height: "100%", minHeight: 0 }}>
      <SplitPane
        leftPaneWidth="300px"
        paneLeft={
          filtered.length === 0 ? (
            <EmptyState message="No tracks found" subtitle={searchQuery ? "Try a different search term" : "Load a track to get started"} />
          ) : (
            <TrackList
              tracks={filtered}
              onTrackSelect={setSelectedTrack}
              selectedTrackId={selectedTrack?.id}
            />
          )
        }
        paneRightHeader={
          <div style={{ padding: "var(--eh-gap-12, 12px)" }}>
            <div style={{ fontSize: "var(--eh-fs-sm, 14px)", color: "var(--eh-text-muted)" }}>
              {filtered.length} {filtered.length === 1 ? "track" : "tracks"}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        }
        paneRightBody={
          selectedTrack ? (
            <div style={{ padding: "var(--eh-gap-24, 24px)" }}>
              <h3 style={{ marginBottom: "var(--eh-gap-16, 16px)" }}>{selectedTrack.title}</h3>
              <div style={{ color: "var(--eh-text-muted)", marginBottom: "var(--eh-gap-8, 8px)" }}>
                {selectedTrack.artist || "Unknown Artist"}
              </div>
              {selectedTrack.album && (
                <div style={{ color: "var(--eh-text-muted)", marginBottom: "var(--eh-gap-16, 16px)" }}>
                  {selectedTrack.album}
                </div>
              )}
              {selectedTrack.artworkUrl && (
                <img
                  src={selectedTrack.artworkUrl}
                  alt="Album artwork"
                  style={{
                    width: "200px",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "var(--eh-radius-16, 16px)",
                    marginBottom: "var(--eh-gap-16, 16px)",
                  }}
                />
              )}
            </div>
          ) : (
            <EmptyState
              message="Select a track"
              subtitle="Choose a track from the list to view details"
            />
          )
        }
      />
    </section>
  );
};

export default LibraryView;
