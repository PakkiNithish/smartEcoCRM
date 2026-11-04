"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Activity } from "@/types/crm";
import { formatDate } from "@/lib/utils";
import {
  PhoneCall,
  Calendar,
  Mail,
  FileText,
  Clock,
  Briefcase,
  Users,
  Building2,
  CheckCircle2,
  Edit2,
  Trash2,
  CheckSquare,
} from "lucide-react";

interface ActivityDetailsProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onToggleStatus: (activity: Activity) => void;
  onCreateTask?: (activity: Activity) => void;
}

export function ActivityDetails({
  activity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreateTask,
}: ActivityDetailsProps) {
  if (!activity) return null;

  const isCompleted = activity.is_completed;

  const typeConfig: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; text: string }
  > = {
    call: { label: "Phone Call", icon: PhoneCall, bg: "bg-blue-100", text: "text-blue-600" },
    meeting: { label: "Meeting", icon: Calendar, bg: "bg-purple-100", text: "text-purple-600" },
    email: { label: "Email", icon: Mail, bg: "bg-emerald-100", text: "text-emerald-600" },
    note: { label: "Note", icon: FileText, bg: "bg-amber-100", text: "text-amber-600" },
    follow_up: { label: "Follow-up", icon: Clock, bg: "bg-indigo-100", text: "text-indigo-600" },
  };

  const config = typeConfig[activity.type] || typeConfig.note;
  const IconComponent = config.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Activity Details"
      description="View interaction records, notes, and connected CRM relationships."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6 pt-2">
        {/* Header Profile Badge */}
        <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${config.bg} ${config.text}`}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className={`text-base font-bold text-foreground truncate ${
                  isCompleted ? "line-through text-slate-400" : ""
                }`}
              >
                {activity.subject}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-500 capitalize">
                {config.label}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isCompleted ? "Completed" : "Scheduled"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Description */}
        {(activity.notes || activity.description) ? (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
              Notes & Summary
            </span>
            <div className="p-3.5 rounded-lg bg-card border border-border text-xs text-foreground leading-relaxed whitespace-pre-line">
              {activity.notes || activity.description}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-card border border-dashed border-border text-xs text-muted-foreground italic">
            No notes or details recorded for this activity.
          </div>
        )}

        {/* Activity Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Activity Date & Time */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Date & Time</span>
            <span className="font-semibold text-foreground mt-1 block">
              {formatDate(activity.scheduled_at || activity.activity_date || activity.created_at)}
            </span>
          </div>

          {/* Recorded By */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Recorded By</span>
            <span className="font-semibold text-foreground mt-1 block truncate">
              {activity.user?.full_name || "CRM System"}
            </span>
          </div>
        </div>

        {/* Connected CRM Records Section */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Associated CRM Relationship
          </span>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {activity.deal && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Briefcase className="h-4 w-4 text-[#00AEEF]" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Deal</span>
                  <span className="font-semibold text-slate-800">{activity.deal.title}</span>
                </div>
              </div>
            )}

            {activity.contact && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Contact</span>
                  <span className="font-semibold text-slate-800">
                    {activity.contact.full_name ||
                      `${activity.contact.first_name} ${activity.contact.last_name}`}
                  </span>
                </div>
              </div>
            )}

            {activity.company && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Building2 className="h-4 w-4 text-amber-600" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Company</span>
                  <span className="font-semibold text-slate-800">{activity.company.name}</span>
                </div>
              </div>
            )}

            {!activity.deal && !activity.contact && !activity.company && (
              <span className="text-xs text-muted-foreground">
                No specific deal, contact, or company associated.
              </span>
            )}
          </div>
        </div>

        {/* Custom Fields Section if present */}
        {activity.custom_fields && Object.keys(activity.custom_fields).length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Additional Information
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(activity.custom_fields).map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 text-[10px] block capitalize">
                    {k.replace(/^cf_/, "").replace(/_\d+$/, "").replace(/_/g, " ")}
                  </span>
                  <span className="font-semibold text-slate-800 break-words">
                    {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v || "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Workflow Action */}
        {onCreateTask && (
          <div className="flex items-center justify-between p-3 rounded-md bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900">
            <div>
              <span className="font-semibold block">Next Step in Core CRM Workflow</span>
              <span className="text-[11px] text-emerald-700">
                Create a follow-up task assigned to team members linked to this context.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onCreateTask(activity);
              }}
              className="bg-white gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Follow-up Task
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(activity);
            }}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(activity)}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {isCompleted ? "Mark Scheduled" : "Mark Completed"}
            </Button>

            <Button
              variant="bitrix"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(activity);
              }}
              className="gap-1.5"
            >
              <Edit2 className="h-4 w-4" />
              Edit Activity
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
