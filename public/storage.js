/**
 * WASM-Termux Storage Engine (Vanilla ES Module)
 * Robust IndexedDB & OPFS persistence layer for VM state snapshots and files.
 */

const DB_NAME = 'wasm_termux_db';
const DB_VERSION = 1;

export class StorageManager {
  constructor() {
    this.dbPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

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

  async saveSnapshot(name, data, bootProfile = 'alpine-fast', note = '') {
    const db = await this.dbPromise;
    const snapshot = {
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

  async loadSnapshot(id) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async listSnapshots() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).map((s) => ({
          id: s.id,
          name: s.name,
          timestamp: s.timestamp,
          sizeBytes: s.sizeBytes,
          bootProfile: s.bootProfile,
          note: s.note,
        }));
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSnapshot(id) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['snapshots'], 'readwrite');
      const store = tx.objectStore('snapshots');
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async exportSnapshotAsFile(id) {
    const snapshot = await this.loadSnapshot(id);
    if (!snapshot) throw new Error('Snapshot not found');

    const blob = new Blob([snapshot.data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snapshot.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${snapshot.timestamp}.v86state.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importSnapshotFromFile(file) {
    const buffer = await file.arrayBuffer();
    const name = file.name.replace(/\.[^/.]+$/, '');
    return this.saveSnapshot(name, buffer, 'imported', `Imported from ${file.name}`);
  }

  async saveFile(path, content) {
    const db = await this.dbPromise;
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const name = cleanPath.split('/').filter(Boolean).pop() || 'file';
    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.byteLength;

    const file = {
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

  async getFile(path) {
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

  async listFiles() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['files'], 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(path) {
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

  async exportFile(path) {
    const file = await this.getFile(path);
    if (!file) throw new Error('File not found: ' + path);

    const blob = new Blob([file.content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async getSettings() {
    const defaultSettings = {
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

  async saveSettings(settings) {
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
