// One ESLint config for the whole repo: website, app (client + server) and the shared 3D engine.
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["**/dist", "**/node_modules", "apps/app/data", "estates", "tools", "**/*.min.js"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "18.3" } },
    plugins: { react, "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // Node code: the app server and config files
    files: ["apps/app/server/**/*.js", "**/vite.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // 3D engine and scene code is dense geometry maths ported from the prototype
    files: ["packages/engine/src/**/*.js", "apps/web/src/engine/**/*.js", "apps/app/client/src/components/Viewer.jsx"],
    rules: { "no-unused-vars": "off", "no-sequences": "off" },
  },
];
