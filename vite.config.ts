import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const BASE = "/cv-maker/";

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        id: BASE,
        name: "CV Maker",
        short_name: "CV Maker",
        description:
          "Write a CV in your browser. Typst compiles it to PDF on your machine — nothing leaves the tab.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        background_color: "#eeedea",
        theme_color: "#ffffff",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,typ,otf,svg,png,ico}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: "CacheFirst",
            options: {
              cacheName: "typst-wasm",
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
