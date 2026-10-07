import KanbanBoard from "../components/KanbanBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <KanbanBoard />;
}
