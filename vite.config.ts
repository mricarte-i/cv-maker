import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CV Maker",
        short_name: "CV",
        start_url: "/",
        display: "standalone",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,typ,otf,svg}"],
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
