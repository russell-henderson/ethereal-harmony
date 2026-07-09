// src/lib/audio/LibraryDB.ts
/**
 * Ethereal Harmony — IndexedDB Local Library Database
 * -----------------------------------------------------------------------------
 * A zero-dependency, promise-wrapped IndexedDB utility to store local audio
 * files (Blobs/Files), metadata, cover art blobs, and remote stream urls.
 */

export interface DbTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  source: "local" | "remote";
  url: string; // Dynamic Object URL for local, static URL for remote
  duration?: number;
  mime?: string;
  isStream?: boolean;
  addedAt: number;
  playCount: number;
  fileBlob?: Blob; // Stored binary file for local tracks
  artworkBlob?: Blob; // Stored cover art binary
}

const DB_NAME = "EtherealHarmonyDB";
const STORE_NAME = "tracks";
const DB_VERSION = 1;

class LibraryDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported in this environment."));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error || new Error("Failed to open IndexedDB"));
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a track to the database.
   */
  async saveTrack(track: DbTrack): Promise<void> {
    const db = await this.initDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(transaction.name ? STORE_NAME : STORE_NAME);
      
      // Strip any runtime object URLs before saving to avoid storing temporary blob links
      const trackToStore = { ...track };
      if (track.source === "local") {
        trackToStore.url = ""; // Will be dynamically generated on load
      }

      const request = store.put(trackToStore);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Failed to save track"));
    });
  }

  /**
   * Load all tracks from the database.
   */
  async getAllTracks(): Promise<DbTrack[]> {
    const db = await this.initDb();
    return new Promise<DbTrack[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const tracks = request.result as DbTrack[];
        resolve(tracks);
      };

      request.onerror = () => reject(request.error || new Error("Failed to load tracks"));
    });
  }

  /**
   * Delete a track from the database.
   */
  async deleteTrack(id: string): Promise<void> {
    const db = await this.initDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Failed to delete track: ${id}`));
    });
  }

  /**
   * Update the play count of a track in the database.
   */
  async incrementPlayCount(id: string): Promise<void> {
    const db = await this.initDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const track = getRequest.result as DbTrack;
        if (track) {
          track.playCount = (track.playCount || 0) + 1;
          const putRequest = store.put(track);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error || new Error("Failed to increment play count"));
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error || new Error("Failed to fetch track for play count increment"));
    });
  }
}

export const libraryDB = new LibraryDB();
export default libraryDB;
