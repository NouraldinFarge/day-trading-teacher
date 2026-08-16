import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/domain/skills")) return "skill-catalog";
          if (
            id.includes("/src/domain/builtin-lessons") ||
            id.includes("/src/domain/core-path") ||
            id.includes("/src/domain/lesson-workspaces")
          )
            return "curriculum";
          if (id.includes("/src/domain/achievements"))
            return "achievement-engine";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/@tanstack")) return "router";
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          )
            return "react";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json-summary", "html", "lcov"],
      include: ["src/domain/**/*.ts", "src/state/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/domain/types.ts"],
      thresholds: {
        branches: 70,
        functions: 85,
        lines: 90,
        statements: 90,
      },
    },
  },
});
