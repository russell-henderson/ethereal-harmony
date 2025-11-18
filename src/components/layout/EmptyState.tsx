// src/components/layout/EmptyState.tsx
/**
 * EmptyState
 * -----------------------------------------------------------------------------
 * Reusable empty state component for use in split-pane panes.
 * Provides consistent messaging and styling for "No tracks found" and similar states.
 */

import React from "react";

export interface EmptyStateProps {
  /** Main message to display */
  message: string;
  
  /** Optional secondary/subtitle text */
  subtitle?: string;
  
  /** Optional icon or emoji to display */
  icon?: string;
  
  /** Optional className for styling */
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  subtitle,
  icon = "♪",
  className = "",
}) => {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--eh-gap-32, 32px)",
        color: "var(--eh-text-muted)",
        textAlign: "center",
        minHeight: "200px",
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: "48px",
            marginBottom: "var(--eh-gap-16, 16px)",
            opacity: 0.5,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: "var(--eh-fs-md, 16px)",
          fontWeight: 600,
          marginBottom: subtitle ? "var(--eh-gap-8, 8px)" : 0,
        }}
      >
        {message}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "var(--eh-fs-sm, 14px)",
            opacity: 0.7,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

