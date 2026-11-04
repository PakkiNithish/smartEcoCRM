"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Deal, PipelineStage } from "@/types/crm";
import { DealCard } from "./deal-card";
import { formatCurrency, cn } from "@/lib/utils";

interface DealColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function DealColumn({
  stage,
  deals,
  onView,
  onEdit,
  onDelete,
}: DealColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { stage },
  });

  const totalAmount = React.useMemo(() => {
    return deals.reduce((sum, d) => sum + (parseFloat(String(d.amount)) || 0), 0);
  }, [deals]);

  const currency = deals[0]?.currency || "INR";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 sm:w-80 shrink-0 rounded-lg bg-slate-100/90 border border-slate-200/80 p-2.5 transition-colors duration-150 min-h-[500px]",
        isOver && "bg-blue-50/70 border-[#00AEEF] ring-2 ring-[#00AEEF]/20"
      )}
    >
      {/* Column Header matching Bitrix24 color styling */}
      <div className="mb-3 rounded-md bg-white p-3 shadow-2xs border-t-4 border-slate-200" style={{ borderTopColor: stage.color || "#00AEEF" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
            {stage.name}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
            {deals.length}
          </span>
        </div>

        {/* Sum of Deals in Column */}
        <div className="mt-1 text-sm font-semibold text-slate-700">
          {formatCurrency(totalAmount, currency)}
        </div>
      </div>

      {/* Deals List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {deals.length === 0 && (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400">
            No deals in this stage
          </div>
        )}
      </div>
    </div>
  );
}
