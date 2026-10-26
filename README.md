# WASM-Termux: 100% Serverless, In-Browser Linux Terminal for Android

WASM-Termux is an in-browser Linux virtual machine and development environment designed specifically for Android mobile devices, running entirely in WebAssembly via **v86** (`libv86.js` + `v86.wasm`).

No remote VPS, Node.js PTY, or backend containers are required: the Linux kernel, memory, files, and serial console execute directly within the mobile browser sandbox.

---

## Key Features

1. **Local WebAssembly Virtualization (v86)**
   - Pinned, locally bundled `v86` core binaries (`/v86/libv86.js`, `/v86/v86.wasm`, SeaBIOS & VGABIOS), eliminating dynamic third-party CDN vulnerabilities.
   - Piped serial console (`ttyS0`) to `@xterm/xterm`.
   - Auto-login sequence handling username and password prompts.

2. **Termux-Style Extra Keys Touch Bar**
   - **Row 1:** `ESC`, `/`, `-`, `HOME`, `▲` (`UP`), `END`, `PGUP`
   - **Row 2:** `TAB`, `CTRL` (sticky modifier with single-shot or double-tap lock), `ALT` (sticky modifier), `◀` (`LEFT`), `▼` (`DOWN`), `▶` (`RIGHT`), `PGDN`
   - **Action Bar:** `^C` (SIGINT), `Paste` (from Android clipboard), `Clear` (Ctrl+L), `Snapshot`, `Files`, `Keyboard` refocus, and dynamic font zoom.

3. **Android Viewport & Virtual Keyboard Adaptation**
   - Synchronizes with `window.visualViewport` to dynamically recalculate terminal viewport height when Android virtual keyboards (Gboard, SwiftKey, Samsung) slide up or down.
   - Calls `fitAddon.fit()` and scrolls active prompt into view without viewport jitter.
   - Two-finger pinch-to-zoom on the terminal canvas dynamically scales font size between 9px and 28px.
   - Screen reader and IME compensation to eliminate duplicate input characters.

4. **Host-to-VM File Bridge (9p Filesystem)**
   - Upload any file from Android phone storage into the `/root/` directory of the virtual machine.
   - Download compiled programs or edited scripts from `/root/` directly to Android downloads.
   - Built-in mobile code editor for writing and saving `.py`, `.js`, `.c`, or `.sh` files.

5. **IndexedDB State Persistence**
   - Save multi-megabyte VM RAM and CPU state snapshots via `save_state()` directly into the browser's IndexedDB.
   - Export snapshots as downloadable `.bin` backup files to device storage.
   - Import existing `.bin` snapshots.
   - Optional configurable auto-save timer.

6. **In-Browser Network Stack & Privacy Advisory**
   - Browser sandboxes disallow raw TCP/UDP socket creation.
   - WASM-Termux supports virtio-net Ethernet tunneling over a WebSocket proxy relay (e.g. `wss://relay.widgetry.org/` or self-hosted `wisp-server`).
   - **Security Notice:** Public relays can inspect unencrypted traffic. The relay is disabled by default for air-gapped local privacy; users can enable it in Settings or point it to a private self-hosted relay.

---

## Cloudflare Pages & Static Deployment

Deploy as a 100% static Single Page Application (SPA). The project includes:
- `public/_headers`: Sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` for `SharedArrayBuffer` support.
- `public/coi-serviceworker.js`: Enables Cross-Origin Isolation client-side on static hosts where custom server headers are unavailable.
- `public/manifest.json`: Full PWA manifest with standalone display and mobile splash icon assets.

---

## Development

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build
```

## License

Apache License 2.0. See [LICENSE](LICENSE) for details.
