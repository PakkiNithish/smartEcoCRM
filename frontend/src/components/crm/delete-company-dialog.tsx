"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Company } from "@/types/crm";
import { api, ApiError } from "@/lib/api-client";
import { AlertTriangle, Loader2, ShieldAlert, Users, Briefcase } from "lucide-react";

interface DeleteCompanyDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (companyId: string) => void;
}

export function DeleteCompanyDialog({
  company,
  open,
  onOpenChange,
  onSuccess,
}: DeleteCompanyDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  if (!company) return null;

  const contactsCount = company.contacts_count ?? (company.contacts?.length ?? 0);
  const dealsCount = company.deals_count ?? (company.deals?.length ?? 0);
  const hasLinkedRecords = contactsCount > 0 || dealsCount > 0;

  async function handleDelete() {
    if (!company) return;
    setIsDeleting(true);
    setError(null);

    try {
      await api.deleteCompany(company.id);
      onSuccess(company.id);
      onOpenChange(false);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError(err.message || "Failed to delete company.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Company"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-2">
        {hasLinkedRecords ? (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <span>Deletion Guard: Associated Records Detected</span>
            </div>
            <p>
              Company <span className="font-semibold text-amber-950">{company.name}</span> cannot be deleted because it is currently linked to:
            </p>
            <div className="flex items-center gap-4 pl-1 font-medium text-amber-800">
              {contactsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{contactsCount} contact(s)</span>
                </div>
              )}
              {dealsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{dealsCount} deal(s)</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-amber-700">
              To protect CRM data integrity, please reassign or delete the associated contacts and deals before deleting this company.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1 text-xs text-red-900">
              <p className="font-semibold">Confirm Company Deletion</p>
              <p className="text-red-700">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-red-900">{company.name}</span>? This action cannot be undone.
              </p>
            </div>
          </div>
        )}

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
            disabled={isDeleting || hasLinkedRecords}
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
