"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/crm";
import { formatDate } from "@/lib/utils";
import {
  CheckSquare,
  Clock,
  User as UserIcon,
  Briefcase,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";

interface TaskDetailsProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onRecordActivity?: (task: Task) => void;
}

export function TaskDetails({
  task,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onRecordActivity,
}: TaskDetailsProps) {
  if (!task) return null;

  const isCompleted = task.status === "completed";
  const overdue =
    task.due_date && !isCompleted && new Date(task.due_date).getTime() < Date.now();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Task Details"
      description="View task status, assigned team member, and related CRM context."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6 pt-2">
        {/* Header Profile Badge */}
        <div className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
              isCompleted
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-[#00AEEF]"
            }`}
          >
            <CheckSquare className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className={`text-base font-bold text-foreground truncate ${
                  isCompleted ? "line-through text-slate-400" : ""
                }`}
              >
                {task.title}
              </h2>
            </div>
            {task.description && (
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Task Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Status */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Status</span>
            <span className="font-semibold text-foreground capitalize mt-1 block">
              {task.status.replace("_", " ")}
            </span>
          </div>

          {/* Priority */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Priority</span>
            <span className="font-semibold text-foreground capitalize mt-1 block">
              {task.priority}
            </span>
          </div>

          {/* Due Date */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Due Date</span>
            <div
              className={`mt-1 font-semibold flex items-center gap-1 ${
                overdue ? "text-red-600" : "text-slate-700"
              }`}
            >
              {overdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
              <span>{formatDate(task.due_date)}</span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium block">Assigned Member</span>
            <span className="font-semibold text-slate-800 mt-1 block truncate">
              {task.assigned_to?.full_name || "Unassigned"}
            </span>
          </div>
        </div>

        {/* Connected CRM Records Section */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Associated CRM Relationship
          </span>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {task.deal && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Briefcase className="h-4 w-4 text-[#00AEEF]" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Deal</span>
                  <span className="font-semibold text-slate-800">{task.deal.title}</span>
                </div>
              </div>
            )}

            {task.contact && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Users className="h-4 w-4 text-purple-600" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Contact</span>
                  <span className="font-semibold text-slate-800">
                    {task.contact.full_name || `${task.contact.first_name} ${task.contact.last_name}`}
                  </span>
                </div>
              </div>
            )}

            {task.company && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-border shadow-2xs text-xs">
                <Building2 className="h-4 w-4 text-amber-600" />
                <div>
                  <span className="text-slate-400 text-[10px] block">Company</span>
                  <span className="font-semibold text-slate-800">{task.company.name}</span>
                </div>
              </div>
            )}

            {!task.deal && !task.contact && !task.company && (
              <span className="text-xs text-muted-foreground">
                No specific deal, contact, or company associated.
              </span>
            )}
          </div>
        </div>

        {/* Custom Fields Section if present */}
        {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Additional Information
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(task.custom_fields).map(([k, v]) => (
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

        {/* Quick Follow-up Action CTA */}
        {onRecordActivity && (
          <div className="flex items-center justify-between p-3 rounded-md bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
            <div>
              <span className="font-semibold block">Need to log a call or meeting?</span>
              <span className="text-[11px] text-blue-700">
                Record an activity directly connected to this follow-up workflow.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onRecordActivity(task);
              }}
              className="bg-white gap-1.5 text-xs text-[#00AEEF] border-blue-200 hover:bg-blue-50"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Log Activity
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
              onDelete(task);
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
              onClick={() => onToggleStatus(task)}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {isCompleted ? "Mark Pending" : "Mark Done"}
            </Button>

            <Button
              variant="bitrix"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(task);
              }}
              className="gap-1.5"
            >
              <Edit2 className="h-4 w-4" />
              Edit Task
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
