"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Calendar,
  Building,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  GripVertical,
} from "lucide-react";
import { Deal } from "@/types/crm";
import { formatCurrency, formatDate, getContactName, cn } from "@/lib/utils";
import { TableActionMenu } from "@/components/ui/table-action-menu";

interface DealCardProps {
  deal: Deal;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  isDragOverlay?: boolean;
}

export function DealCard({
  deal,
  onView,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: DealCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: deal.id,
      data: { deal },
      disabled: isDragOverlay,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const contactName = getContactName(deal.contact);
  const companyName = deal.company?.name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-150 hover:shadow-md hover:border-slate-300",
        isDragging && "opacity-40 border-dashed border-[#00AEEF] scale-[0.98]",
        isDragOverlay && "shadow-xl border-[#00AEEF] rotate-1 scale-105 z-50 cursor-grabbing bg-white"
      )}
    >
      {/* Top Header: Grip handle, Title, and Action Menu */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing p-0.5 rounded-sm hover:bg-slate-100"
            title="Drag to change stage"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <h4
            onClick={() => onView(deal)}
            className="text-sm font-semibold text-foreground hover:text-[#00AEEF] transition-colors line-clamp-2 cursor-pointer"
          >
            {deal.title}
          </h4>
        </div>

        {/* Action Menu */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <TableActionMenu
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
            items={[
              {
                label: "View Details",
                icon: Eye,
                onClick: () => onView(deal),
              },
              {
                label: "Edit Deal",
                icon: Edit2,
                onClick: () => onEdit(deal),
              },
              {
                label: "Delete",
                icon: Trash2,
                variant: "destructive",
                onClick: () => onDelete(deal),
              },
            ]}
          />
        </div>
      </div>

      {/* Amount & Currency Badge */}
      <div className="mb-2">
        <span className="text-base font-bold text-slate-900 tracking-tight">
          {formatCurrency(deal.amount, deal.currency)}
        </span>
      </div>

      {/* Custom Fields Badges on Kanban */}
      {deal.custom_fields && Object.keys(deal.custom_fields).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.entries(deal.custom_fields).slice(0, 3).map(([k, v]) => {
            if (v === undefined || v === null || v === "") return null;
            const label = k.replace(/^cf_/, "").replace(/_\d+$/, "").replace(/_/g, " ");
            return (
              <span
                key={k}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200 capitalize font-medium truncate max-w-[140px]"
              >
                {label}: {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
              </span>
            );
          })}
        </div>
      )}

      {/* Meta Information: Contact, Responsible, Date */}
      <div className="space-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-muted-foreground">
        {/* Contact */}
        {contactName && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700">
              {contactName}
            </span>
          </div>
        )}

        {/* Company */}
        {companyName && (
          <div className="flex items-center gap-1.5 truncate">
            <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700">
              {companyName}
            </span>
          </div>
        )}

        {/* Responsible Agent */}
        {deal.responsible_user && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{deal.responsible_user.full_name}</span>
          </div>
        )}

        {/* Expected Close Date */}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span>Close: {formatDate(deal.expected_close_date)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
