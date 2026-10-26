/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors - MIT License */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) return;
    if (ev.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => {
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }

    const request = (coepCredentialless && r.mode === "no-cors")
      ? new Request(r, {
          credentials: "omit",
        })
      : r;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
          if (!coepCredentialless) {
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
          }
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => {
          console.warn("[coi-sw] proxy fetch error, falling back to direct fetch", e);
          return fetch(request);
        })
    );
  });
} else {
  (() => {
    // Check if Cross-Origin Isolation is already active
    if (window.crossOriginIsolated) {
      console.log("[coi-sw] crossOriginIsolated is true");
      return;
    }

    const n = window.navigator;
    if (n && n.serviceWorker) {
      n.serviceWorker.register("/coi-serviceworker.js").then(
        (registration) => {
          registration.addEventListener("updatefound", () => {
            window.location.reload();
          });

          // If the registration is active but page is not yet isolated, reload once
          if (registration.active && !n.serviceWorker.controller) {
            window.location.reload();
          }
        },
        (err) => {
          console.warn("[coi-sw] Service worker registration failed:", err);
        }
      );
    }
  })();
}
