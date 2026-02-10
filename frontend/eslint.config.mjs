import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Disallow raw console.* in app code; use shared logger instead. Exceptions: logger (internal use) and error-boundary (patches console.error).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    files: [
      "src/shared/helpers/logger.ts",
      "src/presentation/components/organisms/error-handling/error-boundary.tsx",
    ],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
