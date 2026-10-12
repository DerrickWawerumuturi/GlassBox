import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

// Unit tests for pure frontend logic. Same "@/" alias as tsconfig.json. Tests
// run server modules directly, so `server-only` resolves to its empty build,
// as it does on Next's server.
export default defineConfig({
    resolve: {alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    }},
    test: {include: ["src/**/*.test.ts"]},
});
