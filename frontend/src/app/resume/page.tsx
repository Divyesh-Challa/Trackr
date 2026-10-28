import type { Metadata } from "next";
import ResumeBuilder from "@/components/resume/ResumeBuilder";

export const metadata: Metadata = { title: "Resume | Trackr" };

export default function ResumePage() {
  return <ResumeBuilder />;
}
