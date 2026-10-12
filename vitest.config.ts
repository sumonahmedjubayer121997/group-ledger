import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests (no emulators needed): `npm test`. Security-rules tests live in vitest.rules.config.ts.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
