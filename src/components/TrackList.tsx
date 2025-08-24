import React, { useRef, useEffect } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import type { Track } from "@/lib/state/usePlayerStore";

interface TrackListProps {
  tracks: Track[];
}

const ITEM_HEIGHT = 48;

const TrackList: React.FC<TrackListProps> = ({ tracks }) => {
  const listRef = useRef<List>(null);

  // Focus first item on mount or when tracks change
  useEffect(() => {
    if (listRef.current && tracks.length > 0) {
      const el = document.querySelector('[data-track-index="0"] button');
      if (el) (el as HTMLButtonElement).focus();
    }
  }, [tracks.length]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const track = tracks[index];
    return (
      <div style={style} data-track-index={index}>
        <button tabIndex={0} style={{ width: "100%", textAlign: "left" }}>
          {track.title} — {track.artist}
        </button>
      </div>
    );
  };

  if (tracks.length === 0) {
    return <div style={{ padding: 16 }}>No tracks found.</div>;
  }

  return (
    <List
      height={Math.min(400, tracks.length * ITEM_HEIGHT)}
      itemCount={tracks.length}
      itemSize={ITEM_HEIGHT}
      width={"100%"}
      ref={listRef}
    >
      {Row}
    </List>
  );
};

export default TrackList;
