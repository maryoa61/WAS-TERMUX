/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Storage Engine for WASM-Termux
 * Robust IndexedDB & OPFS persistent layer for VM state snapshots and virtual files.
 */

export interface VMSnapshot {
  id: string;
  name: string;
  timestamp: number;
  sizeBytes: number;
  data: ArrayBuffer;
  bootProfile?: string;
  note?: string;
}

export interface VMFile {
  path: string;
  name: string;
  size: number;
  lastModified: number;
  content: Uint8Array | string;
  isDir?: boolean;
}

export interface AppSettings {
  networkRelayUrl: string;
  memoryMb: number;
  bootImage: 'alpine-fast' | 'alpine-iso' | 'custom';
  customImageUrl?: string;
  fontSize: number;
  fontFamily: string;
  autoSaveIntervalMinutes: number;
  autoSaveEnabled: boolean;
  scanlinesEnabled: boolean;
  screenReaderMode: boolean;
}

const DB_NAME = 'wasm_termux_db';
const DB_VERSION = 1;

export class StorageManager {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'path' });
          fileStore.createIndex('lastModified', 'lastModified', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a VM state snapshot to IndexedDB
   */
  async saveSnapshot(name: string, data: ArrayBuffer, bootProfile = 'alpine-fast', note = ''): Promise<VMSnapshot> {
    const db = await this.dbPromise;
    const snapshot: VMSnapshot = {
      id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      sizeBytes: data.byteLength,
      data,
      bootProfile,
      note,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readwrite');
      const store = tx.objectStore('snapshots');
      const req = store.put(snapshot);

      req.onsuccess = () => resolve(snapshot);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Load snapshot by ID
   */
  async loadSnapshot(id: string): Promise<VMSnapshot | null> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * List all stored snapshots (metadata only or light records)
   */
  async listSnapshots(): Promise<Omit<VMSnapshot, 'data'>[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).map((s: VMSnapshot) => ({
          id: s.id,
          name: s.name,
          timestamp: s.timestamp,
          sizeBytes: s.sizeBytes,
          bootProfile: s.bootProfile,
          note: s.note,
        }));
        list.sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(id: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readwrite');
      const store = tx.objectStore('snapshots');
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Export snapshot as downloaded .bin file to Android storage
   */
  async exportSnapshotAsFile(id: string): Promise<void> {
    const snapshot = await this.loadSnapshot(id);
    if (!snapshot) throw new Error('Snapshot not found');
    const blob = new Blob([snapshot.data as any], { type: 'application/octet-stream' });


    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${snapshot.timestamp}.v86state.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import snapshot from uploaded File or Blob
   */
  async importSnapshotFromFile(file: File): Promise<VMSnapshot> {
    const buffer = await file.arrayBuffer();
    const name = file.name.replace(/\.[^/.]+$/, '');
    return this.saveSnapshot(name, buffer, 'imported', `Imported from ${file.name}`);
  }

  /**
   * Filesystem bridge storage methods
   */
  async saveFile(path: string, content: Uint8Array | string): Promise<VMFile> {
    const db = await this.dbPromise;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const name = cleanPath.split('/').filter(Boolean).pop() || 'file';
    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.byteLength;

    const file: VMFile = {
      path: cleanPath,
      name,
      size,
      lastModified: Date.now(),
      content,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readwrite');
      const store = tx.objectStore('files');
      const req = store.put(file);

      req.onsuccess = () => resolve(file);
      req.onerror = () => reject(req.error);
    });
  }

  async getFile(path: string): Promise<VMFile | null> {
    const db = await this.dbPromise;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(cleanPath);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async listFiles(): Promise<VMFile[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.dbPromise;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readwrite');
      const store = tx.objectStore('files');
      const req = store.delete(cleanPath);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async exportFile(path: string): Promise<void> {
    const file = await this.getFile(path);
    if (!file) throw new Error('File not found: ' + path);

    const blob = new Blob([file.content as any], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Settings persistence
   */
  async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      networkRelayUrl: 'wss://relay.widgetry.org/',
      memoryMb: 256,
      bootImage: 'alpine-fast',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, monospace',
      autoSaveIntervalMinutes: 5,
      autoSaveEnabled: false,
      scanlinesEnabled: false,
      screenReaderMode: false,
    };

    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const tx = db.transaction(['settings'], 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('app_settings');

        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve({ ...defaultSettings, ...req.result.value });
          } else {
            resolve(defaultSettings);
          }
        };
        req.onerror = () => resolve(defaultSettings);
      });
    } catch {
      return defaultSettings;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: 'app_settings', value: updated });

      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  }
}

export const storage = new StorageManager();
