"use client";

import React from "react";
import { TasksToolbar } from "@/components/crm/tasks-toolbar";
import { TasksTable } from "@/components/crm/tasks-table";
import { TaskForm } from "@/components/crm/task-form";
import { TaskDetails } from "@/components/crm/task-details";
import { DeleteTaskDialog } from "@/components/crm/delete-task-dialog";
import { ActivityForm } from "@/components/crm/activity-form";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { Task } from "@/types/crm";
import { api } from "@/lib/api-client";

export default function TasksPage() {
  // Data States
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [total, setTotal] = React.useState(0);
  const [skip, setSkip] = React.useState(0);
  const limit = 20;

  // Filter States
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedPriority, setSelectedPriority] = React.useState("");
  const [statusOptions, setStatusOptions] = React.useState<string[]>([]);
  const [priorityOptions, setPriorityOptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("crm_form_config_task");
      if (cached) {
        const fields = JSON.parse(cached);
        const stField = fields.find((f: any) => f.key === "status");
        if (stField?.options) setStatusOptions(stField.options);
        const prField = fields.find((f: any) => f.key === "priority");
        if (prField?.options) setPriorityOptions(prField.options);
      }
    } catch {}

    api
      .getFormConfig("task")
      .then((conf) => {
        const stField = conf?.fields_config?.find((f) => f.key === "status");
        if (stField?.options) setStatusOptions(stField.options);
        const prField = conf?.fields_config?.find((f) => f.key === "priority");
        if (prField?.options) setPriorityOptions(prField.options);
      })
      .catch(() => {});
  }, []);

  // Loading & Error States
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals & Action States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [viewingTask, setViewingTask] = React.useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = React.useState<Task | null>(null);

  // Activity Quick-Log from Task
  const [activityFormOpen, setActivityFormOpen] = React.useState(false);
  const [activityContext, setActivityContext] = React.useState<{
    dealId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
  }>({});

  // Success Notification
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  function triggerSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setSkip(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch tasks
  const fetchTasks = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getTasks({
        skip,
        limit,
        search: debouncedSearch,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
      });
      setTasks(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to load tasks from server.");
    } finally {
      setIsLoading(false);
    }
  }, [skip, limit, debouncedSearch, selectedStatus, selectedPriority]);

  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Task Saved Handler
  function handleTaskSaved(saved: Task) {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      if (viewingTask?.id === saved.id) {
        setViewingTask(saved);
      }
      triggerSuccess(`Task "${saved.title}" updated successfully.`);
    } else {
      setTasks((prev) => [saved, ...prev]);
      setTotal((prev) => prev + 1);
      triggerSuccess(`Task "${saved.title}" created successfully.`);
    }
    setEditingTask(null);
  }

  // Quick Status Toggle (Complete <-> Pending)
  async function handleToggleStatus(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const updated = await api.updateTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      if (viewingTask?.id === task.id) {
        setViewingTask(updated);
      }
      triggerSuccess(
        newStatus === "completed"
          ? `Task "${task.title}" marked as completed!`
          : `Task "${task.title}" reopened.`
      );
    } catch (err: any) {
      triggerSuccess(err.message || "Failed to update task status.");
    }
  }

  // Task Deleted Handler
  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (viewingTask?.id === taskId) {
      setViewingTask(null);
    }
    setDeletingTask(null);
    triggerSuccess("Task deleted successfully.");
  }

  // Quick Log Activity from Task Handler
  function handleRecordActivity(task: Task) {
    setActivityContext({
      dealId: task.deal_id,
      contactId: task.contact_id,
      companyId: task.company_id,
    });
    setActivityFormOpen(true);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Tasks Toolbar */}
      <TasksToolbar
        total={total}
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={(s) => {
          setSelectedStatus(s);
          setSkip(0);
        }}
        selectedPriority={selectedPriority}
        onPriorityChange={(p) => {
          setSelectedPriority(p);
          setSkip(0);
        }}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        onCreateClick={() => {
          setEditingTask(null);
          setIsFormOpen(true);
        }}
        onRefresh={fetchTasks}
        isLoading={isLoading}
      />

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mx-6 mt-3 flex items-center justify-between rounded-md bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 border border-emerald-200 shadow-xs animate-in fade-in">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto min-h-0">
        {isLoading && tasks.length === 0 ? (
          <LoadingState message="Loading CRM follow-up tasks..." />
        ) : error && tasks.length === 0 ? (
          <ErrorState
            title="Failed to Load Tasks"
            message={error}
            onRetry={fetchTasks}
          />
        ) : tasks.length === 0 && !debouncedSearch && !selectedStatus && !selectedPriority ? (
          <EmptyState
            title="No Tasks Found"
            description="Create follow-up tasks connected to your deals, contacts, and companies to track pipeline commitments."
            actionLabel="Add Task"
            onAction={() => {
              setEditingTask(null);
              setIsFormOpen(true);
            }}
          />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
            No tasks match your current filter or search criteria.
          </div>
        ) : (
          <TasksTable
            tasks={tasks}
            total={total}
            skip={skip}
            limit={limit}
            onPageChange={setSkip}
            onView={(t) => setViewingTask(t)}
            onEdit={(t) => {
              setEditingTask(t);
              setIsFormOpen(true);
            }}
            onDelete={(t) => setDeletingTask(t)}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      {/* Task Form Dialog */}
      <TaskForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialTask={editingTask}
        onSuccess={handleTaskSaved}
      />

      {/* Task Details Dialog */}
      <TaskDetails
        task={viewingTask}
        open={!!viewingTask}
        onOpenChange={(open) => !open && setViewingTask(null)}
        onEdit={(t) => {
          setEditingTask(t);
          setIsFormOpen(true);
        }}
        onDelete={(t) => setDeletingTask(t)}
        onToggleStatus={handleToggleStatus}
        onRecordActivity={handleRecordActivity}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteTaskDialog
        task={deletingTask}
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(null)}
        onSuccess={handleTaskDeleted}
      />

      {/* Activity Form triggered from Task */}
      <ActivityForm
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        defaultDealId={activityContext.dealId}
        defaultContactId={activityContext.contactId}
        defaultCompanyId={activityContext.companyId}
        onSuccess={() => {
          triggerSuccess("Activity recorded successfully in CRM timeline!");
        }}
      />
    </div>
  );
}
