import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: { entry: "src/content.ts", formats: ["iife"], name: "trackrContent", fileName: () => "content.js" },
  },
});
