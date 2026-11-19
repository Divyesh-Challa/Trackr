import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-redirect";
import OnboardingWizard from "./OnboardingWizard";

export const metadata: Metadata = { title: "Set up | Trackr", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <OnboardingWizard next={safeNextPath(next)} />;
}
