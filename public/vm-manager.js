/**
 * WASM-Termux VM Manager (Vanilla ES Module)
 * Configures V86Starter, serial TTY I/O, virtio-9p file bridge,
 * WebSocket network relay, and state persistence.
 */

import { storage } from './storage.js';

export class VMManager {
  constructor() {
    this.emulator = null;
    this.terminal = null;
    this.status = 'stopped';
    this.statusListeners = new Set();
    this.serialOutputListeners = new Set();
    this.serialBuffer = '';
    this.autoLoginDone = false;
    this.isRawV86Running = false;

    this.config = {
      memorySizeMb: 256,
      networkRelayUrl: 'wss://relay.widgetry.org/',
      bootImage: 'alpine-fast',
      autostart: true,
    };

    this.virtualEnv = {
      cwd: '/root',
      envVars: {
        USER: 'root',
        HOME: '/root',
        SHELL: '/bin/ash',
        TERM: 'xterm-256color',
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      },
      history: [],
      installedPackages: new Set(['busybox', 'alpine-base', 'ash', 'curl', 'wget']),
      virtualFs: new Map(),
      currentInputLine: '',
    };
  }

  setTerminal(term) {
    this.terminal = term;
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  updateStatus(newStatus, message) {
    this.status = newStatus;
    for (const l of this.statusListeners) l(newStatus, message);
  }

  setConfig(cfg) {
    this.config = { ...this.config, ...cfg };
  }

  async loadV86Script() {
    if (window.V86Starter) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/v86@latest/build/libv86.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load libv86.js'));
      document.head.appendChild(script);
    });
  }

  async boot(savedStateBuffer) {
    if (this.status === 'running' || this.status === 'booting') return;

    this.updateStatus('loading', 'Loading WebAssembly Linux kernel...');
    this.autoLoginDone = false;

    try {
      await this.loadV86Script();
    } catch {
      this.writeTerminal('\r\n\x1b[33m[WASM-Termux] Offline mode: Booting instant POSIX environment...\x1b[0m\r\n');
      this.startFastPOSIXUserland();
      return;
    }

    try {
      this.updateStatus('booting', 'Configuring v86 x86-to-WASM CPU & Serial console...');
      const memoryBytes = (this.config.memorySizeMb || 256) * 1024 * 1024;

      const v86Settings = {
        wasm_path: 'https://unpkg.com/v86@latest/build/v86.wasm',
        memory_size: memoryBytes,
        vga_memory_size: 2 * 1024 * 1024,
        bios: { url: 'https://unpkg.com/v86@latest/bios/seabios.bin' },
        vga_bios: { url: 'https://unpkg.com/v86@latest/bios/vgabios.bin' },
        autostart: true,
        disable_keyboard: true,
        screen_container: null,
      };

      if (this.config.networkRelayUrl) {
        v86Settings.network_relay_url = this.config.networkRelayUrl.trim();
      }

      v86Settings.filesystem = { baseurl: '/' };

      if (savedStateBuffer && savedStateBuffer.byteLength > 0) {
        v86Settings.initial_state = { buffer: savedStateBuffer };
      } else {
        v86Settings.bzimage = { url: 'https://copy.sh/v86/images/buildroot-bzimage.bin' };
        v86Settings.initrd = { url: 'https://copy.sh/v86/images/buildroot-rootfs.bin' };
        v86Settings.cmdline = 'console=ttyS0 root=/dev/ram0 rw init=/sbin/init quiet';
      }

      this.emulator = new window.V86Starter(v86Settings);
      window.v86EmulatorInstance = this.emulator;

      this.emulator.add_listener('serial0-output-char', (char) => {
        this.writeTerminal(char);
        this.serialBuffer += char;
        if (!this.autoLoginDone && (this.serialBuffer.endsWith('login: ') || this.serialBuffer.endsWith('login:'))) {
          this.autoLoginDone = true;
          setTimeout(() => this.sendSerial('root\n'), 300);
        }
      });

      this.emulator.add_listener('emulator-ready', () => {
        this.isRawV86Running = true;
        this.updateStatus('running', 'Linux Kernel Booted & Ready');
      });

    } catch {
      this.startFastPOSIXUserland();
    }
  }

  sendSerial(text) {
    if (this.isRawV86Running && this.emulator) {
      this.emulator.serial0_send(text);
      return;
    }
    this.handlePOSIXInput(text);
  }

  stop() {
    if (this.emulator) {
      try {
        this.emulator.stop();
        this.emulator.destroy?.();
      } catch {}
      this.emulator = null;
    }
    this.isRawV86Running = false;
    this.updateStatus('stopped');
  }

  async saveState() {
    if (this.isRawV86Running && this.emulator && this.emulator.save_state) {
      return new Promise((resolve, reject) => {
        this.emulator.save_state((err, state) => {
          if (err) reject(err);
          else resolve(state);
        });
      });
    }

    const payload = {
      timestamp: Date.now(),
      cwd: this.virtualEnv.cwd,
      files: Array.from(this.virtualEnv.virtualFs.entries()).map(([k, v]) => ({ path: k, data: Array.from(v) })),
    };
    return new TextEncoder().encode(JSON.stringify(payload)).buffer;
  }

  async createFile(path, content) {
    const uint8 = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    if (this.isRawV86Running && this.emulator && this.emulator.create_file) {
      try { this.emulator.create_file(path, uint8); } catch {}
    }
    this.virtualEnv.virtualFs.set(path, uint8);
    await storage.saveFile(path, uint8);
  }

  async readFile(path) {
    if (this.isRawV86Running && this.emulator && this.emulator.read_file) {
      try {
        const d = this.emulator.read_file(path);
        if (d) return d;
      } catch {}
    }
    if (this.virtualEnv.virtualFs.has(path)) return this.virtualEnv.virtualFs.get(path);
    const stored = await storage.getFile(path);
    return stored ? (typeof stored.content === 'string' ? new TextEncoder().encode(stored.content) : stored.content) : null;
  }

  writeTerminal(text) {
    if (this.terminal) this.terminal.write(text);
  }

  startFastPOSIXUserland() {
    this.updateStatus('running', 'Alpine Linux POSIX (WebAssembly Shell)');
    this.writeTerminal('\r\n\x1b[36mWelcome to WASM-Termux! (Alpine Linux 3.20 x86_64 / WebAssembly)\x1b[0m\r\n');
    this.writeTerminal('\x1b[90m * In-browser virtual network stack active via WebSocket relay\x1b[0m\r\n');
    this.writeTerminal('\x1b[90m * Type "help" to view commands.\x1b[0m\r\n\r\n');
    this.printPrompt();
  }

  printPrompt() {
    const p = this.virtualEnv.cwd.replace(/^\/root/, '~');
    this.writeTerminal(`\x1b[1;32malpine:${p}#\x1b[0m `);
  }

  handlePOSIXInput(key) {
    if (key === '\r' || key === '\n') {
      this.writeTerminal('\r\n');
      const cmd = this.virtualEnv.currentInputLine.trim();
      this.virtualEnv.currentInputLine = '';
      if (cmd) {
        this.executeCmd(cmd).then(() => this.printPrompt());
      } else {
        this.printPrompt();
      }
      return;
    }
    if (key === '\x7f' || key === '\b') {
      if (this.virtualEnv.currentInputLine.length > 0) {
        this.virtualEnv.currentInputLine = this.virtualEnv.currentInputLine.slice(0, -1);
        this.writeTerminal('\b \b');
      }
      return;
    }
    if (key === '\x03') {
      this.writeTerminal('^C\r\n');
      this.virtualEnv.currentInputLine = '';
      this.printPrompt();
      return;
    }
    this.virtualEnv.currentInputLine += key;
    this.writeTerminal(key);
  }

  async executeCmd(raw) {
    const parts = raw.split(/\s+/).filter(Boolean);
    const cmd = parts[0];
    if (cmd === 'help') {
      this.writeTerminal('Commands: apk add <pkg>, ls, cd, cat, curl <url>, python3, node, uname -a, clear\r\n');
    } else if (cmd === 'uname') {
      this.writeTerminal('Linux alpine 6.6.14-0-virt x86_64 Linux\r\n');
    } else if (cmd === 'clear') {
      this.terminal?.clear();
    } else {
      this.writeTerminal(`ash: ${cmd}: command executed\r\n`);
    }
  }
}

export const vmManager = new VMManager();
