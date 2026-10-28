import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "src/lib/supabase/database.types.ts", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Legacy AI pages stay behind NEXT_PUBLIC_FEATURE_AI until they're rebuilt (Phase 6).
    files: ["src/app/resume/**", "src/app/simulator/**", "src/components/JakesResumePreview.tsx", "src/lib/ai-legacy.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "warn", "@typescript-eslint/no-unused-vars": "warn", "react-hooks/exhaustive-deps": "warn" },
  },
];

export default config;
