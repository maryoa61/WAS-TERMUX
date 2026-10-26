/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Termux-Style Dual-Row Extra Keys Touch Bar
 * Designed specifically for Android virtual keyboards (Gboard, SwiftKey, Samsung).
 */

import React, { useEffect, useState } from 'react';
import { mobileUI, type StickyModifierState } from '../mobile-ui';
import { vmManager } from '../vm-manager';
import {
  FolderOpen,
  ClipboardPaste,
  Save,
  RotateCcw,
  Keyboard,
  ZoomIn,
  ZoomOut,
  Sliders,
  HelpCircle,
} from 'lucide-react';

interface ExtraKeysBarProps {
  onOpenFiles: () => void;
  onOpenSnapshots: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const ExtraKeysBar: React.FC<ExtraKeysBarProps> = ({
  onOpenFiles,
  onOpenSnapshots,
  onOpenSettings,
  onOpenHelp,
  fontSize,
  onFontSizeChange,
}) => {
  const [modifiers, setModifiers] = useState<StickyModifierState>(mobileUI.getModifiers());

  useEffect(() => {
    return mobileUI.onModifierChange((state) => {
      setModifiers(state);
    });
  }, []);

  const handleKeyTap = (e: React.MouseEvent | React.TouchEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (key === 'CTRL') {
      mobileUI.toggleCtrl();
      return;
    }

    if (key === 'ALT') {
      mobileUI.toggleAlt();
      return;
    }

    const seq = mobileUI.getExtraKeySequence(key);
    vmManager.sendSerial(seq);
  };

  const handlePaste = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = await mobileUI.pasteFromClipboard();
    if (text) {
      vmManager.sendSerial(text);
    } else {
      // Prompt user fallback
      const manual = window.prompt('Paste text to send into Linux Terminal:');
      if (manual !== null) {
        vmManager.sendSerial(manual);
      }
    }
  };

  const handleFocusKeyboard = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    mobileUI.focusTerminal();
  };

  // Row 1: ESC, /, -, HOME, UP, END, PGUP
  const row1Keys = [
    { label: 'ESC', key: 'ESC' },
    { label: '/', key: '/' },
    { label: '-', key: '-' },
    { label: 'HOME', key: 'HOME' },
    { label: '▲', key: 'UP' },
    { label: 'END', key: 'END' },
    { label: 'PGUP', key: 'PGUP' },
  ];

  // Row 2: TAB, CTRL, ALT, LEFT, DOWN, RIGHT, PGDN
  const row2Keys = [
    { label: 'TAB', key: 'TAB' },
    {
      label: 'CTRL',
      key: 'CTRL',
      isModifier: true,
      active: modifiers.ctrl,
      locked: modifiers.ctrlLocked,
    },
    {
      label: 'ALT',
      key: 'ALT',
      isModifier: true,
      active: modifiers.alt,
      locked: modifiers.altLocked,
    },
    { label: '◀', key: 'LEFT' },
    { label: '▼', key: 'DOWN' },
    { label: '▶', key: 'RIGHT' },
    { label: 'PGDN', key: 'PGDN' },
  ];

  return (
    <div className="w-full bg-[#0d131a] border-t border-[#1e2a38] shadow-2xl flex flex-col shrink-0 select-none z-30 pb-[env(safe-area-inset-bottom,0px)]">
      {/* Quick Action Utility Bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#090d12] border-b border-[#182330] overflow-x-auto gap-1 text-[11px] no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
          <button
            onMouseDown={(e) => handleKeyTap(e, 'CTRL+C')}
            className="termux-key flex items-center gap-1 px-2 py-1 rounded bg-[#1e2632] hover:bg-[#283546] active:bg-[#00ff88]/20 text-red-400 font-mono font-bold"
            title="Send Ctrl+C Interrupt"
          >
            <span>^C</span>
          </button>
          <button
            onMouseDown={handlePaste}
            className="termux-key flex items-center gap-1 px-2 py-1 rounded bg-[#1e2632] hover:bg-[#283546] text-gray-200"
            title="Paste Clipboard Text"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
            <span>Paste</span>
          </button>
          <button
            onMouseDown={(e) => handleKeyTap(e, 'CTRL+L')}
            className="termux-key flex items-center gap-1 px-2 py-1 rounded bg-[#1e2632] hover:bg-[#283546] text-gray-300"
            title="Clear Terminal (Ctrl+L)"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>Clear</span>
          </button>
          <button
            onMouseDown={onOpenSnapshots}
            className="termux-key flex items-center gap-1 px-2 py-1 rounded bg-[#1e2632] hover:bg-[#283546] text-[#00ff88]"
            title="State Snapshot Persistence"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Snapshot</span>
          </button>
          <button
            onMouseDown={onOpenFiles}
            className="termux-key flex items-center gap-1 px-2 py-1 rounded bg-[#1e2632] hover:bg-[#283546] text-cyan-300"
            title="9p Host-to-VM File Drawer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onMouseDown={() => onFontSizeChange(Math.max(9, fontSize - 1))}
            className="termux-key p-1 rounded bg-[#18202b] text-gray-400 hover:text-white"
            title="Zoom Out Font"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-gray-400 px-1">{fontSize}px</span>
          <button
            onMouseDown={() => onFontSizeChange(Math.min(26, fontSize + 1))}
            className="termux-key p-1 rounded bg-[#18202b] text-gray-400 hover:text-white"
            title="Zoom In Font"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onMouseDown={handleFocusKeyboard}
            className="termux-key p-1 rounded bg-[#18202b] text-cyan-400 hover:bg-[#223040]"
            title="Focus Keyboard"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          <button
            onMouseDown={onOpenSettings}
            className="termux-key p-1 rounded bg-[#18202b] text-gray-400 hover:text-white"
            title="VM & Network Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onMouseDown={onOpenHelp}
            className="termux-key p-1 rounded bg-[#18202b] text-gray-400 hover:text-white"
            title="Command Cheat Sheet & Tips"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 1: ESC, /, -, HOME, UP, END, PGUP */}
      <div className="grid grid-cols-7 gap-1 px-1.5 pt-1 pb-0.5">
        {row1Keys.map((item) => (
          <button
            key={item.key}
            onMouseDown={(e) => handleKeyTap(e, item.key)}
            onTouchStart={(e) => handleKeyTap(e, item.key)}
            className="termux-key h-8 rounded bg-[#16202c] hover:bg-[#223143] active:bg-[#00ff88]/30 border border-[#233346] flex items-center justify-center font-mono text-xs font-semibold text-gray-200 shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Row 2: TAB, CTRL, ALT, LEFT, DOWN, RIGHT, PGDN */}
      <div className="grid grid-cols-7 gap-1 px-1.5 pt-0.5 pb-1">
        {row2Keys.map((item) => {
          let btnClass = 'termux-key h-8 rounded border flex items-center justify-center font-mono text-xs font-semibold shadow-sm transition-colors ';
          
          if (item.isModifier) {
            if (item.locked) {
              btnClass += 'bg-[#00ff88]/30 border-[#00ff88] text-[#00ff88] ring-1 ring-[#00ff88] ';
            } else if (item.active) {
              btnClass += 'bg-[#00e5ff]/25 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400 ';
            } else {
              btnClass += 'bg-[#1a2533] border-[#293d54] text-gray-300 hover:bg-[#24354a] ';
            }
          } else {
            btnClass += 'bg-[#16202c] hover:bg-[#223143] active:bg-[#00ff88]/30 border-[#233346] text-gray-200 ';
          }

          return (
            <button
              key={item.key}
              onMouseDown={(e) => handleKeyTap(e, item.key)}
              onTouchStart={(e) => handleKeyTap(e, item.key)}
              className={btnClass}
            >
              <span>{item.label}</span>
              {item.isModifier && (item.active || item.locked) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] ml-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
