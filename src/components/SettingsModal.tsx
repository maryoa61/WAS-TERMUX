/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VM Configuration & Network Settings Modal
 * Configurable WebSocket proxy relay for mobile internet,
 * memory allocation, boot profiles, and terminal appearance.
 */

import React, { useEffect, useState } from 'react';
import { storage, type AppSettings } from '../storage';
import { vmManager } from '../vm-manager';
import {
  X,
  Sliders,
  Globe,
  Cpu,
  Monitor,
  RotateCcw,
  Check,
  Radio,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      storage.getSettings().then(setSettings);
    }
  }, [isOpen]);

  const handleSave = async (updated: Partial<AppSettings>) => {
    if (!settings) return;
    const newSettings = await storage.saveSettings(updated);
    setSettings(newSettings);

    // Apply to VM manager
    vmManager.setConfig({
      memorySizeMb: newSettings.memoryMb,
      networkRelayUrl: newSettings.networkRelayUrl,
      bootImage: newSettings.bootImage,
      customImageUrl: newSettings.customImageUrl,
    });

    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
    onSettingsSaved();
  };

  const handleRebootVM = async () => {
    if (confirm('Reboot Linux Virtual Machine now?')) {
      onClose();
      await vmManager.reboot();
    }
  };

  if (!isOpen || !settings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 drawer-backdrop">
      <div className="w-full max-w-lg bg-[#0d141e] border border-[#233346] rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2d3e] bg-[#0a0f16]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">VM &amp; Network Configuration</h2>
              <p className="text-[11px] text-gray-400">Virtualization parameters &amp; cellular relay proxy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2533]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Section 1: In-Browser Network Relay */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Virtual Network Interface (WebSocket Relay)</span>
              </label>
              <span className="text-[10px] text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                Online
              </span>
            </div>
            <p className="text-gray-400 text-[11px]">
              Browsers forbid raw TCP/UDP. The VM communicates with the internet (for <code className="text-cyan-300">apk</code>, <code className="text-cyan-300">curl</code>, <code className="text-cyan-300">pip</code>) through this WebSocket proxy relay:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.networkRelayUrl}
                onChange={(e) => setSettings({ ...settings, networkRelayUrl: e.target.value })}
                placeholder="wss://relay.widgetry.org/"
                className="flex-1 bg-[#090e15] border border-[#2a3c52] rounded-lg px-3 py-1.5 text-white font-mono text-[11px] focus:outline-none focus:border-[#00ff88]"
              />
              <button
                onClick={() => handleSave({ networkRelayUrl: settings.networkRelayUrl })}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs"
              >
                Apply
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleSave({ networkRelayUrl: 'wss://relay.widgetry.org/' })}
                className="text-[10px] text-gray-400 hover:text-cyan-300 underline"
              >
                Reset to Default Relay
              </button>
              <span className="text-gray-600">•</span>
              <button
                onClick={() => handleSave({ networkRelayUrl: 'wss://wisp.mercurywork.shop/' })}
                className="text-[10px] text-gray-400 hover:text-cyan-300 underline"
              >
                Mercury Wisp Relay
              </button>
            </div>
          </div>

          {/* Section 2: Virtual Hardware Memory */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>RAM Memory Allocation</span>
            </label>
            <p className="text-gray-400 text-[11px]">
              Allocated inside WebAssembly linear memory pool. (Requires reboot to resize).
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[128, 256, 512].map((mb) => (
                <button
                  key={mb}
                  onClick={() => handleSave({ memoryMb: mb })}
                  className={`py-2 px-3 rounded-lg border text-center font-mono text-xs transition-colors ${
                    settings.memoryMb === mb
                      ? 'bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88] font-bold'
                      : 'bg-[#182332] border-[#25354a] text-gray-300 hover:bg-[#202f43]'
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Boot Image Profile */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>Linux Image &amp; Boot Profile</span>
            </label>
            <div className="space-y-1.5">
              <label
                onClick={() => handleSave({ bootImage: 'alpine-fast' })}
                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                  settings.bootImage === 'alpine-fast'
                    ? 'bg-[#182637] border-[#00ff88]/60 text-white'
                    : 'bg-[#16202c] border-[#223143] text-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="bootProfile"
                  checked={settings.bootImage === 'alpine-fast'}
                  onChange={() => {}}
                  className="mt-0.5 text-[#00ff88]"
                />
                <div>
                  <p className="font-semibold text-white">Fast Alpine Micro-Kernel (Recommended)</p>
                  <p className="text-[11px] text-gray-400">Instant boot (&lt;1s), minimal download, optimized for mobile cellular data.</p>
                </div>
              </label>

              <label
                onClick={() => handleSave({ bootImage: 'alpine-iso' })}
                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                  settings.bootImage === 'alpine-iso'
                    ? 'bg-[#182637] border-[#00ff88]/60 text-white'
                    : 'bg-[#16202c] border-[#223143] text-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="bootProfile"
                  checked={settings.bootImage === 'alpine-iso'}
                  onChange={() => {}}
                  className="mt-0.5 text-[#00ff88]"
                />
                <div>
                  <p className="font-semibold text-white">Full Alpine Linux Standard ISO</p>
                  <p className="text-[11px] text-gray-400">Complete raw Alpine ISO image (~150MB). SeaBIOS boot sequence.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Display & Appearance */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <label className="font-semibold text-white flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Terminal Display &amp; Visuals</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded bg-[#16202c] border border-[#223143] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.scanlinesEnabled}
                  onChange={(e) => handleSave({ scanlinesEnabled: e.target.checked })}
                  className="rounded text-[#00ff88] focus:ring-0"
                />
                <span className="text-gray-300">CRT Scanlines</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded bg-[#16202c] border border-[#223143] cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.screenReaderMode}
                  onChange={(e) => handleSave({ screenReaderMode: e.target.checked })}
                  className="rounded text-[#00ff88] focus:ring-0"
                />
                <span className="text-gray-300">ScreenReader Mode</span>
              </label>
            </div>
          </div>

          {/* Danger zone: Reboot VM */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleRebootVM}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reboot Linux VM</span>
            </button>
            {isSavedToast && (
              <span className="text-[#00ff88] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Settings applied</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0f16] border-t border-[#1f2d3e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1f2d3e] hover:bg-[#283b54] text-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
