"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Contact, ContactDealSummary } from "@/types/crm";
import { formatDate, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api-client";
import {
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

import { RecordActivityTasks } from "@/components/crm/record-activity-tasks";

interface ContactDetailsProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactDetails({
  contact,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ContactDetailsProps) {
  const [currentDealsList, setCurrentDealsList] = React.useState<ContactDealSummary[]>(contact?.deals || []);

  React.useEffect(() => {
    setCurrentDealsList(contact?.deals || []);
  }, [contact?.deals]);

  const handleDeleteDeal = async (dealId: string, dealTitle?: string) => {
    if (!window.confirm(`Are you sure you want to remove the deal "${dealTitle || "this deal"}"?`)) {
      return;
    }
    try {
      await api.deleteDeal(dealId);
      setCurrentDealsList((prev) => prev.filter((d) => d.id !== dealId));
    } catch (err: any) {
      console.error("Failed to delete deal:", err);
      alert(err.message || "Failed to remove deal");
    }
  };

  if (!contact) return null;

  const fullName =
    contact.full_name || `${contact.first_name} ${contact.last_name}`.trim();
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() || "C";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Contact Profile"
      description="View full contact details, company association, and related deals."
      maxWidth="max-w-xl"
    >
      <div className="space-y-6 pt-2">
        {/* Header Profile Badge */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#00AEEF] text-white font-bold text-lg shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate">{fullName}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                {contact.stage || "Not Contacted"}
              </span>
            </div>
            {contact.job_title && (
              <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mt-0.5">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                <span>{contact.job_title}</span>
              </p>
            )}
            {contact.company && (
              <a
                href={`/companies?id=${contact.company.id || contact.company_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00AEEF] hover:underline inline-flex items-center gap-1.5 mt-0.5 font-medium cursor-pointer"
                title="Open company details in new tab"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{contact.company.name}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* Contact Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Email */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Email</span>
            <div className="mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="font-medium text-slate-800 hover:text-[#00AEEF] truncate"
                >
                  {contact.email}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Phone</span>
            <div className="mt-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              {contact.phone ? (
                <a
                  href={`tel:${contact.phone}`}
                  className="font-medium text-slate-800 hover:text-[#00AEEF] truncate"
                >
                  {contact.phone}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
          </div>

          {/* Created Date */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Created On</span>
            <div className="mt-1 flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-medium">{formatDate(contact.created_at)}</span>
            </div>
          </div>

          {/* Associated Company */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Company Affiliation</span>
            <div className="mt-1 flex items-center gap-2 text-slate-700">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              {contact.company ? (
                <a
                  href={`/companies?id=${contact.company.id || contact.company_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00AEEF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  title="Open company details in new tab"
                >
                  <span>{contact.company.name}</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              ) : (
                <span className="font-medium text-slate-400">
                  Independent / Unassigned
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Custom Fields */}
        {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(contact.custom_fields).map(([key, val]) => {
                if (val === undefined || val === null || val === "") return null;
                const formattedKey = key
                  .replace(/^cf_/, "")
                  .replace(/_\d+$/, "")
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={key} className="p-2 rounded bg-white border border-slate-200 shadow-2xs">
                    <span className="text-slate-400 font-medium text-[10px] block uppercase">
                      {formattedKey}
                    </span>
                    <span className="font-semibold text-slate-800 break-words">
                      {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Deals Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#00AEEF]" />
              Associated Deals ({currentDealsList.length})
            </h3>
          </div>

          {currentDealsList.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {currentDealsList.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 flex items-center justify-between bg-card hover:bg-slate-50 text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground">{deal.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#00AEEF]">
                      {formatCurrency(deal.amount, deal.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDeal(deal.id, deal.title)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Remove deal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
              No deals currently associated with this contact.
            </div>
          )}
        </div>

        {/* CRM Follow-up Tasks & Interaction Activities */}
        <RecordActivityTasks
          contactId={contact.id}
          companyId={contact.company_id}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(contact);
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
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              variant="bitrix"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(contact);
              }}
              className="gap-1.5"
            >
              <Edit2 className="h-4 w-4" />
              Edit Contact
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
