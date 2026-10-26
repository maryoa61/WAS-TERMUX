/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VM Configuration & Network Settings Modal
 * Configurable WebSocket proxy relay with privacy advisory,
 * auto-login credentials, RAM allocation, and boot profiles.
 */

import React, { useEffect, useState } from 'react';
import { storage, type AppSettings } from '../storage';
import { vmManager } from '../vm-manager';
import { ConfirmModal } from './ConfirmModal';
import {
  X,
  Sliders,
  Globe,
  Cpu,
  Monitor,
  RotateCcw,
  Check,
  Radio,
  ShieldAlert,
  KeyRound,
  User,
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
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);

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
      networkRelayEnabled: newSettings.networkRelayEnabled,
      networkRelayUrl: newSettings.networkRelayUrl,
      autoLoginUser: newSettings.autoLoginUser,
      autoLoginPassword: newSettings.autoLoginPassword,
      bootImage: newSettings.bootImage,
      customImageUrl: newSettings.customImageUrl,
    });

    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
    onSettingsSaved();
  };

  const handleConfirmReboot = async () => {
    setShowRebootConfirm(false);
    onClose();
    await vmManager.reboot();
  };

  if (!isOpen || !settings) return null;

  return (
    <>
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
            {/* Section 1: In-Browser Network Relay with Privacy Notice */}
            <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Virtual Network Interface (WebSocket Relay)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    settings.networkRelayEnabled
                      ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {settings.networkRelayEnabled ? 'Enabled' : 'Disabled (Air-gapped)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.networkRelayEnabled}
                    onChange={(e) => handleSave({ networkRelayEnabled: e.target.checked })}
                    className="rounded text-[#00ff88] focus:ring-0"
                  />
                </label>
              </div>

              {/* Security & Privacy Advisory */}
              <div className="p-2.5 bg-amber-950/25 border border-amber-500/30 rounded-lg text-[11px] text-amber-200/90 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Security &amp; Privacy Notice</span>
                </div>
                <p className="leading-relaxed text-[10px]">
                  Web browsers block raw TCP sockets. When the relay is enabled, the VM encapsulates Ethernet packets over WebSocket through the relay server to access the internet (<code className="text-amber-100">apk</code>, <code className="text-amber-100">curl</code>). 
                  <strong> Public relays can inspect unencrypted traffic.</strong> For strict privacy, run your own relay (e.g. self-hosted <code className="text-amber-100">wisp-server</code>) or keep relay disabled for 100% offline isolation.
                </p>
              </div>

              {settings.networkRelayEnabled && (
                <div className="space-y-2 pt-1">
                  <p className="text-gray-400 text-[11px]">Relay Endpoint URL:</p>
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
                  <div className="flex gap-2 text-[10px] text-gray-400">
                    <button
                      onClick={() => handleSave({ networkRelayUrl: 'wss://relay.widgetry.org/' })}
                      className="hover:text-cyan-300 underline"
                    >
                      Default Relay
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleSave({ networkRelayUrl: 'wss://wisp.mercurywork.shop/' })}
                      className="hover:text-cyan-300 underline"
                    >
                      Mercury Wisp
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Auto-Login Credentials */}
            <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Console Auto-Login</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> User
                  </span>
                  <input
                    type="text"
                    value={settings.autoLoginUser}
                    onChange={(e) => setSettings({ ...settings, autoLoginUser: e.target.value })}
                    onBlur={() => handleSave({ autoLoginUser: settings.autoLoginUser })}
                    placeholder="root"
                    className="w-full bg-[#090e15] border border-[#2a3c52] rounded px-2.5 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-[#00ff88]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 mb-1">
                    Password (if required)
                  </span>
                  <input
                    type="password"
                    value={settings.autoLoginPassword || ''}
                    onChange={(e) => setSettings({ ...settings, autoLoginPassword: e.target.value })}
                    onBlur={() => handleSave({ autoLoginPassword: settings.autoLoginPassword })}
                    placeholder="Leave blank for none"
                    className="w-full bg-[#090e15] border border-[#2a3c52] rounded px-2.5 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-[#00ff88]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Virtual Hardware Memory */}
            <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
              <label className="font-semibold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>RAM Memory Allocation</span>
              </label>
              <p className="text-gray-400 text-[11px]">
                Allocated inside WebAssembly linear memory pool. (Requires reboot to take effect).
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

            {/* Section 4: Boot Image Profile */}
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

            {/* Section 5: Display & Appearance */}
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
                onClick={() => setShowRebootConfirm(true)}
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

      <ConfirmModal
        isOpen={showRebootConfirm}
        title="Reboot Linux Virtual Machine"
        message="Are you sure you want to reboot the virtual machine? Any unsaved memory state will be reset."
        confirmLabel="Reboot Now"
        isDestructive={true}
        onConfirm={handleConfirmReboot}
        onCancel={() => setShowRebootConfirm(false)}
      />
    </>
  );
};
