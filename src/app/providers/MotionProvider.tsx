// src/app/providers/MotionProvider.tsx
import React, { ReactNode, useMemo } from "react";
import { MotionConfig } from "framer-motion";

/**
 * MotionProvider
 * -----------------------------------------------------------------------------
 * Phase: 1 (Foundation)
 * Role: Global wrapper around Framer Motion to ensure:
 *   - Respect for user preferences (reduced motion).
 *   - Consistent default transition timings across the app.
 *   - Centralized control so all motion follows the same configuration.
 *
 * Architecture:
 * - Placed in src/app/providers per blueprint.
 * - Consumed at the top level of AppShell (via AppProviders).
 * - We rely on Framer Motion's `MotionConfig` which reads `prefers-reduced-motion`
 *   when configured with `reducedMotion="user"`.
 *
 * Accessibility:
 * - Supports WCAG by reducing or disabling animations when the OS/user agent
 *   indicates reduced motion preference.
 * - All animations should be meaningful and non-distracting.
 *
 * Performance:
 * - Centralizing transitions prevents excessive re-renders and ensures a
 *   predictable, consistent animation budget.
 */

// ----------------------------- Types -----------------------------------------

export interface MotionProviderProps {
  children: ReactNode;
}

// ----------------------------- Provider --------------------------------------

export const MotionProvider: React.FC<MotionProviderProps> = ({ children }) => {
  /**
   * Define app-wide transition defaults.
   * These are tuned for Material-style "fluid but snappy" interactions.
   */
  const transition = useMemo(
    () => ({
      type: "spring" as const,
      damping: 24,
      stiffness: 200,
      mass: 1,
    }),
    []
  );

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      {children}
    </MotionConfig>
  );
};

export default MotionProvider;
