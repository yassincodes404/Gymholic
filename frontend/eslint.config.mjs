import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase widely uses fetch-in-effect patterns that setState
      // synchronously (loading flags). Kept as a warning so real bugs are
      // still surfaced without breaking CI on legacy patterns.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // public/** holds vendored static assets (e.g. the minified pdf.js worker)
  // that are shipped verbatim — never source we lint.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/**"]),
]);

export default eslintConfig;
