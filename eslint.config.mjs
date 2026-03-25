import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginSecurity from "eslint-plugin-security";
import pluginNoSecrets from "eslint-plugin-no-secrets";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Default ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),

  // Security rules for all files
  {
    plugins: { security: pluginSecurity, "no-secrets": pluginNoSecrets },
    rules: {
      "no-secrets/no-secrets": ["error", { tolerance: 4.5 }],
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // External image URLs from API responses — can't use next/image without configuring all domains
      "@next/next/no-img-element": "off",
      // Google Fonts in layout is fine for App Router
      "@next/next/no-page-custom-font": "off",
      // Data fetching in useEffect is standard React pattern
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // Relax rules for test files
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "no-secrets/no-secrets": "off",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
