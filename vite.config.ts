// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { NitroModule } from "nitro/types";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const sapAutoSyncModule: NitroModule = {
  name: "asset360-sap-auto-sync",
  setup(nitro) {
    // Only self-hosted Node builds receive a process timer; hosted Worker builds omit it.
    if (nitro.options.preset === "node-server") {
      nitro.options.plugins.push(fileURLToPath(new URL("./src/lib/sap-auto-sync.node.ts", import.meta.url)));
    }
  },
};
const sapAutoSyncPlugin = { name: "asset360-sap-auto-sync", nitro: sapAutoSyncModule } as Plugin & { nitro: NitroModule };

export default defineConfig({
  vite: {
    plugins: [sapAutoSyncPlugin, VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          { urlPattern: ({ request }) => request.mode === "navigate", handler: "NetworkFirst", options: { cacheName: "asset360-pages", networkTimeoutSeconds: 4 } },
          { urlPattern: ({ request, url }) => url.origin === self.location.origin && ["script", "style", "font", "image"].includes(request.destination), handler: "CacheFirst", options: { cacheName: "asset360-assets", expiration: { maxEntries: 80, maxAgeSeconds: 2592000 } } },
        ],
      },
    })],
  },
  // Self-hosted servers (Quality/Production) run the Node.js server output in .output/server/index.mjs.
  // The Lovable build environment overrides this automatically, so the preview keeps working.
  nitro: { preset: "node-server" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
