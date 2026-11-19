import type { Metadata } from "next";
import TrackerBoard from "@/components/tracker/TrackerBoard";
import Today from "./Today";

export const metadata: Metadata = { title: "Applications | Trackr" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  return (
    <>
      <Today />
      <TrackerBoard key={open} initialOpenId={open && UUID.test(open) ? open : null} />
    </>
  );
}
