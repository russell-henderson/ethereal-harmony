import React, { useRef, useEffect } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import type { Track } from "@/lib/state/usePlayerStore";

interface TrackListProps {
  tracks: Track[];
  onTrackSelect?: (track: Track) => void;
  selectedTrackId?: string;
}

const ITEM_HEIGHT = 48;

const TrackList: React.FC<TrackListProps> = ({ tracks, onTrackSelect, selectedTrackId }) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus first item on mount or when tracks change
  useEffect(() => {
    if (listRef.current && tracks.length > 0) {
      const el = document.querySelector('[data-track-index="0"] button');
      if (el) (el as HTMLButtonElement).focus();
    }
  }, [tracks.length]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const track = tracks[index];
    const isSelected = selectedTrackId === track.id;
    
    return (
      <div style={style} data-track-index={index}>
        <button
          tabIndex={0}
          onClick={() => onTrackSelect?.(track)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "8px 12px",
            background: isSelected ? "rgba(0, 240, 255, 0.15)" : "transparent",
            border: "none",
            color: "var(--eh-text)",
            cursor: "pointer",
            borderRadius: "4px",
          }}
          aria-pressed={isSelected}
        >
          {track.title} — {track.artist || "Unknown Artist"}
        </button>
      </div>
    );
  };

  if (tracks.length === 0) {
    return <div style={{ padding: 16 }}>No tracks found.</div>;
  }

  // Calculate height based on container or use a reasonable default
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
