import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/.vercel/**",
      "**/next-env.d.ts",
      "**/scratch/**",
      "**/.agents/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    settings: {
      tailwindcss: {
        config: {},
      },
    },
    plugins: {
      tailwindcss: tailwindcssPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-contradicting-classname": "error",
      "tailwindcss/no-custom-classname": "off",
    },
  },
];

export default eslintConfig;
