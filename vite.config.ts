import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react(), viteCompression(), visualizer()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Keep React ecosystem together to avoid loading order issues
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Large libraries that benefit from separate chunks
            // Note: Excalidraw removed from manual chunks due to circular dependency issues
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            if (id.includes('pdfjs-dist')) {
              return 'pdf';
            }
            // Everything else (including Excalidraw) in one vendor chunk to avoid circular deps
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
});
