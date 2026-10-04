import { defineConfig } from "vite";

export default defineConfig({
  root: "frontend",
  base: "./",
  publicDir: "public",
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
