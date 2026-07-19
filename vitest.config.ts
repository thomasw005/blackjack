import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    resolve: {
        // Mirrors the "@/*" -> "src/*" alias in tsconfig.json so tests can import
        // app code (e.g. src/lib) the same way the app does.
        alias: { "@": path.resolve(__dirname, "./src") },
    },
});
