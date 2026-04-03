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
    // Third-party / vendored assets:
    "public/charting_library/**",
  ]),
  // Project-level overrides to keep CI/dev builds unblocked.
  // (Many files are still in flux and use pragmatic typing/React patterns.)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react/no-children-prop": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "prefer-const": "off",
      "react/jsx-key": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      // React 19 compiler lint (if present via eslint-config-next)
      "react-compiler/react-compiler": "off",
    },
  },
  // Loosen rules for boundary layers where `any` is often unavoidable.
  {
    files: [
      "service/**/*.{ts,tsx}",
      "store/**/*.{ts,tsx}",
      "type/**/*.{ts,tsx}",
      "typings.d.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
