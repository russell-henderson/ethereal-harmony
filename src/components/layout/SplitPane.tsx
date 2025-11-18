// src/components/layout/SplitPane.tsx
/**
 * SplitPane
 * -----------------------------------------------------------------------------
 * Reusable split-pane layout component implementing the E1, E2, E3 structure:
 * - Left pane (E1): Main list view (narrower, scrollable)
 * - Right header (E2): Optional filter/header bar
 * - Right body (E3): Detail view (wider, scrollable)
 * 
 * Uses CSS Grid for layout with independent scrolling regions.
 * Responsive: stacks vertically on narrow screens.
 */

import React from "react";

export interface SplitPaneProps {
  /** Left pane content (E1) - main list */
  paneLeft?: React.ReactNode;
  
  /** Right header content (E2) - filters, sort controls, queue header */
  paneRightHeader?: React.ReactNode;
  
  /** Right body content (E3) - active item detail or queue contents */
  paneRightBody?: React.ReactNode;
  
  /** Optional left pane width (default: 300px) */
  leftPaneWidth?: string;
  
  /** Optional className for styling */
  className?: string;
}

const SplitPane: React.FC<SplitPaneProps> = ({
  paneLeft,
  paneRightHeader,
  paneRightBody,
  leftPaneWidth = "300px",
  className = "",
}) => {
  return (
    <div
      className={`split-pane ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: `${leftPaneWidth} 1fr`,
        gridTemplateRows: "auto 1fr",
        gap: "var(--eh-component-gap, 24px)",
        height: "100%",
        minHeight: 0,
      }}
      // Responsive: stack vertically on narrow screens
      data-responsive="true"
    >
      {/* Left pane (E1) - spans both rows */}
      <div
        className="split-pane__left"
        style={{
          gridRow: "1 / -1",
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
        }}
      >
        {paneLeft}
      </div>

      {/* Right header (E2) */}
      {paneRightHeader && (
        <div
          className="split-pane__right-header"
          style={{
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {paneRightHeader}
        </div>
      )}

      {/* Right body (E3) */}
      <div
        className="split-pane__right-body"
        style={{
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
        }}
      >
        {paneRightBody}
      </div>
    </div>
  );
};

export default SplitPane;

