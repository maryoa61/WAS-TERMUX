/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VM State Snapshot Persistence Modal
 * Manages multi-megabyte IndexedDB VM state snapshots,
 * binary export/import to Android device storage, and auto-save timers.
 */

import React, { useEffect, useState } from 'react';
import { storage, type VMSnapshot } from '../storage';
import { vmManager } from '../vm-manager';
import {
  X,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Clock,
  HardDrive,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnapshotsModal: React.FC<SnapshotsModalProps> = ({ isOpen, onClose }) => {
  const [snapshots, setSnapshots] = useState<Omit<VMSnapshot, 'data'>[]>([]);
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(false);

  const loadSnapshots = async () => {
    try {
      const list = await storage.listSnapshots();
      setSnapshots(list);
    } catch (e: any) {
      console.warn('Failed to load snapshots:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
      storage.getSettings().then((s) => setAutoSave(s.autoSaveEnabled));
    }
  }, [isOpen]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    setStatusMessage({ text: 'Dumping VM CPU registers & RAM memory...', type: 'success' });
    try {
      const buffer = await vmManager.saveState();
      const name = snapshotName.trim() || `Android Snapshot ${new Date().toLocaleTimeString()}`;
      await storage.saveSnapshot(name, buffer);
      setSnapshotName('');
      await loadSnapshots();
      showToast('State snapshot saved to IndexedDB!');
    } catch (err: any) {
      showToast(`Snapshot error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreSnapshot = async (id: string) => {
    if (!confirm('Restore this VM snapshot? Current unsaved memory will be replaced.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const fullSnapshot = await storage.loadSnapshot(id);
      if (!fullSnapshot) throw new Error('Snapshot record not found');

      await vmManager.restoreState(fullSnapshot.data);
      showToast(`Snapshot '${fullSnapshot.name}' restored into VM!`);
      onClose();
    } catch (err: any) {
      showToast(`Restore error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportToFile = async (id: string) => {
    try {
      await storage.exportSnapshotAsFile(id);
      showToast('Snapshot binary downloaded to device!');
    } catch (err: any) {
      showToast(`Export error: ${err.message}`, 'error');
    }
  };

  const handleImportFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const imported = await storage.importSnapshotFromFile(file);
      await loadSnapshots();
      showToast(`Imported '${imported.name}' (${(imported.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`);
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (confirm('Delete this saved snapshot from IndexedDB?')) {
      await storage.deleteSnapshot(id);
      await loadSnapshots();
      showToast('Snapshot deleted');
    }
  };

  const handleToggleAutoSave = async () => {
    const newVal = !autoSave;
    setAutoSave(newVal);
    await storage.saveSettings({ autoSaveEnabled: newVal });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 drawer-backdrop">
      <div className="w-full max-w-lg bg-[#0d141e] border border-[#233346] rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2d3e] bg-[#0a0f16]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00ff88]/10 text-[#00ff88]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">VM State Persistence (IndexedDB)</h2>
              <p className="text-[11px] text-gray-400">Save and restore running Linux memory & packages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2533]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30'
                : 'bg-red-500/15 text-red-300 border-red-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Create snapshot box */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2.5">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>Capture Live VM State</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Snapshot label (e.g. Node + Python installed)"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                className="flex-1 bg-[#090e15] border border-[#2a3c52] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff88]"
              />
              <button
                onClick={handleCreateSnapshot}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-lg bg-[#00ff88] text-black font-semibold text-xs hover:bg-[#00dd77] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={handleToggleAutoSave}
                  className="rounded border-[#293d54] text-[#00ff88] focus:ring-0"
                />
                <span>Auto-save state every 5 minutes</span>
              </label>

              <label className="cursor-pointer text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Import .bin</span>
                <input
                  type="file"
                  accept=".bin,.v86state"
                  className="hidden"
                  onChange={handleImportFromFile}
                />
              </label>
            </div>
          </div>

          {/* Stored Snapshots List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Saved Snapshots ({snapshots.length})
            </h3>

            {snapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs bg-[#111924] rounded-lg border border-[#1b2636]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                <p>No saved snapshots in browser IndexedDB.</p>
                <p className="mt-1">Tap "Save" above to preserve installed packages and code.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {snapshots.map((snap) => {
                  const sizeMb = (snap.sizeBytes / (1024 * 1024)).toFixed(1);
                  const dateStr = new Date(snap.timestamp).toLocaleString();

                  return (
                    <div
                      key={snap.id}
                      className="p-2.5 rounded-lg bg-[#141e2c] border border-[#223348] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{snap.name}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span>{sizeMb} MB</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleRestoreSnapshot(snap.id)}
                          disabled={isProcessing}
                          className="px-2 py-1 rounded bg-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/30 text-xs font-medium flex items-center gap-1"
                          title="Restore into running VM"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => handleExportToFile(snap.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-cyan-400 hover:bg-[#1e2d40]"
                          title="Export .bin file to Android storage"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#1e2d40]"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0a0f16] border-t border-[#1f2d3e] flex items-center justify-between text-xs text-gray-400">
          <span>Persists in IndexedDB across browser reloads</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#1e2d40] text-gray-300 hover:bg-[#283b54]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
