"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/crm";
import { api, ApiError } from "@/lib/api-client";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (taskId: string) => void;
}

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  if (!task) return null;

  async function handleDelete() {
    if (!task) return;
    setIsDeleting(true);
    setError(null);

    try {
      await api.deleteTask(task.id);
      onSuccess(task.id);
      onOpenChange(false);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || "Failed to delete task.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Task"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3.5">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1 text-xs text-red-900">
            <p className="font-semibold">Confirm Task Deletion</p>
            <p className="text-red-700">
              Are you sure you want to permanently delete task{" "}
              <span className="font-semibold text-red-900">&ldquo;{task.title}&rdquo;</span>? This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-100 border border-red-200 text-red-800 rounded-md">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end pt-3 border-t border-border">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
