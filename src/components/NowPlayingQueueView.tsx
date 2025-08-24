import React from "react";
import { usePlayerStore } from "@/lib/state/usePlayerStore";
import type { Track } from "@/lib/state/usePlayerStore";

const NowPlayingQueueView: React.FC = () => {
  const queue = usePlayerStore((s: any) => s.queue as Track[]);
  const currentIndex = usePlayerStore((s: any) => s.currentIndex as number);
  const removeFromQueue = usePlayerStore((s: any) => s.removeFromQueue as (id: string) => void);
  const setQueue = usePlayerStore((s: any) => s.setQueue as (tracks: Track[], idx?: number) => void);

  // Move track up/down in queue
  const moveTrack = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);
    setQueue(newQueue, currentIndex === from ? to : currentIndex);
  };

  return (
    <section aria-label="Now Playing Queue" className="eh-queue-view">
      <h2>Now Playing Queue</h2>
      <ul className="eh-queue-list">
        {queue.length === 0 && <li>No tracks in queue.</li>}
        {queue.map((track: Track, idx: number) => (
          <li key={track.id} className={`eh-queue-row${idx === currentIndex ? " eh-queue-row--active" : ""}`}>
            <span>{track.title} — {track.artist}</span>
            <button onClick={() => removeFromQueue(track.id)} aria-label="Remove from queue">❌</button>
            <button onClick={() => moveTrack(idx, idx - 1)} aria-label="Move up" disabled={idx === 0}>⬆️</button>
            <button onClick={() => moveTrack(idx, idx + 1)} aria-label="Move down" disabled={idx === queue.length - 1}>⬇️</button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default NowPlayingQueueView;
