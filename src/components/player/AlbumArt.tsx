// src/components/player/AlbumArt.tsx
/**
 * AlbumArt
 * -----------------------------------------------------------------------------
 * Glass-bordered square artwork with robust fallback.
 * - Lazy-loads image and shows a placeholder on error or when src is missing.
 * - Size is a square in pixels; defaults to 96.
 * - Keeps aspect cover, rounded corners (16px), and non-distorting layout.
 */

import React, { useMemo, useState } from "react";
import "./AlbumArt.css";

export interface AlbumArtProps {
  src?: string;
  alt?: string;
  size?: number; // square px size
  /** Optional test hook */
  "data-testid"?: string;
}

const AlbumArt: React.FC<AlbumArtProps> = ({ src, alt, size = 96, "data-testid": testId }) => {
  const [failed, setFailed] = useState(false);

  // Decide whether to show the image or the placeholder
  const showImage = useMemo(() => Boolean(src && !failed), [src, failed]);

  // Safe alt text for the <img>; container still has an aria-label for context
  const imgAlt = alt && alt.trim().length > 0 ? alt : "Album artwork";

  return (
    <div
      className="eh-album-art eh-glass"
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
      aria-label="Album artwork"
      data-testid={testId ?? "album-art"}
    >
      {showImage ? (
        <img
          className="eh-album-art__img"
          src={src}
          alt={imgAlt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          className="eh-album-art__placeholder"
          aria-hidden="true"
          style={{
            fontSize: Math.max(16, Math.floor(size * 0.4)),
            lineHeight: 1,
            userSelect: "none",
            opacity: 0.85,
          }}
        >
          ♪
        </div>
      )}
    </div>
  );
};

export default AlbumArt;
