"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Deal } from "@/types/crm";
import { api } from "@/lib/api-client";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteDealDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (dealId: string) => void;
}

export function DeleteDealDialog({
  deal,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDealDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!deal) return null;

  async function handleDelete() {
    if (!deal) return;
    setIsDeleting(true);
    setError(null);

    try {
      await api.deleteDeal(deal.id);
      onDeleted(deal.id);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to delete deal.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Deal"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 p-3.5">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 leading-relaxed">
            Are you sure you want to delete <span className="font-bold">&ldquo;{deal.title}&rdquo;</span>? This action is permanent and cannot be undone.
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-600 font-medium">
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
            className="min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Deal"
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
