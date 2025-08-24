

import React from "react";
import { usePlayerStore, selectRecentlyAdded, selectMostPlayed, selectNotPlayedYet } from "@/lib/state/usePlayerStore";
import TrackList from "./TrackList";

const DiscoveryView: React.FC = () => {
  const queue = usePlayerStore((s) => s.queue);
  const recentlyAdded = selectRecentlyAdded({ queue } as any, 10);
  const mostPlayed = selectMostPlayed({ queue } as any, 10);
  const notPlayedYet = selectNotPlayedYet({ queue } as any);

  return (
    <div className="eh-discovery-view" style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h2>Discovery</h2>
      <section style={{ marginBottom: 32 }}>
        <h3>Recently Added</h3>
        <TrackList tracks={recentlyAdded} />
      </section>
      <section style={{ marginBottom: 32 }}>
        <h3>Most Played</h3>
        <TrackList tracks={mostPlayed} />
      </section>
      <section>
        <h3>Not Played Yet</h3>
        <TrackList tracks={notPlayedYet} />
      </section>
    </div>
  );
};

export default DiscoveryView;
