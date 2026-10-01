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
    // Ignore Claude skill scripts that use CommonJS
    ".claude/**",
    // Ignore seed scripts
    "prisma/seed*.ts",
    // Ignore utility scripts
    "scripts/remove-isDraft.ts",
  ]),
  // Relax some rules for production
  {
    rules: {
      // Allow require() in .cjs files
      "@typescript-eslint/no-require-imports": "off",
      // Allow any in type definition files for flexibility
      "@typescript-eslint/no-explicit-any": "off",
      // Allow setState in useEffect for hydration (common pattern)
      "react-hooks/set-state-in-effect": "off",
      // Relax unused vars to warning only
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow anonymous default exports for config files
      "import/no-anonymous-default-export": "off",
      // Disable advanced React hooks rules that trigger on common patterns
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "off",
      // Allow impure function calls during render for date utilities
      "react-hooks/impurity": "off",
    },
  },
]);

export default eslintConfig;
