"use client";

import React from "react";
import { ActivitiesToolbar } from "@/components/crm/activities-toolbar";
import { ActivitiesTable } from "@/components/crm/activities-table";
import { ActivityForm } from "@/components/crm/activity-form";
import { ActivityDetails } from "@/components/crm/activity-details";
import { DeleteActivityDialog } from "@/components/crm/delete-activity-dialog";
import { TaskForm } from "@/components/crm/task-form";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/states";
import { Activity } from "@/types/crm";
import { api } from "@/lib/api-client";

export default function ActivitiesPage() {
  // Data States
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [total, setTotal] = React.useState(0);
  const [skip, setSkip] = React.useState(0);
  const limit = 20;

  // Filter States
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("");
  const [selectedCompletion, setSelectedCompletion] = React.useState("");
  const [typeOptions, setTypeOptions] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("crm_form_config_activity");
      if (cached) {
        const fields = JSON.parse(cached);
        const tpField = fields.find((f: any) => f.key === "type");
        if (tpField?.options) setTypeOptions(tpField.options);
      }
    } catch {}

    api
      .getFormConfig("activity")
      .then((conf) => {
        const tpField = conf?.fields_config?.find((f) => f.key === "type");
        if (tpField?.options) setTypeOptions(tpField.options);
      })
      .catch(() => {});
  }, []);

  // Loading & Error States
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modals & Action States
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<Activity | null>(null);
  const [viewingActivity, setViewingActivity] = React.useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = React.useState<Activity | null>(null);

  // Task Creation triggered from Activity
  const [taskFormOpen, setTaskFormOpen] = React.useState(false);
  const [taskContext, setTaskContext] = React.useState<{
    dealId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    title?: string;
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

  // Fetch activities
  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isCompletedParam =
        selectedCompletion === "completed"
          ? true
          : selectedCompletion === "scheduled"
          ? false
          : undefined;

      const res = await api.getActivities({
        skip,
        limit,
        search: debouncedSearch,
        activity_type: selectedType || undefined,
        is_completed: isCompletedParam,
      });
      setActivities(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to load activities from server.");
    } finally {
      setIsLoading(false);
    }
  }, [skip, limit, debouncedSearch, selectedType, selectedCompletion]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Activity Saved Handler
  function handleActivitySaved(saved: Activity) {
    if (editingActivity) {
      setActivities((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      if (viewingActivity?.id === saved.id) {
        setViewingActivity(saved);
      }
      triggerSuccess(`Activity "${saved.subject}" updated successfully.`);
    } else {
      setActivities((prev) => [saved, ...prev]);
      setTotal((prev) => prev + 1);
      triggerSuccess(`Activity "${saved.subject}" recorded successfully.`);
    }
    setEditingActivity(null);
  }

  // Quick Completion Status Toggle
  async function handleToggleStatus(activity: Activity) {
    const newStatus = !activity.is_completed;
    try {
      const updated = await api.updateActivity(activity.id, { is_completed: newStatus });
      setActivities((prev) => prev.map((a) => (a.id === activity.id ? updated : a)));
      if (viewingActivity?.id === activity.id) {
        setViewingActivity(updated);
      }
      triggerSuccess(
        newStatus
          ? `Activity "${activity.subject}" marked as completed!`
          : `Activity "${activity.subject}" marked as scheduled.`
      );
    } catch (err: any) {
      triggerSuccess(err.message || "Failed to update activity status.");
    }
  }

  // Activity Deleted Handler
  function handleActivityDeleted(activityId: string) {
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (viewingActivity?.id === activityId) {
      setViewingActivity(null);
    }
    setDeletingActivity(null);
    triggerSuccess("Activity deleted successfully.");
  }

  // Quick Create Follow-up Task from Activity
  function handleCreateTask(activity: Activity) {
    setTaskContext({
      dealId: activity.deal_id,
      contactId: activity.contact_id,
      companyId: activity.company_id,
      title: `Follow up: ${activity.subject}`,
    });
    setTaskFormOpen(true);
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50">
      {/* Activities Toolbar */}
      <ActivitiesToolbar
        total={total}
        search={search}
        onSearchChange={setSearch}
        selectedType={selectedType}
        onTypeChange={(t) => {
          setSelectedType(t);
          setSkip(0);
        }}
        selectedCompleted={selectedCompletion}
        onCompletedChange={(c: string) => {
          setSelectedCompletion(c);
          setSkip(0);
        }}
        typeOptions={typeOptions}
        onCreateClick={() => {
          setEditingActivity(null);
          setIsFormOpen(true);
        }}
        onRefresh={fetchActivities}
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
        {isLoading && activities.length === 0 ? (
          <LoadingState message="Loading CRM activities and interactions..." />
        ) : error && activities.length === 0 ? (
          <ErrorState
            title="Failed to Load Activities"
            message={error}
            onRetry={fetchActivities}
          />
        ) : activities.length === 0 && !debouncedSearch && !selectedType && !selectedCompletion ? (
          <EmptyState
            title="No Activities Logged Yet"
            description="Record calls, meetings, notes, and emails connected to your deals and contacts to track your customer engagement timeline."
            actionLabel="Record Activity"
            onAction={() => {
              setEditingActivity(null);
              setIsFormOpen(true);
            }}
          />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
            No activities match your current filter or search criteria.
          </div>
        ) : (
          <ActivitiesTable
            activities={activities}
            total={total}
            skip={skip}
            limit={limit}
            onPageChange={setSkip}
            onView={(a) => setViewingActivity(a)}
            onEdit={(a) => {
              setEditingActivity(a);
              setIsFormOpen(true);
            }}
            onDelete={(a) => setDeletingActivity(a)}
            onToggleCompleted={handleToggleStatus}
          />
        )}
      </div>

      {/* Activity Form Dialog */}
      <ActivityForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialActivity={editingActivity}
        onSuccess={handleActivitySaved}
      />

      {/* Activity Details Dialog */}
      <ActivityDetails
        activity={viewingActivity}
        open={!!viewingActivity}
        onOpenChange={(open) => !open && setViewingActivity(null)}
        onEdit={(a) => {
          setEditingActivity(a);
          setIsFormOpen(true);
        }}
        onDelete={(a) => setDeletingActivity(a)}
        onToggleStatus={handleToggleStatus}
        onCreateTask={handleCreateTask}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteActivityDialog
        activity={deletingActivity}
        open={!!deletingActivity}
        onOpenChange={(open) => !open && setDeletingActivity(null)}
        onSuccess={handleActivityDeleted}
      />

      {/* Task Form triggered from Activity */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        defaultTitle={taskContext.title}
        defaultDealId={taskContext.dealId}
        defaultContactId={taskContext.contactId}
        defaultCompanyId={taskContext.companyId}
        onSuccess={(task) => {
          triggerSuccess(`Follow-up task "${task.title}" created successfully!`);
        }}
      />
    </div>
  );
}
