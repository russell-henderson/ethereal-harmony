import React, { useRef, useEffect } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import type { Track } from "@/lib/state/types";
import Icon from "@/lib/utils/IconRegistry";

interface TrackListProps {
  tracks: Track[];
  onTrackSelect?: (track: Track) => void;
  selectedTrackId?: string;
}

const ITEM_HEIGHT = 56;

const formatDuration = (sec?: number) => {
  if (sec === undefined || !Number.isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TrackList: React.FC<TrackListProps> = ({ tracks, onTrackSelect, selectedTrackId }) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus first item on mount or when tracks change
  useEffect(() => {
    if (listRef.current && tracks.length > 0) {
      const el = document.querySelector('[data-track-index="0"] .track-row-select');
      if (el) (el as HTMLDivElement).focus();
    }
  }, [tracks.length]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const track = tracks[index];
    if (!track) return null;
    const isSelected = selectedTrackId === track.id;
    
    return (
      <div 
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          padding: "2px 8px",
          boxSizing: "border-box"
        }} 
        data-track-index={index}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => onTrackSelect?.(track)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTrackSelect?.(track);
            }
          }}
          onDoubleClick={() => {
            const globalQueue = usePlayerStore.getState().queue;
            const qIdx = globalQueue.findIndex((t) => t.id === track.id);
            if (qIdx >= 0) {
              usePlayerStore.getState().playIndex(qIdx);
            }
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "4px 8px",
            background: isSelected ? "rgba(0, 240, 255, 0.12)" : "transparent",
            border: "1px solid " + (isSelected ? "rgba(0, 240, 255, 0.25)" : "transparent"),
            borderRadius: "8px",
            cursor: "pointer",
            textAlign: "left",
            overflow: "hidden",
            transition: "all 0.2s ease",
            marginRight: "8px",
            outline: "none",
            userSelect: "none"
          }}
          className="track-row-select"
        >
          {/* Cover Art / Vinyl Fallback */}
          <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0, borderRadius: "6px", overflow: "hidden" }}>
            {track.artworkUrl ? (
              <img src={track.artworkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                background: "radial-gradient(circle, #2d3748 20%, #1a202c 70%, #0a0a0a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--eh-aqua, #00F0FF)" }} />
              </div>
            )}
          </div>

          {/* Title & Artist Stack */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "13.5px", color: isSelected ? "var(--eh-aqua, #00F0FF)" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track.title}
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track.artist || "Unknown Artist"}
            </div>
          </div>
        </div>

        {/* Right Controls: Duration & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {track.duration ? (
            <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", width: "36px", textAlign: "right" }}>
              {formatDuration(track.duration)}
            </span>
          ) : track.isStream ? (
            <span style={{ fontSize: "9px", fontWeight: "bold", color: "var(--eh-aqua, #00F0FF)", background: "rgba(0, 240, 255, 0.12)", padding: "1px 5px", borderRadius: "4px" }}>
              LIVE
            </span>
          ) : null}

          {/* Play Icon */}
          <button
            onClick={() => {
              const globalQueue = usePlayerStore.getState().queue;
              const qIdx = globalQueue.findIndex((t) => t.id === track.id);
              if (qIdx >= 0) {
                usePlayerStore.getState().playIndex(qIdx);
              }
            }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--eh-aqua, #00F0FF)";
              e.currentTarget.style.background = "rgba(0, 240, 255, 0.12)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            title="Play track"
          >
            <Icon name="play" size={10} />
          </button>

          {/* Delete Icon */}
          <button
            onClick={async () => {
              try {
                const { libraryDB } = await import("@/lib/audio/LibraryDB");
                await libraryDB.deleteTrack(track.id);
              } catch (err) {
                console.error("Failed to delete track from DB:", err);
              }
              usePlayerStore.getState().removeTrackFromQueue(track.id);
            }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "none",
              color: "rgba(255,50,50,0.6)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "rgba(255,50,50,1)";
              e.currentTarget.style.background = "rgba(255,50,50,0.12)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "rgba(255,50,50,0.6)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            title="Delete track"
          >
            <Icon name="close" size={10} />
          </button>
        </div>
      </div>
    );
  };

  if (tracks.length === 0) {
    return <div style={{ padding: 16, color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>No tracks found.</div>;
  }

  const containerHeight = containerRef.current?.clientHeight || 600;
  const listHeight = Math.min(containerHeight, tracks.length * ITEM_HEIGHT);

  return (
    <div ref={containerRef} style={{ height: "100%", minHeight: 0 }}>
      <List
        height={listHeight}
        itemCount={tracks.length}
        itemSize={ITEM_HEIGHT}
        width={"100%"}
        ref={listRef}
      >
        {Row}
      </List>
    </div>
  );
};

export default TrackList;
