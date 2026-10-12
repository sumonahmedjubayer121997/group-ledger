import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
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
