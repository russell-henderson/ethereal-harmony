/**
 * Shared visualizer types
 * - Keep only types or const name arrays here to avoid duplication of PRESETS data
 * - The store owns the concrete PRESETS object and the logic for defaults
 */

export type VizPresetName = "Nebula" | "Glass Waves" | "Strobe Pulse";

/**
 * Optional convenience list if you need it for external UIs.
 * The store still exposes getPresetList which should be preferred.
 */
export const VIZ_PRESET_NAMES: VizPresetName[] = ["Nebula", "Glass Waves", "Strobe Pulse"];
