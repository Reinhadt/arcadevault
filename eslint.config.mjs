import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Whitespace hygiene; eslint --fix in the format hook applies these, then Prettier runs last.
    rules: {
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
      "eol-last": ["error", "always"],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static prototype reference files (unbundled global-React JSX,
    // not part of the Next app — see specs/01-mvp-pantallas-visuales.md).
    "references/**",
  ]),
]);

export default eslintConfig;
