import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowsePage } from "@/components/BrowsePage";
import { findRole } from "@/lib/collections";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findRole((await params).role);
  if (!c) return { title: "Not found | Trackr" };
  return { title: `${c.title} | Trackr`, description: c.intro, alternates: { canonical: `/roles/${c.slug}` } };
}

export default async function RolePage({ params }: Props) {
  const c = findRole((await params).role);
  if (!c) notFound();
  return <BrowsePage collection={c} />;
}
