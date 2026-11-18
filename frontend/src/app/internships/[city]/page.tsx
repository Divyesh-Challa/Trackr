import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrowsePage } from "@/components/BrowsePage";
import { findCity } from "@/lib/collections";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = findCity((await params).city);
  if (!c) return { title: "Not found | Trackr" };
  return { title: `${c.title} | Trackr`, description: c.intro, alternates: { canonical: `/internships/${c.slug}` } };
}

export default async function CityPage({ params }: Props) {
  const c = findCity((await params).city);
  if (!c) notFound();
  return <BrowsePage collection={c} />;
}
