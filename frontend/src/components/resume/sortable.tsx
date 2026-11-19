"use client";

import React from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * A vertical list reordered by dragging a grip (mouse, touch, or Space + arrows).
 * `onMove(from, to)` gets list indexes; the caller turns them into positions.
 */
export function SortableList({ ids, onMove, children }: { ids: string[]; onMove: (from: number, to: number) => void; children: React.ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type Grip = { attributes: ReturnType<typeof useSortable>["attributes"]; listeners: ReturnType<typeof useSortable>["listeners"] };

/** One draggable row. The render prop places the grip; the row lifts while it's dragged. */
export function SortableRow({ id, className, children, ...rest }: { id: string; className?: string; children: (grip: Grip) => React.ReactNode } & Omit<React.HTMLAttributes<HTMLLIElement>, "children">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      {...rest}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${className ?? ""} ${isDragging ? "relative z-10 shadow-lg ring-1 ring-accent/30" : ""}`}
    >
      {children({ attributes, listeners })}
    </li>
  );
}

export function GripHandle({ grip, label, className }: { grip: Grip; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...grip.attributes}
      {...grip.listeners}
      className={`cursor-grab touch-none rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing ${className ?? ""}`}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}
