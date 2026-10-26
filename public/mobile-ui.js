/**
 * WASM-Termux Mobile UI Engine (Vanilla ES Module)
 * visualViewport listener, sticky CTRL/ALT state machine, clipboard handler, and pinch-to-zoom.
 */

export class MobileUIManager {
  constructor() {
    this.terminal = null;
    this.fitAddon = null;
    this.containerElement = null;

    this.modifiers = {
      ctrl: false,
      ctrlLocked: false,
      alt: false,
      altLocked: false,
    };
    this.modifierListeners = new Set();
    this.fontSizeListeners = new Set();
    this.currentFontSize = 13;
    this.initialPinchDistance = null;
    this.initialFontSizeOnPinch = 13;
  }

  attach(terminal, fitAddon, container, initialFontSize = 13) {
    this.terminal = terminal;
    this.fitAddon = fitAddon;
    this.containerElement = container;
    this.currentFontSize = initialFontSize;

    this.setupVisualViewport();
    this.setupPinchToZoom();
  }

  setupVisualViewport() {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    const onResize = () => {
      if (this.fitAddon && this.terminal) {
        try {
          this.fitAddon.fit();
          this.terminal.scrollToBottom();
        } catch {}
      }
    };

    if (vv) {
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
    } else {
      window.addEventListener('resize', onResize);
    }
  }

  toggleCtrl(forceLock) {
    if (forceLock !== undefined) {
      this.modifiers.ctrlLocked = forceLock;
      this.modifiers.ctrl = forceLock;
    } else if (this.modifiers.ctrl && !this.modifiers.ctrlLocked) {
      this.modifiers.ctrlLocked = true;
    } else if (this.modifiers.ctrlLocked) {
      this.modifiers.ctrl = false;
      this.modifiers.ctrlLocked = false;
    } else {
      this.modifiers.ctrl = true;
      this.modifiers.ctrlLocked = false;
    }
    this.notifyModifierChange();
    return this.modifiers.ctrl;
  }

  toggleAlt(forceLock) {
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

  notifyModifierChange() {
    const s = { ...this.modifiers };
    for (const l of this.modifierListeners) l(s);
  }

  onModifierChange(cb) {
    this.modifierListeners.add(cb);
    return () => this.modifierListeners.delete(cb);
  }

  transformInput(input) {
    if (!input) return '';
    let result = input;
    const isCtrl = this.modifiers.ctrl || this.modifiers.ctrlLocked;
    const isAlt = this.modifiers.alt || this.modifiers.altLocked;

    if (isCtrl && input.length === 1) {
      const code = input.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        result = String.fromCharCode(code - 96);
      } else if (code >= 65 && code <= 90) {
        result = String.fromCharCode(code - 64);
      }
    }

    if (isAlt) {
      result = '\x1b' + result;
    }

    if (this.modifiers.ctrl && !this.modifiers.ctrlLocked) this.modifiers.ctrl = false;
    if (this.modifiers.alt && !this.modifiers.altLocked) this.modifiers.alt = false;
    this.notifyModifierChange();

    return result;
  }

  setupPinchToZoom() {
    if (!this.containerElement) return;
    const el = this.containerElement;
    const getDist = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.initialPinchDistance = getDist(e.touches[0], e.touches[1]);
        this.initialFontSizeOnPinch = this.currentFontSize;
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.initialPinchDistance) {
        const d = getDist(e.touches[0], e.touches[1]);
        const target = Math.round(this.initialFontSizeOnPinch * (d / this.initialPinchDistance));
        const clamped = Math.min(26, Math.max(9, target));
        if (clamped !== this.currentFontSize) {
          this.setFontSize(clamped);
        }
      }
    }, { passive: true });
  }

  setFontSize(size) {
    this.currentFontSize = Math.min(28, Math.max(9, size));
    if (this.terminal) {
      this.terminal.options.fontSize = this.currentFontSize;
      try { this.fitAddon?.fit(); } catch {}
    }
  }

  async pasteFromClipboard() {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {}
    return '';
  }

  focusTerminal() {
    this.terminal?.focus();
  }
}

export const mobileUI = new MobileUIManager();
