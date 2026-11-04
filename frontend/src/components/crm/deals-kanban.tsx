"use client";

import React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { Deal, PipelineStage } from "@/types/crm";
import { DealColumn } from "./deal-column";
import { DealCard } from "./deal-card";
import { api } from "@/lib/api-client";
import { AlertCircle } from "lucide-react";

interface DealsKanbanProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealsChange: (deals: Deal[]) => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function DealsKanban({
  stages,
  deals,
  onDealsChange,
  onView,
  onEdit,
  onDelete,
}: DealsKanbanProps) {
  const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Configure sensors with activation distance to avoid blocking click events
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Group deals by stage_id
  const dealsByStage = React.useMemo(() => {
    const map = new Map<string, Deal[]>();
    stages.forEach((s) => map.set(s.id, []));
    deals.forEach((d) => {
      const stageDeals = map.get(d.stage_id);
      if (stageDeals) {
        stageDeals.push(d);
      } else {
        // Fallback for deals in an unexpected or unlisted stage
        const firstStage = stages[0]?.id;
        if (firstStage && map.has(firstStage)) {
          map.get(firstStage)!.push(d);
        }
      }
    });
    return map;
  }, [stages, deals]);

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    if (deal) {
      setActiveDeal(deal);
      setErrorMessage(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) {
      return; // No stage change
    }

    const previousStageId = deal.stage_id;
    const previousStage = deal.stage;
    const targetStage = stages.find((s) => s.id === targetStageId);

    // 1. Optimistic Update
    const optimisticDeals = deals.map((d) =>
      d.id === dealId
        ? {
            ...d,
            stage_id: targetStageId,
            stage: targetStage || d.stage,
          }
        : d
    );
    onDealsChange(optimisticDeals);

    // 2. Persist to Backend API
    try {
      const updatedDeal = await api.updateDeal(dealId, {
        stage_id: targetStageId,
      });

      // Synchronize with server response
      onDealsChange(
        optimisticDeals.map((d) => (d.id === dealId ? updatedDeal : d))
      );
    } catch (err: any) {
      // 3. Rollback on Failure
      const rolledBackDeals = deals.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage_id: previousStageId,
              stage: previousStage,
            }
          : d
      );
      onDealsChange(rolledBackDeals);
      setErrorMessage(
        err.detail || err.message || "Failed to update deal stage. Reverted changes."
      );
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-6">
      {/* Error alert if drag-drop persistence failed */}
      {errorMessage && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Horizontal Scroll Container */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4 kanban-scrollbar">
          {stages.map((stage) => (
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage.get(stage.id) || []}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>

        {/* Drag Overlay Preview */}
        <DragOverlay>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              onView={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
