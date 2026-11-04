"use client";

import React from "react";
import {
  Phone,
  Calendar,
  Mail,
  FileText,
  CheckCircle2,
  CheckCircle,
  Circle,
  Briefcase,
  Users,
  Building2,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import { Activity } from "@/types/crm";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableActionMenu } from "@/components/ui/table-action-menu";

interface ActivitiesTableProps {
  activities: Activity[];
  total: number;
  skip: number;
  limit: number;
  onPageChange: (newSkip: number) => void;
  onView: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onToggleCompleted: (activity: Activity) => void;
}

export function ActivitiesTable({
  activities,
  total,
  skip,
  limit,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onToggleCompleted,
}: ActivitiesTableProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startRecord = total === 0 ? 0 : skip + 1;
  const endRecord = Math.min(skip + limit, total);

  React.useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    if (activeMenuId) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  function getTypeConfig(type: string) {
    switch (type.toLowerCase()) {
      case "call":
        return { icon: Phone, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Call" };
      case "meeting":
        return { icon: Calendar, color: "text-purple-600 bg-purple-50 border-purple-200", label: "Meeting" };
      case "email":
        return { icon: Mail, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Email" };
      case "follow_up":
        return { icon: CheckCircle, color: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "Follow-up" };
      default:
        return { icon: FileText, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Note" };
    }
  }

  return (
    <div className="flex flex-col flex-1 p-6">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3 w-10">Done</th>
                <th scope="col" className="px-5 py-3">Type</th>
                <th scope="col" className="px-5 py-3">Subject / Notes</th>
                <th scope="col" className="px-5 py-3">Date & Time</th>
                <th scope="col" className="px-5 py-3">Related CRM Record</th>
                <th scope="col" className="px-5 py-3">Creator</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activities.map((activity) => {
                const typeConfig = getTypeConfig(activity.type);
                const Icon = typeConfig.icon;
                const isDone = activity.is_completed;

                return (
                  <tr
                    key={activity.id}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                      isDone ? "bg-slate-50/30" : ""
                    }`}
                  >
                    {/* Status Toggle Button */}
                    <td
                      className="px-5 py-3.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompleted(activity);
                      }}
                    >
                      <button
                        type="button"
                        className="text-slate-400 hover:text-emerald-600 transition-colors"
                        title={isDone ? "Mark as pending" : "Mark as completed"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                    </td>

                    {/* Type Badge */}
                    <td onClick={() => onView(activity)} className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {typeConfig.label}
                      </span>
                    </td>

                    {/* Subject & Notes Preview */}
                    <td onClick={() => onView(activity)} className="px-5 py-3.5 max-w-sm">
                      <div
                        className={`font-semibold text-foreground group-hover:text-[#00AEEF] transition-colors ${
                          isDone ? "text-slate-700" : ""
                        }`}
                      >
                        {activity.subject}
                      </div>
                      {activity.notes && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {activity.notes}
                        </div>
                      )}
                    </td>

                    {/* Scheduled / Logged Date */}
                    <td onClick={() => onView(activity)} className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(activity.scheduled_at || activity.created_at)}
                    </td>

                    {/* Related CRM Record */}
                    <td onClick={() => onView(activity)} className="px-5 py-3.5 text-xs">
                      {activity.deal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#00AEEF] font-medium border border-blue-100 max-w-[150px] truncate">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{activity.deal.title}</span>
                        </span>
                      ) : activity.contact ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100 max-w-[150px] truncate">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {activity.contact.full_name || `${activity.contact.first_name} ${activity.contact.last_name}`}
                          </span>
                        </span>
                      ) : activity.company ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100 max-w-[150px] truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{activity.company.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Creator */}
                    <td onClick={() => onView(activity)} className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {activity.user ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span>{activity.user.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">CRM System</span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <TableActionMenu
                        isOpen={activeMenuId === activity.id}
                        onOpenChange={(open) => setActiveMenuId(open ? activity.id : null)}
                        items={[
                          {
                            label: "View Details",
                            icon: Eye,
                            onClick: () => onView(activity),
                          },
                          {
                            label: "Edit Activity",
                            icon: Edit2,
                            onClick: () => onEdit(activity),
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => onDelete(activity),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="flex items-center justify-between border-t border-border bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-medium text-foreground">{startRecord}</span> to{" "}
            <span className="font-medium text-foreground">{endRecord}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> activities
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={skip === 0}
              onClick={() => onPageChange(Math.max(0, skip - limit))}
              className="h-8 gap-1 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="px-2 text-xs font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={skip + limit >= total}
              onClick={() => onPageChange(skip + limit)}
              className="h-8 gap-1 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
