/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Command Cheat Sheet & Architecture Guide Modal
 */

import React from 'react';
import {
  X,
  Terminal,
  HelpCircle,
  Wifi,
  HardDrive,
  FolderOpen,
  Smartphone,
} from 'lucide-react';

interface QuickHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickHelpModal: React.FC<QuickHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 drawer-backdrop">
      <div className="w-full max-w-lg bg-[#0d141e] border border-[#233346] rounded-xl shadow-2xl flex flex-col max-h-[90vh] text-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2d3e] bg-[#0a0f16]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-[#00ff88]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">WASM-Termux Guide &amp; Commands</h2>
              <p className="text-[11px] text-gray-400">100% Serverless Alpine Linux on Android</p>
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
          {/* Section: Architecture Overview */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-1.5">
            <h3 className="font-semibold text-white flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>How WASM-Termux Runs On Your Phone</span>
            </h3>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Unlike traditional SSH clients or remote VPS tools, this entire Linux kernel and userland executes <strong>100% locally inside your Android browser's WebAssembly sandbox</strong>. No external server executes your code.
            </p>
          </div>

          {/* Section: Mobile Extra Keys */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <h3 className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Android Touch Gestures &amp; Extra Keys</span>
            </h3>
            <ul className="space-y-1.5 text-gray-300 text-[11px]">
              <li>• <strong>Pinch to Zoom:</strong> Pinch with 2 fingers anywhere on the terminal to dynamically resize the font.</li>
              <li>• <strong>Sticky CTRL / ALT:</strong> Tap once for single-shot modifier (e.g. CTRL + C sends SIGINT). Double-tap to lock modifier on.</li>
              <li>• <strong>Android Keyboard Sync:</strong> VisualViewport auto-recalculates terminal height whenever the soft keyboard pops up.</li>
              <li>• <strong>Clipboard Paste:</strong> Tap the "Paste" button on the extra keys bar to send copied text into the shell.</li>
            </ul>
          </div>

          {/* Section: Essential Commands */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-2">
            <h3 className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00ff88]" />
              <span>Alpine Linux Cheat Sheet</span>
            </h3>
            <div className="font-mono text-[11px] space-y-1 bg-[#090d14] p-2.5 rounded border border-[#1d2a3a]">
              <div><span className="text-[#00ff88]">apk add python3</span> <span className="text-gray-500"># Install Python</span></div>
              <div><span className="text-[#00ff88]">apk add nodejs</span> <span className="text-gray-500"># Install Node.js</span></div>
              <div><span className="text-[#00ff88]">python3 hello.py</span> <span className="text-gray-500"># Run Python script</span></div>
              <div><span className="text-[#00ff88]">curl -I https://google.com</span> <span className="text-gray-500"># HTTP test</span></div>
              <div><span className="text-[#00ff88]">free -m</span> <span className="text-gray-500"># Check RAM usage</span></div>
              <div><span className="text-[#00ff88]">uname -a</span> <span className="text-gray-500"># Kernel version</span></div>
            </div>
          </div>

          {/* Section: Network & Files */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[#131d2b] border border-[#213247] rounded-lg">
              <h4 className="font-semibold text-white flex items-center gap-1 text-[11px] mb-1">
                <Wifi className="w-3 h-3 text-cyan-400" />
                <span>Cellular Internet</span>
              </h4>
              <p className="text-gray-400 text-[10px] leading-relaxed">
                Connects over WebSocket proxy relay so commands like <code className="text-cyan-300">apk</code>, <code className="text-cyan-300">git</code>, and <code className="text-cyan-300">curl</code> work over 4G/5G.
                <br /><span className="text-amber-300">Notice:</span> Keep relay disabled or self-host for confidential tasks.
              </p>
            </div>

            <div className="p-2.5 bg-[#131d2b] border border-[#213247] rounded-lg">
              <h4 className="font-semibold text-white flex items-center gap-1 text-[11px] mb-1">
                <FolderOpen className="w-3 h-3 text-amber-400" />
                <span>9p File Bridge</span>
              </h4>
              <p className="text-gray-400 text-[10px] leading-relaxed">
                Tap "Files" to upload source files from Android storage into <code className="text-[#00ff88]">/root/</code> or edit in the mobile editor.
              </p>
            </div>
          </div>

          {/* Section: Snapshots */}
          <div className="p-3 bg-[#131d2b] border border-[#213247] rounded-lg space-y-1.5">
            <h3 className="font-semibold text-white flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>IndexedDB State Persistence</span>
            </h3>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Tap "Snapshot" to store entire VM states in browser storage. Export as a <code className="text-cyan-300">.bin</code> file to backup your code and packages to Android storage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0f16] border-t border-[#1f2d3e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1f2d3e] hover:bg-[#283b54] text-gray-200"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
