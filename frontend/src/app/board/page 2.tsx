import type { Metadata } from "next";
import TrackerBoard from "@/components/tracker/TrackerBoard";

export const metadata: Metadata = { title: "Applications | Trackr" };

export default function BoardPage() {
  return <TrackerBoard />;
}
