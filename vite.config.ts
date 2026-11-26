import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

/**
 * Tauri WebView uses the asset:// custom protocol which doesn't send CORS headers.
 * Scripts with `crossorigin` attribute cause the browser to enforce CORS checks,
 * resulting in a blank white main window. This plugin strips crossorigin from
 * all script and link tags in the final HTML output.
 */
function removeCrossOriginPlugin(): Plugin {
  return {
    name: "remove-crossorigin",
    apply: "build",
    transformIndexHtml(html: string) {
      // Remove crossorigin attribute from script and link tags
      return html
        .replace(/<script([^>]*)\s+crossorigin([^>]*)>/g, "<script$1$2>")
        .replace(/<link([^>]*)\s+crossorigin([^>]*)\s*\/>/g, "<link$1$2 />")
        .replace(/<link([^>]*)\s+crossorigin([^>]*)>/g, "<link$1$2>");
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), removeCrossOriginPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  // 4. Fix Tauri WebView compatibility: remove crossorigin attributes on module scripts
  //    (asset:// protocol doesn't support crossorigin CORS headers, causing blank white windows)
  build: {
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        // Ensure consistent asset filenames for reproducible builds
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
}));
