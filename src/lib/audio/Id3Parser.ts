// src/lib/audio/Id3Parser.ts
/**
 * Browser-safe ID3v2 Metadata Parser
 * -----------------------------------------------------------------------------
 * A lightweight, dependency-free ID3v2 tag parser designed for standard web
 * environments. Avoids Node.js built-ins and polyfills, ensuring zero build
 * or bundling overhead on platforms like Vercel.
 */

export interface ParsedId3 {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  artworkUrl?: string;
  artworkBlob?: Blob;
}

/**
 * Decode text array based on the ID3v2 encoding byte indicator:
 * - 0: ISO-8859-1 (Latin1)
 * - 1: UTF-16 with BOM
 * - 2: UTF-16BE without BOM
 * - 3: UTF-8
 */
function decodeText(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 0) {
      return new TextDecoder("latin1").decode(bytes).replace(/\0+$/, "").trim();
    } else if (encoding === 1) {
      return new TextDecoder("utf-16").decode(bytes).replace(/\0+$/, "").trim();
    } else if (encoding === 2) {
      return new TextDecoder("utf-16be").decode(bytes).replace(/\0+$/, "").trim();
    } else if (encoding === 3) {
      return new TextDecoder("utf-8").decode(bytes).replace(/\0+$/, "").trim();
    }
  } catch {
    // Fail-safe default
  }
  return "";
}

/**
 * Parses ID3v2 tags from a local file's ArrayBuffer.
 */
export function parseId3(arrayBuffer: ArrayBuffer): ParsedId3 {
  const result: ParsedId3 = {};
  if (arrayBuffer.byteLength < 10) return result;

  const view = new DataView(arrayBuffer);

  // Check ID3 magic header: "ID3" (0x49 0x44 0x33)
  if (
    view.getUint8(0) !== 0x49 ||
    view.getUint8(1) !== 0x44 ||
    view.getUint8(2) !== 0x33
  ) {
    return result;
  }

  const version = view.getUint8(3); // e.g. 3 or 4
  
  // Read size (4 bytes, synchsafe integer: 7 bits per byte)
  const s0 = view.getUint8(6);
  const s1 = view.getUint8(7);
  const s2 = view.getUint8(8);
  const s3 = view.getUint8(9);
  const totalSize = (s0 << 21) | (s1 << 14) | (s2 << 7) | s3;

  let offset = 10;
  const limit = Math.min(offset + totalSize, arrayBuffer.byteLength);

  while (offset + 10 < limit) {
    // Read 4-character Frame ID
    const frameId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );

    // Stop if we hit padding (zeros) or non-alphanumeric frame IDs
    if (!/^[A-Z0-9]{4}$/.test(frameId)) {
      break;
    }

    // Read frame size (32-bit int, synchsafe in v2.4, standard in v2.3)
    let frameSize = 0;
    if (version === 4) {
      const fs0 = view.getUint8(offset + 4);
      const fs1 = view.getUint8(offset + 5);
      const fs2 = view.getUint8(offset + 6);
      const fs3 = view.getUint8(offset + 7);
      frameSize = (fs0 << 21) | (fs1 << 14) | (fs2 << 7) | fs3;
    } else {
      frameSize = view.getUint32(offset + 4);
    }

    offset += 10; // Move past frame header

    if (offset + frameSize > limit) break;

    const frameData = new Uint8Array(arrayBuffer, offset, frameSize);

    if (frameSize > 0) {
      try {
        if (frameId === "TIT2") {
          result.title = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === "TPE1") {
          result.artist = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === "TALB") {
          result.album = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === "TYER" || frameId === "TDRC") {
          result.year = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === "TCON") {
          result.genre = decodeText(frameData.subarray(1), frameData[0]);
        } else if (frameId === "APIC") {
          // Parse APIC frame (Cover Art)
          const encoding = frameData[0];
          
          // 1. MIME Type (null-terminated ASCII)
          let mimeLimit = 1;
          while (mimeLimit < frameData.length && frameData[mimeLimit] !== 0) {
            mimeLimit++;
          }
          const mimeType = new TextDecoder("ascii").decode(frameData.subarray(1, mimeLimit));
          
          // 2. Picture Type (1 byte)
          const pictureType = frameData[mimeLimit + 1];
          
          // 3. Description (null-terminated string, encoding-dependent)
          let descLimit = mimeLimit + 2;
          if (encoding === 1 || encoding === 2) {
            // UTF-16 description (2-byte null terminator)
            while (descLimit + 1 < frameData.length && !(frameData[descLimit] === 0 && frameData[descLimit + 1] === 0)) {
              descLimit += 2;
            }
            descLimit += 2;
          } else {
            // single-byte null terminator
            while (descLimit < frameData.length && frameData[descLimit] !== 0) {
              descLimit++;
            }
            descLimit++;
          }
          
          // Remaining bytes is raw image data
          const picData = frameData.subarray(descLimit);
          if (picData.length > 0) {
            const blob = new Blob([picData], { type: mimeType || "image/jpeg" });
            result.artworkUrl = URL.createObjectURL(blob);
            result.artworkBlob = blob;
          }
        }
      } catch (err) {
        console.warn(`[Id3Parser] Error parsing frame ${frameId}:`, err);
      }
    }

    offset += frameSize;
  }

  return result;
}
