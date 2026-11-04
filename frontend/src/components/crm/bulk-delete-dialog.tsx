"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  entityName: string; // e.g., "deal", "deals", "contact", "company"
  onConfirm: () => Promise<void>;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  entityName,
  onConfirm,
}: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to delete selected items.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${count} ${count === 1 ? entityName : entityName + "s"}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 leading-relaxed">
            Are you sure you want to permanently delete{" "}
            <span className="font-bold">
              {count} {count === 1 ? entityName : entityName + "s"}
            </span>
            ? This action cannot be reversed and will remove all associated records.
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${count} Items`
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
