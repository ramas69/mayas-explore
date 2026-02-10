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
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('@excalidraw')) {
              return 'vendor-excalidraw';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('lottie')) {
              return 'vendor-lottie';
            }
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('elkjs')) {
              return 'vendor-elkjs';
            }
            if (id.includes('mermaid')) {
              return 'vendor-mermaid';
            }
            if (id.includes('cytoscape')) {
              return 'vendor-cytoscape';
            }

            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
