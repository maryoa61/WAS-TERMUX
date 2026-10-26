/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mobile UI Architecture for WASM-Termux
 * - VisualViewport keyboard adaptation (Android Gboard/SwiftKey)
 * - Sticky CTRL & ALT state machine
 * - Pinch-to-zoom font scaling
 * - Mobile clipboard & IME composition handlers
 */

import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

export interface StickyModifierState {
  ctrl: boolean;
  ctrlLocked: boolean;
  alt: boolean;
  altLocked: boolean;
}

export type ModifierChangeListener = (state: StickyModifierState) => void;
export type FontSizeChangeListener = (fontSize: number) => void;

export class MobileUIManager {
  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private containerElement: HTMLElement | null = null;

  // Modifier state
  private modifiers: StickyModifierState = {
    ctrl: false,
    ctrlLocked: false,
    alt: false,
    altLocked: false,
  };
  private modifierListeners: Set<ModifierChangeListener> = new Set();
  private fontSizeListeners: Set<FontSizeChangeListener> = new Set();

  // Pinch-to-zoom tracking
  private initialPinchDistance: number | null = null;
  private currentFontSize: number = 13;
  private initialFontSizeOnPinch: number = 13;

  // Viewport tracking
  private viewportCleanup: (() => void) | null = null;
  private isKeyboardVisible: boolean = false;

  constructor() {}

  /**
   * Bind terminal, fitAddon, and DOM container
   */
  public attach(
    terminal: Terminal,
    fitAddon: FitAddon,
    container: HTMLElement,
    initialFontSize = 13
  ): void {
    this.terminal = terminal;
    this.fitAddon = fitAddon;
    this.containerElement = container;
    this.currentFontSize = initialFontSize;

    this.setupVisualViewport();
    this.setupPinchToZoom();
    this.setupIMECompensation();
  }

  public detach(): void {
    if (this.viewportCleanup) {
      this.viewportCleanup();
      this.viewportCleanup = null;
    }
    this.terminal = null;
    this.fitAddon = null;
    this.containerElement = null;
  }

  /* -------------------------------------------------------------
   * 1. Android Viewport & Keyboard Adaptation (visualViewport API)
   * ------------------------------------------------------------- */
  private setupVisualViewport(): void {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    if (!vv) {
      // Fallback for older WebKit / browsers
      const handleResize = () => this.handleViewportResize();
      window.addEventListener('resize', handleResize);
      this.viewportCleanup = () => window.removeEventListener('resize', handleResize);
      return;
    }

    const onResizeOrScroll = () => {
      this.handleViewportResize();
    };

    vv.addEventListener('resize', onResizeOrScroll);
    vv.addEventListener('scroll', onResizeOrScroll);

    this.viewportCleanup = () => {
      vv.removeEventListener('resize', onResizeOrScroll);
      vv.removeEventListener('scroll', onResizeOrScroll);
    };

    // Initial fit
    requestAnimationFrame(() => this.handleViewportResize());
  }

  private handleViewportResize(): void {
    if (!this.containerElement || !this.fitAddon || !this.terminal) return;

    const vv = window.visualViewport;
    const windowHeight = window.innerHeight;
    const currentVVHeight = vv ? vv.height : windowHeight;

    // Detect if virtual keyboard is up (typically > 150px shrinkage)
    const keyboardDelta = windowHeight - currentVVHeight;
    this.isKeyboardVisible = keyboardDelta > 120;

    // Trigger instant fit on the terminal
    try {
      this.fitAddon.fit();
      this.terminal.scrollToBottom();
    } catch {
      // fit error during transitions can be safely ignored
    }
  }

  public refit(): void {
    if (this.fitAddon && this.terminal) {
      try {
        this.fitAddon.fit();
        this.terminal.scrollToBottom();
      } catch {
        // ignore
      }
    }
  }

  /* -------------------------------------------------------------
   * 2. Sticky CTRL / ALT State Machine
   * ------------------------------------------------------------- */
  public toggleCtrl(forceLock?: boolean): boolean {
    if (forceLock !== undefined) {
      this.modifiers.ctrlLocked = forceLock;
      this.modifiers.ctrl = forceLock;
    } else if (this.modifiers.ctrl && !this.modifiers.ctrlLocked) {
      // Double tap -> Lock
      this.modifiers.ctrlLocked = true;
    } else if (this.modifiers.ctrlLocked) {
      // Locked -> Off
      this.modifiers.ctrl = false;
      this.modifiers.ctrlLocked = false;
    } else {
      // Off -> Single shot active
      this.modifiers.ctrl = true;
      this.modifiers.ctrlLocked = false;
    }

    this.notifyModifierChange();
    return this.modifiers.ctrl;
  }

  public toggleAlt(forceLock?: boolean): boolean {
    if (forceLock !== undefined) {
      this.modifiers.altLocked = forceLock;
      this.modifiers.alt = forceLock;
    } else if (this.modifiers.alt && !this.modifiers.altLocked) {
      this.modifiers.altLocked = true;
    } else if (this.modifiers.altLocked) {
      this.modifiers.alt = false;
      this.modifiers.altLocked = false;
    } else {
      this.modifiers.alt = true;
      this.modifiers.altLocked = false;
    }

    this.notifyModifierChange();
    return this.modifiers.alt;
  }

  public getModifiers(): StickyModifierState {
    return { ...this.modifiers };
  }

  public onModifierChange(cb: ModifierChangeListener): () => void {
    this.modifierListeners.add(cb);
    return () => this.modifierListeners.delete(cb);
  }

  private notifyModifierChange(): void {
    const state = this.getModifiers();
    for (const listener of this.modifierListeners) {
      listener(state);
    }
  }

  /**
   * Process raw input char or key with active sticky modifiers
   * Returns transformed string to send to terminal/serial port
   */
  public transformInput(input: string): string {
    if (!input) return '';

    let result = input;
    const isCtrl = this.modifiers.ctrl || this.modifiers.ctrlLocked;
    const isAlt = this.modifiers.alt || this.modifiers.altLocked;

    if (isCtrl && input.length === 1) {
      const code = input.charCodeAt(0);
      // 'a' (97) - 'z' (122) -> 1 - 26
      if (code >= 97 && code <= 122) {
        result = String.fromCharCode(code - 96);
      }
      // 'A' (65) - 'Z' (90) -> 1 - 26
      else if (code >= 65 && code <= 90) {
        result = String.fromCharCode(code - 64);
      }
      // Special mappings: '[' (27), '\' (28), ']' (29), '^' (30), '_' (31)
      else if (input === '[') result = '\x1b';
      else if (input === ']') result = '\x1d';
      else if (input === '\\') result = '\x1c';
      else if (input === '^') result = '\x1e';
      else if (input === '_') result = '\x1f';
      else if (input === ' ') result = '\x00';
    }

    if (isAlt) {
      result = '\x1b' + result;
    }

    // Single-shot release (if not locked)
    if (this.modifiers.ctrl && !this.modifiers.ctrlLocked) {
      this.modifiers.ctrl = false;
    }
    if (this.modifiers.alt && !this.modifiers.altLocked) {
      this.modifiers.alt = false;
    }
    this.notifyModifierChange();

    return result;
  }

  /* -------------------------------------------------------------
   * 3. Termux Extra Keys Generator
   * ------------------------------------------------------------- */
  public getExtraKeySequence(key: string): string {
    switch (key.toUpperCase()) {
      case 'ESC':
        return '\x1b';
      case 'TAB':
        return '\t';
      case 'HOME':
        return '\x1b[H';
      case 'END':
        return '\x1b[F';
      case 'UP':
        return '\x1b[A';
      case 'DOWN':
        return '\x1b[B';
      case 'RIGHT':
        return '\x1b[C';
      case 'LEFT':
        return '\x1b[D';
      case 'PGUP':
        return '\x1b[5~';
      case 'PGDN':
        return '\x1b[6~';
      case 'INS':
        return '\x1b[2~';
      case 'DEL':
        return '\x1b[3~';
      case 'CTRL+C':
        return '\x03';
      case 'CTRL+D':
        return '\x04';
      case 'CTRL+Z':
        return '\x1a';
      case 'CTRL+L':
        return '\x0c';
      case 'ENTER':
        return '\r';
      case 'BACKSPACE':
        return '\x7f';
      default:
        return this.transformInput(key);
    }
  }

  /* -------------------------------------------------------------
   * 4. Pinch to Zoom
   * ------------------------------------------------------------- */
  private setupPinchToZoom(): void {
    if (!this.containerElement) return;

    const el = this.containerElement;

    const getDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    el.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length === 2) {
          this.initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
          this.initialFontSizeOnPinch = this.currentFontSize;
        }
      },
      { passive: true }
    );

    el.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length === 2 && this.initialPinchDistance !== null) {
          const currentDistance = getDistance(e.touches[0], e.touches[1]);
          const ratio = currentDistance / this.initialPinchDistance;
          const targetSize = Math.round(this.initialFontSizeOnPinch * ratio);
          const clamped = Math.min(26, Math.max(9, targetSize));

          if (clamped !== this.currentFontSize) {
            this.setFontSize(clamped);
          }
        }
      },
      { passive: true }
    );

    const endPinch = () => {
      this.initialPinchDistance = null;
    };

    el.addEventListener('touchend', endPinch, { passive: true });
    el.addEventListener('touchcancel', endPinch, { passive: true });
  }

  public setFontSize(size: number): void {
    this.currentFontSize = Math.min(28, Math.max(9, size));
    if (this.terminal) {
      this.terminal.options.fontSize = this.currentFontSize;
      this.refit();
    }
    for (const listener of this.fontSizeListeners) {
      listener(this.currentFontSize);
    }
  }

  public getFontSize(): number {
    return this.currentFontSize;
  }

  public onFontSizeChange(cb: FontSizeChangeListener): () => void {
    this.fontSizeListeners.add(cb);
    return () => this.fontSizeListeners.delete(cb);
  }

  /* -------------------------------------------------------------
   * 5. Android IME & Composition Glitch Prevention
   * ------------------------------------------------------------- */
  private setupIMECompensation(): void {
    if (!this.terminal) return;

    // Configure terminal options suited for Android Chrome mobile keyboard
    this.terminal.options.screenReaderMode = false;
    this.terminal.options.cursorBlink = true;
    this.terminal.options.cursorStyle = 'block';
  }

  /**
   * Request Android soft keyboard to focus
   */
  public focusTerminal(): void {
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  /**
   * Paste from clipboard safely
   */
  public async pasteFromClipboard(): Promise<string> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        return text;
      }
    } catch {
      // Fallback
    }
    return '';
  }

  public isKeyboardActive(): boolean {
    return this.isKeyboardVisible;
  }
}

export const mobileUI = new MobileUIManager();
