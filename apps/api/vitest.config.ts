import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["routes/**", "lib/**"],
      exclude: ["lib/db/schema.ts", "lib/db/migrations/**"],
    },
  },
});
