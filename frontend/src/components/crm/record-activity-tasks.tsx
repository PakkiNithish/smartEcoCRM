"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Task, Activity } from "@/types/crm";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { TaskForm } from "@/components/crm/task-form";
import { ActivityForm } from "@/components/crm/activity-form";
import {
  CheckSquare,
  Clock,
  PlusCircle,
  PhoneCall,
  Calendar,
  Mail,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";

interface RecordActivityTasksProps {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  defaultTab?: "tasks" | "activities";
  isCreateMode?: boolean;
  stagedActivities?: Activity[];
  stagedTasks?: Task[];
  onStageActivity?: (activity: Activity) => void;
  onStageTask?: (task: Task) => void;
  onRemoveStagedActivity?: (id: string) => void;
  onRemoveStagedTask?: (id: string) => void;
}

export function RecordActivityTasks({
  dealId,
  contactId,
  companyId,
  defaultTab = "activities",
  isCreateMode = false,
  stagedActivities = [],
  stagedTasks = [],
  onStageActivity,
  onStageTask,
  onRemoveStagedActivity,
  onRemoveStagedTask,
}: RecordActivityTasksProps) {
  const [activeTab, setActiveTab] = React.useState<"tasks" | "activities">(defaultTab);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Modal states
  const [taskFormOpen, setTaskFormOpen] = React.useState(false);
  const [activityFormOpen, setActivityFormOpen] = React.useState(false);

  const fetchRelated = React.useCallback(async () => {
    if (isCreateMode || (!dealId && !contactId && !companyId)) return;
    setLoading(true);
    try {
      const [tasksRes, activitiesRes] = await Promise.all([
        api.getTasks({
          deal_id: dealId || undefined,
          contact_id: contactId || undefined,
          company_id: companyId || undefined,
          limit: 10,
        }),
        api.getActivities({
          deal_id: dealId || undefined,
          contact_id: contactId || undefined,
          company_id: companyId || undefined,
          limit: 10,
        }),
      ]);
      setTasks(tasksRes.items);
      setActivities(activitiesRes.items);
    } catch (err) {
      console.error("Failed to load related tasks and activities", err);
    } finally {
      setLoading(false);
    }
  }, [dealId, contactId, companyId, isCreateMode]);

  React.useEffect(() => {
    fetchRelated();
  }, [fetchRelated]);

  const effectiveActivities = isCreateMode ? stagedActivities : activities;
  const effectiveTasks = isCreateMode ? stagedTasks : tasks;

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error("Failed to toggle task status", err);
    }
  }

  async function handleToggleActivity(activity: Activity) {
    const newStatus = !activity.is_completed;
    try {
      const updated = await api.updateActivity(activity.id, { is_completed: newStatus });
      setActivities((prev) => prev.map((a) => (a.id === activity.id ? updated : a)));
    } catch (err) {
      console.error("Failed to toggle activity status", err);
    }
  }

  const activityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <PhoneCall className="h-3.5 w-3.5 text-blue-500" />;
      case "meeting":
        return <Calendar className="h-3.5 w-3.5 text-purple-500" />;
      case "email":
        return <Mail className="h-3.5 w-3.5 text-emerald-500" />;
      case "follow_up":
        return <Clock className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {isCreateMode && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#00AEEF] shrink-0" />
          <span>Activities & tasks scheduled here will be automatically created when saved.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "activities"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Activities ({effectiveActivities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "tasks"
                ? "bg-blue-50 text-[#00AEEF] border border-blue-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks ({effectiveTasks.length})
          </button>
        </div>

        <div>
          {activeTab === "activities" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivityFormOpen(true)}
              className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Log Activity
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTaskFormOpen(true)}
              className="h-7 text-xs gap-1 border-blue-200 text-[#00AEEF] hover:bg-blue-50 cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#00AEEF]" />
          Loading workflow history...
        </div>
      ) : activeTab === "activities" ? (
        <div className="space-y-2">
          {effectiveActivities.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden bg-card">
              {effectiveActivities.map((act) => {
                const isDone = act.is_completed;
                return (
                  <div
                    key={act.id}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => !isCreateMode && handleToggleActivity(act)}
                        disabled={isCreateMode}
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {activityIcon(act.type)}
                        <div className="min-w-0">
                          <span
                            className={`font-semibold text-slate-800 block truncate ${
                              isDone ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {act.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {formatDate(act.scheduled_at || act.activity_date || act.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          isCreateMode
                            ? "bg-purple-100 text-purple-800"
                            : isDone
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isCreateMode ? "Scheduled" : isDone ? "Done" : "Scheduled"}
                      </span>
                      {isCreateMode && onRemoveStagedActivity && (
                        <button
                          type="button"
                          onClick={() => onRemoveStagedActivity(act.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                          title="Remove activity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
              {isCreateMode
                ? "No activities planned yet. Click 'Log Activity' to schedule a call, meeting, or note."
                : "No customer activities recorded for this record."}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {effectiveTasks.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden bg-card">
              {effectiveTasks.map((task) => {
                const isDone = task.status === "completed";
                const overdue =
                  task.due_date && !isDone && new Date(task.due_date).getTime() < Date.now();
                return (
                  <div
                    key={task.id}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => !isCreateMode && handleToggleTask(task)}
                        disabled={isCreateMode}
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      <div className="min-w-0">
                        <span
                          className={`font-semibold text-slate-800 block truncate ${
                            isDone ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {task.due_date && (
                            <span className={overdue ? "text-red-600 font-semibold flex items-center gap-0.5" : ""}>
                              {overdue && <AlertTriangle className="h-2.5 w-2.5" />}
                              Due {formatDate(task.due_date)}
                            </span>
                          )}
                          {task.assigned_to && (
                            <span>• {task.assigned_to.full_name}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${
                          isCreateMode
                            ? "bg-blue-100 text-blue-800"
                            : task.priority === "urgent"
                            ? "bg-red-100 text-red-800"
                            : task.priority === "high"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isCreateMode ? "Scheduled" : task.priority}
                      </span>
                      {isCreateMode && onRemoveStagedTask && (
                        <button
                          type="button"
                          onClick={() => onRemoveStagedTask(task.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                          title="Remove task"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
              {isCreateMode
                ? "No tasks scheduled yet. Click 'Add Task' to assign follow-ups."
                : "No follow-up tasks linked to this record."}
            </div>
          )}
        </div>
      )}

      {/* Task Form Modal */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        defaultDealId={dealId}
        defaultContactId={contactId}
        defaultCompanyId={companyId}
        onStageCreate={isCreateMode ? (task) => onStageTask?.(task) : undefined}
        onSuccess={() => {
          fetchRelated();
        }}
      />

      {/* Activity Form Modal */}
      <ActivityForm
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        defaultDealId={dealId}
        defaultContactId={contactId}
        defaultCompanyId={companyId}
        onStageCreate={isCreateMode ? (act) => onStageActivity?.(act) : undefined}
        onSuccess={() => {
          fetchRelated();
        }}
      />
    </div>
  );
}
