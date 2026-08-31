import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

const GROUND = "#eeedea";

export default defineConfig({
  headLinkOptions: { preset: "2023" },
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], resizeOptions: { background: GROUND } },
    apple: { sizes: [180], resizeOptions: { background: GROUND } },
  },
  images: ["public/favicon.svg"],
});
