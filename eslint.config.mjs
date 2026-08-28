import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // This list REPLACES every default ignore, ESLint's own included — which is
  // why node_modules is spelled out. Leave it off and `npm run lint` walks
  // 700 files of dependencies and worktrees instead of the 90 that are ours.
  globalIgnores([
    "node_modules/**",
    // Feature branches checked out under .claude/worktrees are their own
    // copies of this repo; each one lints itself.
    ".claude/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // pdf.js's worker, copied in from node_modules by the PDF viewer. It is
    // vendored minified code, not ours to lint.
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
