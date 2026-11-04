"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Deal } from "@/types/crm";
import { formatCurrency, formatDate, getContactName } from "@/lib/utils";
import {
  Calendar,
  Building,
  User,
  Edit2,
  Trash2,
  Clock,
  Tag,
  DollarSign,
  FileText,
} from "lucide-react";

import { RecordActivityTasks } from "@/components/crm/record-activity-tasks";

interface DealDetailsProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function DealDetails({
  deal,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: DealDetailsProps) {
  if (!deal) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={deal.title}
      description="Opportunity details & pipeline information."
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 pt-2">
        {/* Stage & Amount Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-slate-50 p-4">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium mb-1">
              Current Stage
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white shadow-2xs"
              style={{ backgroundColor: deal.stage?.color || "#00AEEF" }}
            >
              {deal.stage?.name || "Pipeline"}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium mb-1">
              Deal Value
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(deal.amount, deal.currency)}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {/* Contact Person */}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Contact Person</span>
            </div>
            <div className="font-semibold text-foreground">
              {getContactName(deal.contact) || "—"}
            </div>
            {deal.contact?.email && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {deal.contact.email}
              </div>
            )}
          </div>

          {/* Company */}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              <span>Company / Account</span>
            </div>
            <div className="font-semibold text-foreground">
              {deal.company?.name || "—"}
            </div>
            {deal.company?.industry && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {deal.company.industry}
              </div>
            )}
          </div>

          {/* Responsible Agent */}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>Responsible Agent</span>
            </div>
            <div className="font-semibold text-foreground">
              {deal.responsible_user?.full_name || "Unassigned"}
            </div>
          </div>

          {/* Expected Close Date */}
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Expected Close Date</span>
            </div>
            <div className="font-semibold text-foreground">
              {formatDate(deal.expected_close_date)}
            </div>
          </div>
        </div>

        {/* Description */}
        {deal.description && (
          <div className="rounded-md border border-border p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Notes & Description</span>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {deal.description}
            </p>
          </div>
        )}

        {/* Dynamic Custom Fields */}
        {deal.custom_fields && Object.keys(deal.custom_fields).length > 0 && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(deal.custom_fields).map(([key, val]) => {
                if (val === undefined || val === null || val === "") return null;
                const formattedKey = key
                  .replace(/^cf_/, "")
                  .replace(/_\d+$/, "")
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key} className="p-2 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="text-slate-400 font-medium text-[10px] block uppercase">
                      {formattedKey}
                    </span>
                    <span className="font-semibold text-slate-800 break-words">
                      {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CRM Follow-up Tasks & Interaction Activities */}
        <RecordActivityTasks
          dealId={deal.id}
          contactId={deal.contact_id}
          companyId={deal.company_id}
        />

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
          <span>Created: {formatDate(deal.created_at)}</span>
          <span>Updated: {formatDate(deal.updated_at)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(deal);
            }}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(deal);
              }}
              className="gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Deal</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
