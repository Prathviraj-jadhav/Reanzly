import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/web/src/**/*.test.ts",
      "apps/api/test/**/*.test.ts",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@reanzly/contracts": path.resolve(__dirname, "./packages/contracts/src/index.ts"),
      "@reanzly/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
      "@reanzly/database": path.resolve(__dirname, "./packages/database/src/client.ts"),
    },
  },
});
