// src/lib/utils/useHotkeys.ts
/**
 * Ethereal Harmony — React hook wrapper for Hotkeys manager
 *
 * Purpose:
 *  - Provide a React-friendly way to bind/unbind the project's default
 *    visualization hotkeys (P/H/D) and optional extra bindings per component.
 *  - Keep the original behavior the repo already used, but route through the
 *    central Hotkeys manager so global rules (typing targets, repeat, etc.)
 *    are consistent.
 *
 * Defaults (Phase 1):
 *  - P: cycle visualizer presets
 *  - H: toggle HDR
 *  - D: toggle dimmer
 *
 * Notes:
 *  - Selectors are primitive to avoid re-renders (Zustand best practice).
 *  - SSR safe: no-ops on the server.
 */

import { useEffect } from "react";
import Hotkeys, { EH_HOTKEYS, HotkeyHandler } from "@/lib/utils/Hotkeys";
import { useVizStore } from "@/lib/state/useVizStore";

export type ExtraHotkey = {
  combo: string;
  handler: HotkeyHandler;
  /** If true, do not preventDefault on match. Default false. */
  allowDefault?: boolean;
  /** Allow firing while typing in inputs/textarea. Default false. */
  allowInInputs?: boolean;
  /** Allow auto-repeat while holding keys. Default false. */
  allowRepeat?: boolean;
  /** Optional scope label for easier cleanup (defaults to "react:useHotkeys"). */
  scope?: string;
};

export type UseHotkeysOptions = {
  /** Bind the default EH visualizer hotkeys (P/H/D). Default true. */
  enableDefaults?: boolean;
  /** Additional bindings owned by the component. */
  extra?: ExtraHotkey[];
};

export const useHotkeys = (options: UseHotkeysOptions = {}): void => {
  const { enableDefaults = true, extra = [] } = options;

  // Pull primitive actions from the viz store
  const cyclePreset = useVizStore((s: any) => s?.cyclePreset);
  const toggleHDR = useVizStore((s: any) => s?.toggleHDR);
  const toggleDimmer = useVizStore((s: any) => s?.toggleDimmer);

  useEffect(() => {
    const offs: Array<() => void> = [];

    if (enableDefaults) {
      if (typeof cyclePreset === "function") {
        offs.push(
          Hotkeys.add(EH_HOTKEYS.VIZ_CYCLE_PRESET, () => cyclePreset(), {
            scope: "react:useHotkeys",
          })
        );
      }
      if (typeof toggleHDR === "function") {
        offs.push(
          Hotkeys.add(EH_HOTKEYS.VIZ_TOGGLE_HDR, () => toggleHDR(), {
            scope: "react:useHotkeys",
          })
        );
      }
      if (typeof toggleDimmer === "function") {
        offs.push(
          Hotkeys.add(EH_HOTKEYS.VIZ_TOGGLE_DIMMER, () => toggleDimmer(), {
            scope: "react:useHotkeys",
          })
        );
      }
    }

    // Extra, component-owned bindings
    for (const hk of extra) {
      offs.push(
        Hotkeys.add(hk.combo, hk.handler, {
          preventDefault: hk.allowDefault ? false : true,
          allowInInputs: !!hk.allowInInputs,
          allowRepeat: !!hk.allowRepeat,
          scope: hk.scope ?? "react:useHotkeys",
        })
      );
    }

    return () => {
      offs.forEach((off) => off());
    };
  }, [enableDefaults, extra, cyclePreset, toggleHDR, toggleDimmer]);
};

export default useHotkeys;
