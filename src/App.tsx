/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WASM-Termux Main Application
 * 100% Serverless, In-Browser Alpine Linux Terminal for Android powered by WebAssembly
 */

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

import { vmManager, type VMStatus } from './vm-manager';
import { mobileUI } from './mobile-ui';
import { storage } from './storage';

import { ExtraKeysBar } from './components/ExtraKeysBar';
import { FileDrawer } from './components/FileDrawer';
import { SnapshotsModal } from './components/SnapshotsModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickHelpModal } from './components/QuickHelpModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ConfirmModal } from './components/ConfirmModal';

import {
  Terminal as TerminalIcon,
  FolderOpen,
  Save,
  Sliders,
  HelpCircle,
  Maximize2,
  Minimize2,
  Activity,
  Wifi,
  Power,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [vmStatus, setVmStatus] = useState<VMStatus>('stopped');
  const [statusMessage, setStatusMessage] = useState<string>('Ready');
  const [fontSize, setFontSize] = useState<number>(13);
  const [scanlines, setScanlines] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomToast, setZoomToast] = useState<number | null>(null);
  const [showHaltConfirm, setShowHaltConfirm] = useState(false);
  const [relayEnabled, setRelayEnabled] = useState(false);

  // Modals state
  const [showFiles, setShowFiles] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load initial settings
  useEffect(() => {
    storage.getSettings().then((settings) => {
      setFontSize(settings.fontSize || 13);
      setScanlines(settings.scanlinesEnabled || false);
      setRelayEnabled(settings.networkRelayEnabled || false);
      vmManager.setConfig({
        memorySizeMb: settings.memoryMb,
        networkRelayEnabled: settings.networkRelayEnabled || false,
        networkRelayUrl: settings.networkRelayUrl,
        autoLoginUser: settings.autoLoginUser || 'root',
        autoLoginPassword: settings.autoLoginPassword || '',
        bootImage: settings.bootImage,
      });
    });
  }, []);

  // Initialize Terminal & MobileUIManager
  useEffect(() => {
    if (!terminalRef.current) return;

    // Dark Termux Color Palette
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: fontSize,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      letterSpacing: 0,
      lineHeight: 1.25,
      screenReaderMode: false,
      theme: {
        background: '#0a0e14',
        foreground: '#dce4ed',
        cursor: '#00ff88',
        cursorAccent: '#0a0e14',
        selectionBackground: 'rgba(0, 255, 136, 0.3)',
        black: '#0a0e14',
        red: '#ff5555',
        green: '#00ff88',
        yellow: '#f1fa8c',
        blue: '#00c8ff',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d5b6e',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#66d9ef',
        brightMagenta: '#ff92d0',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Attach terminal to VM manager
    vmManager.setTerminal(term);

    // Attach Mobile UI Manager (visualViewport, pinch-to-zoom, IME)
    mobileUI.attach(term, fitAddon, terminalRef.current, fontSize);

    const cleanupFontSize = mobileUI.onFontSizeChange((size) => {
      setFontSize(size);
      setZoomToast(size);
      setTimeout(() => setZoomToast(null), 1200);
    });

    // Listen to user typing in xterm and send to VM
    const onDataDisposable = term.onData((data) => {
      const transformed = mobileUI.transformInput(data);
      vmManager.sendSerial(transformed);
    });

    // Subscribe to VM status
    const cleanupStatus = vmManager.onStatusChange((status, msg) => {
      setVmStatus(status);
      if (msg) setStatusMessage(msg);
    });

    // Auto-boot VM
    vmManager.boot();

    // Resize observer for container
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // ignore
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      onDataDisposable.dispose();
      cleanupFontSize();
      cleanupStatus();
      mobileUI.detach();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    mobileUI.setFontSize(size);
    storage.saveSettings({ fontSize: size });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePowerToggle = () => {
    if (vmStatus === 'running' || vmStatus === 'booting') {
      setShowHaltConfirm(true);
    } else {
      vmManager.boot();
    }
  };

  const handleConfirmHalt = () => {
    setShowHaltConfirm(false);
    vmManager.stop();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0e14] text-gray-200 overflow-hidden fixed inset-0 select-none">
      {/* Top Application Header */}
      <header className="h-10 shrink-0 bg-[#0d141e] border-b border-[#1b2736] flex items-center justify-between px-2.5 sm:px-4 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-[#00ff88]">
            <TerminalIcon className="w-4 h-4 text-[#00ff88]" />
            <span className="font-mono font-bold text-xs tracking-wider text-white">
              WASM<span className="text-[#00ff88]">-TERMUX</span>
            </span>
          </div>

          {/* VM Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#152130] border border-[#223348] text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${
                vmStatus === 'running'
                  ? 'bg-[#00ff88] animate-pulse'
                  : vmStatus === 'booting' || vmStatus === 'loading'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-red-400'
              }`}
            />
            <span className="capitalize font-mono text-gray-300 hidden xs:inline">{vmStatus}</span>
          </div>

          {/* Network Proxy Indicator */}
          <div className={`hidden md:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
            relayEnabled
              ? 'text-cyan-400 bg-cyan-950/30 border-cyan-800/40'
              : 'text-gray-400 bg-gray-900/40 border-gray-800'
          }`}>
            <Wifi className="w-3 h-3" />
            <span>{relayEnabled ? 'Relay Active' : 'Air-gapped'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <PWAInstallButton />

          <button
            onClick={() => setShowFiles(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-cyan-300 hover:bg-[#1a2533] transition-colors"
            title="Open 9p File Bridge"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSnapshots(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-[#00ff88] hover:bg-[#1a2533] transition-colors"
            title="State Snapshots (IndexedDB)"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2533] transition-colors"
            title="Settings & Network"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a2533] transition-colors"
            title="Guide & Cheat Sheet"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a2533]"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handlePowerToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              vmStatus === 'running'
                ? 'text-gray-400 hover:text-red-400 hover:bg-red-950/30'
                : 'text-gray-400 hover:text-[#00ff88] hover:bg-emerald-950/30'
            }`}
            title={vmStatus === 'running' ? 'Halt VM' : 'Start VM'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Terminal Viewport */}
      <main
        className="flex-1 w-full relative min-h-0 bg-[#0a0e14] overflow-hidden"
        onClick={() => mobileUI.focusTerminal()}
      >
        <div
          ref={terminalRef}
          className="w-full h-full p-1"
          style={{
            touchAction: 'manipulation',
          }}
        />

        {/* Scanlines visual effect overlay */}
        {scanlines && <div className="absolute inset-0 scanlines pointer-events-none z-10" />}

        {/* Pinch-to-zoom floating indicator */}
        {zoomToast !== null && (
          <div className="absolute top-4 right-4 z-40 bg-[#162231]/90 backdrop-blur border border-[#23354a] px-3 py-1.5 rounded-lg text-xs font-mono text-[#00ff88] shadow-lg flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Font: {zoomToast}px</span>
          </div>
        )}
      </main>

      {/* Termux-Style Dual-Row Extra Keys Touch Bar */}
      <ExtraKeysBar
        onOpenFiles={() => setShowFiles(true)}
        onOpenSnapshots={() => setShowSnapshots(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
      />

      {/* Host-to-VM File Bridge Slide Drawer */}
      <FileDrawer isOpen={showFiles} onClose={() => setShowFiles(false)} />

      {/* State Snapshot Persistence Modal */}
      <SnapshotsModal isOpen={showSnapshots} onClose={() => setShowSnapshots(false)} />

      {/* VM & Network Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsSaved={() => {
          storage.getSettings().then((s) => {
            setScanlines(s.scanlinesEnabled);
            setFontSize(s.fontSize);
            mobileUI.setFontSize(s.fontSize);
          });
        }}
      />

      {/* Quick Help & Command Cheat Sheet Modal */}
      <QuickHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Halt VM Confirmation Modal */}
      <ConfirmModal
        isOpen={showHaltConfirm}
        title="Stop Virtual Machine"
        message="Are you sure you want to halt the running Linux Virtual Machine?"
        confirmLabel="Halt VM"
        isDestructive={true}
        onConfirm={handleConfirmHalt}
        onCancel={() => setShowHaltConfirm(false)}
      />
    </div>
  );
};
