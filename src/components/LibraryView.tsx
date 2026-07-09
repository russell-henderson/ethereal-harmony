import React, { useState } from "react";
import { useSettingsStore } from "@/lib/state/useSettingsStore";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import TrackList from "./TrackList";
import SplitPane from "./layout/SplitPane";
import EmptyState from "./layout/EmptyState";
import type { Track } from "@/lib/state/types";
import Icon from "@/lib/utils/IconRegistry";

const LibraryView: React.FC = () => {
  const searchQuery = useSettingsStore((s) => s.searchQuery || "");
  const queue = usePlayerStore((s) => s.queue);
  const playlists = usePlayerStore((s) => s.playlists);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [sortBy, setSortBy] = useState<"title" | "artist" | "album" | "addedAt" | "playCount">("addedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isDragging, setIsDragging] = useState(false);

  // Filter tracks by search query
  const filtered = queue.filter(track => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist?.toLowerCase().includes(q) ||
      (track.album?.toLowerCase().includes(q) ?? false)
    );
  });

  // Sort filtered tracks
  const sorted = [...filtered].sort((a: any, b: any) => {
    let valA = a[sortBy] ?? "";
    let valB = b[sortBy] ?? "";

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return sortOrder === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(f => f.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(f.name));

    if (audioFiles.length === 0) return;

    const { loadTrackFromFile } = await import("@/lib/audio/TrackLoader");
    const newTracks = [];

    for (const f of audioFiles) {
      try {
        const track = await loadTrackFromFile(f);
        newTracks.push(track);
      } catch (err) {
        console.error("Error importing file:", err);
      }
    }

    if (newTracks.length > 0) {
      const state = usePlayerStore.getState();
      const updatedQueue = [...state.queue, ...newTracks];
      usePlayerStore.setState({ queue: updatedQueue });
    }
  };

  // Click file trigger
  const triggerFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "audio/*";
    input.onchange = async () => {
      if (!input.files) return;
      const files = Array.from(input.files);
      const { loadTrackFromFile } = await import("@/lib/audio/TrackLoader");
      const newTracks = [];

      for (const f of files) {
        try {
          const track = await loadTrackFromFile(f);
          newTracks.push(track);
        } catch (err) {
          console.error("Error loading track:", err);
        }
      }

      if (newTracks.length > 0) {
        const state = usePlayerStore.getState();
        const updatedQueue = [...state.queue, ...newTracks];
        usePlayerStore.setState({ queue: updatedQueue });
      }
    };
    input.click();
  };

  return (
    <section aria-label="Library" style={{ height: "100%", minHeight: 0 }}>
      <SplitPane
        leftPaneWidth="340px"
        paneLeft={
          <div 
            style={{ 
              height: "100%", 
              display: "flex", 
              flexDirection: "column",
              position: "relative" 
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag & Drop Overlay */}
            {isDragging && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0, 240, 255, 0.15)",
                border: "2px dashed var(--eh-aqua, #00F0FF)",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                zIndex: 50,
                backdropFilter: "blur(4px)"
              }}>
                <Icon name="upload" size={32} style={{ color: "var(--eh-aqua, #00F0FF)" }} />
                <div style={{ fontWeight: 600, color: "#fff" }}>Drop audio files here</div>
              </div>
            )}

            {/* Quick Upload Banner */}
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Drag files here to import</span>
              <button 
                onClick={triggerFileSelect}
                style={{
                  background: "rgba(0, 240, 255, 0.12)",
                  border: "1px solid rgba(0, 240, 255, 0.3)",
                  color: "var(--eh-aqua, #00F0FF)",
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: 600
                }}
              >
                <Icon name="upload" size={10} /> Add Files
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              {sorted.length === 0 ? (
                <EmptyState message="No tracks found" subtitle={searchQuery ? "Try a different search term" : "Drag files in or click Add Files"} />
              ) : (
                <TrackList
                  tracks={sorted}
                  onTrackSelect={setSelectedTrack}
                  selectedTrackId={selectedTrack?.id}
                />
              )}
            </div>
          </div>
        }
        paneRightHeader={
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              {sorted.length} {sorted.length === 1 ? "item" : "items"}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {/* Sorting controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: "rgba(10, 18, 30, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: "11px",
                  borderRadius: "4px",
                  padding: "3px 6px",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="addedAt">Date Added</option>
                <option value="title">Title</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="playCount">Play Count</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                style={{
                  background: "rgba(10, 18, 30, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  padding: "3px 6px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                <Icon name={sortOrder === "asc" ? "chevronUp" : "chevronDown"} size={10} />
              </button>
            </div>
          </div>
        }
        paneRightBody={
          selectedTrack ? (
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
              
              {/* Cover Art Preview */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ position: "relative", width: "180px", height: "180px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                  {selectedTrack.artworkUrl ? (
                    <img
                      src={selectedTrack.artworkUrl}
                      alt="Album artwork"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%",
                      height: "100%",
                      background: "radial-gradient(circle, #2d3748 20%, #1a202c 70%, #050505 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Icon name="library" size={48} style={{ color: "rgba(0, 240, 255, 0.3)" }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Artist & Album metadata display */}
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                  {selectedTrack.title}
                </h3>
                <div style={{ color: "var(--eh-aqua, #00F0FF)", fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
                  {selectedTrack.artist || "Unknown Artist"}
                </div>
                <div style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "12px" }}>
                  {selectedTrack.album || "Unknown Album"}
                </div>
              </div>

              {/* Details table */}
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Format</span>
                  <span style={{ color: "#fff", textTransform: "uppercase" }}>{selectedTrack.mime?.split("/")[1] || "Unknown"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Plays</span>
                  <span style={{ color: "#fff" }}>{selectedTrack.playCount || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Source</span>
                  <span style={{ color: "#fff", textTransform: "capitalize" }}>{selectedTrack.source}</span>
                </div>
              </div>

              {/* Add to Playlist Control */}
              <div style={{ marginTop: "8px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 600, color: "rgba(255, 255, 255, 0.6)" }}>
                  Add to Playlist
                </h4>
                {playlists.length === 0 ? (
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", padding: "4px 0" }}>
                    No custom playlists found. Go to the Playlists view to create one!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {playlists.map((pl) => {
                      const hasTrack = pl.trackIds.includes(selectedTrack.id);
                      return (
                        <button
                          key={pl.id}
                          disabled={hasTrack}
                          onClick={() => {
                            if (!hasTrack) {
                              addToPlaylist?.(pl.id, selectedTrack.id);
                            }
                          }}
                          style={{
                            background: hasTrack ? "rgba(255,255,255,0.04)" : "rgba(0, 240, 255, 0.1)",
                            border: "1px solid " + (hasTrack ? "rgba(255,255,255,0.1)" : "rgba(0, 240, 255, 0.25)"),
                            color: hasTrack ? "rgba(255,255,255,0.3)" : "var(--eh-aqua, #00F0FF)",
                            fontSize: "11px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            cursor: hasTrack ? "not-allowed" : "pointer",
                            transition: "all 0.15s ease",
                            fontWeight: 500
                          }}
                          onMouseOver={(e) => {
                            if (!hasTrack) e.currentTarget.style.background = "rgba(0, 240, 255, 0.2)";
                          }}
                          onMouseOut={(e) => {
                            if (!hasTrack) e.currentTarget.style.background = "rgba(0, 240, 255, 0.1)";
                          }}
                        >
                          {pl.name} {hasTrack && "✓"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <EmptyState
              message="Select a track"
              subtitle="Choose a track from the list to view metadata inspector and playlist settings"
            />
          )
        }
      />
    </section>
  );
};

export default LibraryView;
