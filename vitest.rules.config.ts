import path from "path";
import { defineConfig } from "vitest/config";

// Tests that need the Firebase emulators: security rules, plus flows that run the app's own
// Firestore code against them. Run with `npm run test:rules`.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    include: ["tests/rules/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
