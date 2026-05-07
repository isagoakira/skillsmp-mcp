import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["index.js", "setup.js"],
    },
    testTimeout: 30000,
    hookTimeout: 20000,
  },
});
