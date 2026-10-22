import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `vite build` makes the server app (served by server/index.js).
// `vite build --mode demo` makes the browser-only demo with the fictional estate, served by the website at /demo/.
export default defineConfig(({ mode }) => ({
  root: "client",
  base: mode === "demo" ? "/demo/" : "/",
  plugins: [react()],
  build: {
    outDir: mode === "demo" ? "../../web/dist/demo" : "../dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5174, proxy: { "/api": "http://localhost:8080" } },
}));
