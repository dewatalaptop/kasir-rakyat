import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Integration tests render the whole app against in-memory fakes; they are
    // slower than the pure-logic tests, so give them room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Integration tests share module-level singletons (Sheets token listeners,
    // localStorage) — one at a time keeps them independent.
    fileParallelism: false,
  },
});
