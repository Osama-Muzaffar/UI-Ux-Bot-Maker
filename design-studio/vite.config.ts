import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_PORT = Number(process.env.STUDIO_PORT || 5174);

export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "../dist-web", emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: false } },
  },
});
