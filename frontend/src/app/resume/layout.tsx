import { notFound } from "next/navigation";
import { AI_FEATURES_ENABLED } from "@/lib/ai-legacy";

// AI tools are off for v1 (they fabricated content); rebuilt in Phase 6.
export default function AiFeatureLayout({ children }: { children: React.ReactNode }) {
  if (!AI_FEATURES_ENABLED) notFound();
  return children;
}
