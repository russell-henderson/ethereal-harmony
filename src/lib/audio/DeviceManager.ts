// src/lib/audio/DeviceManager.ts
/**
 * DEPRECATED SHIM
 * -----------------------------------------------------------------------------
 * Legacy import path kept temporarily to avoid breaking existing code.
 * Please migrate to:
 *   import outputDeviceManager from "@/lib/audio/OutputDeviceManager";
 *
 * This shim will be removed after all references are updated.
 */

export type { OutputDevice } from "./OutputDeviceManager";
export { OutputDeviceManager } from "./OutputDeviceManager";
export { outputDeviceManager as default } from "./OutputDeviceManager";
