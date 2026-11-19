import { defineConfig } from "vite";

// Extension pages and the service worker. The content script is built separately as an IIFE
// (vite.content.config.ts) because Chrome doesn't run content scripts as ES modules.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { options: "options.html", panel: "panel.html", background: "src/background.ts" },
      output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name].js", assetFileNames: "assets/[name][extname]" },
    },
  },
});
