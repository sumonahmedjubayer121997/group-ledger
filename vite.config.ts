import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Installable app: manifest, icons and a service worker that keeps the app working offline.
    // The page asks before updating (see PwaUpdatePrompt), so a half-filled form is never lost.
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.ico", "favicon-32x32.png", "apple-touch-icon-180x180.png"],
      manifest: {
        id: "/",
        name: "SplitWize",
        short_name: "SplitWize",
        description: "Split group expenses, keep track of loans, and see who owes whom.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#FAFAF7",
        theme_color: "#FAFAF7",
        categories: ["finance", "productivity"],
        icons: [
          { src: "/pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Long-press the app icon (Android, desktop) for these.
        shortcuts: [
          { name: "Add expense", short_name: "Add", url: "/?action=add-expense", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
          { name: "Loans", url: "/personal", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
          { name: "Join a group", short_name: "Join", url: "/?action=join", icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        // The app itself is stored for offline use; big optional parts (the 3D landing scene, the PDF
        // and QR libraries) are cached the first time they're used instead.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/DebtWeb-*.js", "**/jspdf*.js", "**/html2canvas*.js", "**/index.es-*.js", "**/purify*.js", "**/jsQR-*.js", "**/pdfReport-*.js"],
        navigateFallback: "/index.html",
        // Firebase's own pages (sign-in helpers) must always come from the server.
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "app-extras", expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "font-styles" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Production builds drop console.log/info/debug (they printed user IDs and emails);
  // console.warn and console.error stay so real problems are still visible.
  esbuild:
    mode === "production"
      ? { pure: ["console.log", "console.info", "console.debug"], drop: ["debugger"] }
      : undefined,
}));
