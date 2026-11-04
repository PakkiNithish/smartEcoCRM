"use client";

import React from "react";
import {
  CheckSquare,
  Square,
  Clock,
  AlertTriangle,
  Briefcase,
  Users,
  Building2,
  User as UserIcon,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Task } from "@/types/crm";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableActionMenu } from "@/components/ui/table-action-menu";

interface TasksTableProps {
  tasks: Task[];
  total: number;
  skip: number;
  limit: number;
  onPageChange: (newSkip: number) => void;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
}

export function TasksTable({
  tasks,
  total,
  skip,
  limit,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: TasksTableProps) {
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

  function getPriorityBadge(priority: string) {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-50 text-red-700 border-red-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-blue-50 text-[#00AEEF] border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  }

  function getStatusBadge(status: string) {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "in_progress":
        return "bg-blue-50 text-[#00AEEF] border-blue-200";
      case "cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  }

  function isOverdue(dueDateStr?: string | null, status?: string) {
    if (!dueDateStr || status === "completed" || status === "cancelled") return false;
    return new Date(dueDateStr).getTime() < Date.now();
  }

  return (
    <div className="flex flex-col flex-1 p-6">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3 w-10">Done</th>
                <th scope="col" className="px-5 py-3">Task Title</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3">Priority</th>
                <th scope="col" className="px-5 py-3">Due Date</th>
                <th scope="col" className="px-5 py-3">Assigned To</th>
                <th scope="col" className="px-5 py-3">Related CRM Record</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => {
                const overdue = isOverdue(task.due_date, task.status);
                const isCompleted = task.status === "completed";

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                      isCompleted ? "opacity-75 bg-slate-50/40" : ""
                    }`}
                  >
                    {/* Quick Complete Toggle Checkbox */}
                    <td
                      className="px-5 py-3.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(task);
                      }}
                    >
                      <button
                        type="button"
                        className="text-slate-400 hover:text-emerald-600 transition-colors"
                        title={isCompleted ? "Mark incomplete" : "Mark completed"}
                      >
                        {isCompleted ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>

                    {/* Task Title & Description snippet */}
                    <td
                      onClick={() => onView(task)}
                      className="px-5 py-3.5 font-medium max-w-xs"
                    >
                      <div
                        className={`font-semibold text-foreground group-hover:text-[#00AEEF] transition-colors ${
                          isCompleted ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td onClick={() => onView(task)} className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize border ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Priority Badge */}
                    <td onClick={() => onView(task)} className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td onClick={() => onView(task)} className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {task.due_date ? (
                        <div
                          className={`flex items-center gap-1.5 ${
                            overdue ? "text-red-600 font-semibold" : "text-slate-600"
                          }`}
                        >
                          {overdue ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Assigned User */}
                    <td onClick={() => onView(task)} className="px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {task.assigned_to ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{task.assigned_to.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Related CRM Record */}
                    <td onClick={() => onView(task)} className="px-5 py-3.5 text-xs">
                      {task.deal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#00AEEF] font-medium border border-blue-100 max-w-[160px] truncate">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.deal.title}</span>
                        </span>
                      ) : task.contact ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100 max-w-[160px] truncate">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {task.contact.full_name || `${task.contact.first_name} ${task.contact.last_name}`}
                          </span>
                        </span>
                      ) : task.company ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100 max-w-[160px] truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.company.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <TableActionMenu
                        isOpen={activeMenuId === task.id}
                        onOpenChange={(open) => setActiveMenuId(open ? task.id : null)}
                        items={[
                          {
                            label: "View Details",
                            icon: Eye,
                            onClick: () => onView(task),
                          },
                          {
                            label: "Edit Task",
                            icon: Edit2,
                            onClick: () => onEdit(task),
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => onDelete(task),
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
            <span className="font-medium text-foreground">{total}</span> tasks
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
