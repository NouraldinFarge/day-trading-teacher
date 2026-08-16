import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/active-build/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/output/**",
      "**/playwright-report/**",
      "**/portable-builds/**",
      "**/target/**",
      "**/test-results/**",
      "**/versions/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.es2024,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // The application does not enable React Compiler. Keep the stable hook
      // correctness rules without imposing compiler-only purity constraints.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "jsx-a11y/no-autofocus": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "e2e/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.es2024, ...globals.node },
      sourceType: "module",
    },
  },
);
