import {fileURLToPath} from "node:url";
import {defineConfig} from "vitest/config";

// Unit tests for pure frontend logic. Same "@/" alias as tsconfig.json.
export default defineConfig({
    resolve: {alias: {"@": fileURLToPath(new URL("./src", import.meta.url))}},
    test: {include: ["src/**/*.test.ts"]},
});
