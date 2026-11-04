"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Company, CompanyDealSummary } from "@/types/crm";
import { formatDate, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api-client";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

import { RecordActivityTasks } from "@/components/crm/record-activity-tasks";

interface CompanyDetailsProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompanyDetails({
  company,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: CompanyDetailsProps) {
  const [activeTab, setActiveTab] = React.useState<"contacts" | "deals">("contacts");
  const [currentDealsList, setCurrentDealsList] = React.useState<CompanyDealSummary[]>(company?.deals || []);

  React.useEffect(() => {
    setCurrentDealsList(company?.deals || []);
  }, [company?.deals]);

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

  if (!company) return null;

  const contactsList = company.contacts || [];
  const dealsList = currentDealsList;
  const hasRelations = contactsList.length > 0 || dealsList.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Company Profile"
      description="Organization overview, affiliated contacts, and active pipeline deals."
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 pt-2">
        {/* Header Profile Badge */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white font-bold shadow-sm">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{company.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {company.stage || "Not Contacted"}
              </span>
              {company.industry && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-[#00AEEF] border border-blue-100">
                  {company.industry}
                </span>
              )}
            </div>
            {company.address && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{company.address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Company Contact & Location Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Phone */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Phone</span>
            <div className="mt-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              {company.phone ? (
                <a
                  href={`tel:${company.phone}`}
                  className="font-medium text-slate-800 hover:text-[#00AEEF] truncate"
                >
                  {company.phone}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Email</span>
            <div className="mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              {company.email ? (
                <a
                  href={`mailto:${company.email}`}
                  className="font-medium text-slate-800 hover:text-[#00AEEF] truncate"
                >
                  {company.email}
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
          </div>

          {/* Website */}
          <div className="p-3 rounded-md bg-card border border-border">
            <span className="text-slate-400 font-medium">Website</span>
            <div className="mt-1 flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              {company.website ? (
                <a
                  href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#00AEEF] hover:underline flex items-center gap-1 truncate"
                >
                  <span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Custom Fields */}
        {company.custom_fields && Object.keys(company.custom_fields).length > 0 && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(company.custom_fields).map(([key, val]) => {
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

        {/* Related Records Tabs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === "contacts"
                  ? "border-[#00AEEF] text-[#00AEEF]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="h-4 w-4" />
              Associated Contacts ({contactsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deals")}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === "deals"
                  ? "border-[#00AEEF] text-[#00AEEF]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Associated Deals ({dealsList.length})
            </button>
          </div>

          {/* Tab: Contacts */}
          {activeTab === "contacts" && (
            <div className="space-y-2">
              {contactsList.length > 0 ? (
                <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                  {contactsList.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 flex items-center justify-between bg-card hover:bg-slate-50 text-xs"
                    >
                      <div>
                        <a
                          href={`/contacts?id=${contact.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-foreground hover:text-[#00AEEF] inline-flex items-center gap-1.5 cursor-pointer"
                          title="Open contact details in new tab"
                        >
                          <span>{contact.full_name || `${contact.first_name} ${contact.last_name}`}</span>
                          <ExternalLink className="h-3 w-3 text-slate-400 hover:text-[#00AEEF]" />
                        </a>
                        {contact.job_title && (
                          <div className="text-[11px] text-slate-500">{contact.job_title}</div>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-slate-500 flex items-center gap-3">
                        <div>
                          {contact.email && <div>{contact.email}</div>}
                          {contact.phone && <div>{contact.phone}</div>}
                        </div>
                        <a
                          href={`/contacts?id=${contact.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-[#00AEEF] hover:bg-slate-100 rounded"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
                  No contacts currently associated with this company.
                </div>
              )}

              {/* Add Contacts Button just below company contacts */}
              <div className="pt-1">
                <a
                  href={`/contacts`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00AEEF] hover:text-white bg-[#00AEEF]/10 hover:bg-[#00AEEF] border border-[#00AEEF]/30 hover:border-[#00AEEF] rounded-md transition-all shadow-2xs group cursor-pointer"
                >
                  <span>+ Add Contacts</span>
                  <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                </a>
              </div>
            </div>
          )}

          {/* Tab: Deals */}
          {activeTab === "deals" && (
            <div className="space-y-2">
              {dealsList.length > 0 ? (
                <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                  {dealsList.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 flex items-center justify-between bg-card hover:bg-slate-50 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{deal.title}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-[#00AEEF]">
                          {formatCurrency(deal.amount, deal.currency)}
                        </div>
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
                  No deals currently associated with this company.
                </div>
              )}
            </div>
          )}
        </div>

        {/* CRM Follow-up Tasks & Interaction Activities */}
        <RecordActivityTasks companyId={company.id} />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onDelete(company);
            }}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete Company
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
                onEdit(company);
              }}
              className="gap-1.5"
            >
              <Edit2 className="h-4 w-4" />
              Edit Company
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
