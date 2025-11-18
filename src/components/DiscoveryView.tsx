import React, { useState } from "react";
import { usePlayerStore, selectRecentlyAdded, selectMostPlayed, selectNotPlayedYet } from "@/lib/state/usePlayerStore";
import TrackList from "./TrackList";
import SplitPane from "./layout/SplitPane";
import EmptyState from "./layout/EmptyState";
import type { Track } from "@/lib/state/types";

type DiscoveryCategory = "recentlyAdded" | "mostPlayed" | "notPlayedYet";

const DiscoveryView: React.FC = () => {
  const queue = usePlayerStore((s) => s.queue);
  const recentlyAdded = selectRecentlyAdded({ queue } as any, 10);
  const mostPlayed = selectMostPlayed({ queue } as any, 10);
  const notPlayedYet = selectNotPlayedYet({ queue } as any);
  const [selectedCategory, setSelectedCategory] = useState<DiscoveryCategory>("recentlyAdded");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const getCategoryTracks = () => {
    switch (selectedCategory) {
      case "recentlyAdded":
        return recentlyAdded;
      case "mostPlayed":
        return mostPlayed;
      case "notPlayedYet":
        return notPlayedYet;
      default:
        return [];
    }
  };

  const categoryTracks = getCategoryTracks();

  return (
    <section aria-label="Discovery" style={{ height: "100%", minHeight: 0 }}>
      <SplitPane
        leftPaneWidth="300px"
        paneLeft={
          <div style={{ padding: "var(--eh-gap-12, 12px)" }}>
            <h2 style={{ marginBottom: "var(--eh-gap-16, 16px)", fontSize: "var(--eh-fs-lg, 18px)" }}>Discovery</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => {
                  setSelectedCategory("recentlyAdded");
                  setSelectedTrack(null);
                }}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  background: selectedCategory === "recentlyAdded" ? "rgba(0, 240, 255, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "var(--eh-text)",
                  cursor: "pointer",
                  fontWeight: selectedCategory === "recentlyAdded" ? "bold" : "normal",
                }}
              >
                Recently Added ({recentlyAdded.length})
              </button>
              <button
                onClick={() => {
                  setSelectedCategory("mostPlayed");
                  setSelectedTrack(null);
                }}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  background: selectedCategory === "mostPlayed" ? "rgba(0, 240, 255, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "var(--eh-text)",
                  cursor: "pointer",
                  fontWeight: selectedCategory === "mostPlayed" ? "bold" : "normal",
                }}
              >
                Most Played ({mostPlayed.length})
              </button>
              <button
                onClick={() => {
                  setSelectedCategory("notPlayedYet");
                  setSelectedTrack(null);
                }}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  background: selectedCategory === "notPlayedYet" ? "rgba(0, 240, 255, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  color: "var(--eh-text)",
                  cursor: "pointer",
                  fontWeight: selectedCategory === "notPlayedYet" ? "bold" : "normal",
                }}
              >
                Not Played Yet ({notPlayedYet.length})
              </button>
            </div>
            {categoryTracks.length === 0 ? (
              <EmptyState
                message="No tracks in this category"
                subtitle="Load tracks to see discovery results"
              />
            ) : (
              <div style={{ marginTop: "var(--eh-gap-16, 16px)" }}>
                <TrackList
                  tracks={categoryTracks}
                  onTrackSelect={setSelectedTrack}
                  selectedTrackId={selectedTrack?.id}
                />
              </div>
            )}
          </div>
        }
        paneRightHeader={
          <div style={{ padding: "var(--eh-gap-12, 12px)" }}>
            <div style={{ fontSize: "var(--eh-fs-sm, 14px)", color: "var(--eh-text-muted)" }}>
              {categoryTracks.length} {categoryTracks.length === 1 ? "track" : "tracks"}
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
              subtitle="Choose a track from the discovery list to view details"
            />
          )
        }
      />
    </section>
  );
};

export default DiscoveryView;
