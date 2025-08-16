// src/components/player/TrackInfo.tsx
/**
 * TrackInfo
 * -----------------------------------------------------------------------------
 * Simple track metadata block — semantic markup + lightweight render logic.
 * Uses glass tokens via CSS classes defined in ./TrackInfo.css
 */

import React from "react";
import "./TrackInfo.css";

export interface TrackInfoProps {
  title?: string;
  artist?: string;
  album?: string;
  /** Optional test hook */
  "data-testid"?: string;
}

const TrackInfo: React.FC<TrackInfoProps> = React.memo(
  ({ title, artist, album, "data-testid": testId }) => {
    // Normalize to avoid rendering "undefined"
    const safeTitle = (title ?? "").trim();
    const safeArtist = (artist ?? "").trim();
    const safeAlbum = (album ?? "").trim();

    return (
      <div
        className="eh-track-info"
        role="group"
        aria-label="Track information"
        data-testid={testId ?? "track-info"}
      >
        {/* Title is the primary heading for screen readers within the player card */}
        <h2
          className="eh-track-title eh-title"
          title={safeTitle || "Unknown title"}
          aria-label="Title"
        >
          {safeTitle || "Unknown title"}
        </h2>

        {/* Artist */}
        <div
          className="eh-track-artist"
          title={safeArtist || "Unknown artist"}
          aria-label="Artist"
        >
          {safeArtist || "Unknown artist"}
        </div>

        {/* Album (optional) */}
        {safeAlbum.length > 0 && (
          <div className="eh-track-album" title={safeAlbum} aria-label="Album">
            {safeAlbum}
          </div>
        )}
      </div>
    );
  }
);

TrackInfo.displayName = "TrackInfo";

export default TrackInfo;
