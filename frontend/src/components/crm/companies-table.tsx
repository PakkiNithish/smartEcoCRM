"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  CircleDot,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  Activity,
} from "lucide-react";
import { Company } from "@/types/crm";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { BulkDeleteDialog } from "@/components/crm/bulk-delete-dialog";
import { CustomerJourneyHoverCard } from "@/components/crm/customer-journey-hover-card";
import { api } from "@/lib/api-client";

// Formats date to verified Bitrix24 format: DD.MM.YYYY
function formatB24Date(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function getCompanyStageBadge(stage?: string | null) {
  const s = stage || "Not Contacted";
  switch (s) {
    case "Not Contacted":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "Contacted (LinkedIn & Email )":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Responded":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Meeting Scheduled & Discussion":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Proposal Shared":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Negotiation":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "Deal Won":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Lost / Not Interested":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function renderActivityCell(activitiesCount?: number, latestActivity?: any) {
  const count = activitiesCount ?? 0;
  if (count === 0) {
    return <span className="text-[11px] text-slate-400 italic">No activities</span>;
  }

  const type = (latestActivity?.type || "").toLowerCase();
  let IconComponent = Activity;
  let iconColor = "text-[#1c9be8]";

  if (type.includes("call") || type.includes("phone")) {
    IconComponent = Phone;
    iconColor = "text-sky-600";
  } else if (type.includes("meet")) {
    IconComponent = Calendar;
    iconColor = "text-purple-600";
  } else if (type.includes("mail")) {
    IconComponent = Mail;
    iconColor = "text-blue-600";
  } else if (type.includes("note") || type.includes("task")) {
    IconComponent = FileText;
    iconColor = "text-amber-600";
  }

  const tooltipText = latestActivity?.subject
    ? `Latest (${latestActivity.type || "activity"}): ${latestActivity.subject}${latestActivity.scheduled_at ? ` (${formatB24Date(latestActivity.scheduled_at)})` : ""}`
    : `${count} activities`;

  return (
    <div className="flex flex-col gap-0.5" title={tooltipText}>
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 border border-slate-200 shrink-0">
          <IconComponent className={`h-3 w-3 ${iconColor}`} />
        </span>
        <span className="font-semibold text-slate-800">
          {count} {count === 1 ? "activity" : "activities"}
        </span>
      </div>
      {latestActivity?.subject && (
        <span className="text-[10px] text-slate-500 truncate max-w-[150px] pl-6.5">
          {latestActivity.subject}
        </span>
      )}
    </div>
  );
}

interface CompaniesTableProps {
  companies: Company[];
  total: number;
  skip: number;
  limit: number;
  sortOrder: "asc" | "desc";
  onSortToggle: () => void;
  onPageChange: (newSkip: number) => void;
  onLimitChange: (newLimit: number) => void;
  onShowMore: () => void;
  onView: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onBulkDeleted?: (count: number) => void;
  onCompanyUpdated?: (company: Company) => void;
}

export function CompaniesTable({
  companies,
  total,
  skip,
  limit,
  sortOrder,
  onSortToggle,
  onPageChange,
  onLimitChange,
  onShowMore,
  onView,
  onEdit,
  onDelete,
  onBulkDeleted,
  onCompanyUpdated,
}: CompaniesTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isRecordsMenuOpen, setIsRecordsMenuOpen] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);

  const handleStageUpdate = async (companyId: string, newStage: string) => {
    try {
      const updated = await api.updateCompany(companyId, { stage: newStage });
      if (onCompanyUpdated) {
        onCompanyUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to update company stage from journey popup:", err);
    }
  };

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const recordOptions = [5, 10, 20, 50, 100];

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
      setIsRecordsMenuOpen(false);
    }
    if (activeMenuId || isRecordsMenuOpen) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId, isRecordsMenuOpen]);

  const handleSelectAll = () => {
    if (selectedIds.length === companies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(companies.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    await api.bulkDeleteCompanies(selectedIds);
    setSelectedIds([]);
    if (onBulkDeleted) onBulkDeleted(count);
  };

  return (
    <div className="flex flex-col flex-1 p-6 relative">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            {/* Table Header */}
            <thead className="border-b border-slate-200 bg-[#f5f8fa] text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                {/* 1. Checkbox */}
                <th scope="col" className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={companies.length > 0 && selectedIds.length === companies.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8] cursor-pointer"
                    title="Select all records"
                  />
                </th>

                {/* 3. Company */}
                <th scope="col" className="px-4 py-3 min-w-[200px]">
                  Company
                </th>

                {/* 4. Stage */}
                <th scope="col" className="px-4 py-3 min-w-[170px]">
                  Stage
                </th>

                {/* 5. Contacts (Multiple Contacts) */}
                <th scope="col" className="px-4 py-3 min-w-[180px]">
                  Contacts
                </th>

                {/* 6. Activity */}
                <th scope="col" className="px-4 py-3 min-w-[120px]">
                  Activity
                </th>

                {/* 5. Customer Journey */}
                <th scope="col" className="px-3 py-3 text-center min-w-[110px]">
                  Customer Journey
                </th>

                {/* 6. Responsible */}
                <th scope="col" className="px-4 py-3 min-w-[160px]">
                  Responsible
                </th>

                {/* 7. Created with dynamic sort indicator */}
                <th scope="col" className="px-4 py-3 min-w-[120px]">
                  <button
                    type="button"
                    onClick={onSortToggle}
                    className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 focus:outline-none uppercase"
                    title="Click to toggle sort direction"
                  >
                    <span>Created</span>
                    {sortOrder === "desc" ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[#1c9be8]" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5 text-[#1c9be8]" />
                    )}
                  </button>
                </th>

                {/* 8. Address */}
                <th scope="col" className="px-4 py-3 min-w-[180px]">
                  Address
                </th>

                {/* 9. Industry */}
                <th scope="col" className="px-4 py-3 min-w-[160px]">
                  Industry
                </th>

                {/* Actions Menu */}
                <th scope="col" className="w-12 px-3 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => {
                const initials = company.name?.[0]?.toUpperCase() || "C";
                const isSelected = selectedIds.includes(company.id);
                const companyTypeBadge = company.custom_fields?.company_type || (company.stage || "Standard");
                const responsibleName = company.user?.full_name || "Unassigned";

                return (
                  <tr
                    key={company.id}
                    onDoubleClick={() => onView(company)}
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                      isSelected ? "bg-blue-50/50" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      onClick={(e) => handleToggleSelect(company.id, e)}
                      className="px-3 py-3 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8] cursor-pointer"
                      />
                    </td>

                    {/* Company: Logo/Avatar + Name link + Classification badge */}
                    <td onClick={() => onView(company)} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600 font-bold text-xs border border-amber-200">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="font-semibold text-slate-800 group-hover:text-[#1c9be8] text-left transition-colors truncate block"
                          >
                            {company.name}
                          </button>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 mt-0.5 border border-slate-200">
                            {companyTypeBadge}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Stage: Lifecycle Status Badge */}
                    <td onClick={() => onView(company)} className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getCompanyStageBadge(
                          company.stage
                        )}`}
                      >
                        {company.stage || "Not Contacted"}
                      </span>
                    </td>

                    {/* Contacts: Multiple Associated Contacts List */}
                    <td className="px-4 py-3">
                      {company.contacts && company.contacts.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[200px]">
                          {company.contacts.slice(0, 2).map((c) => (
                            <a
                              key={c.id}
                              href={`/contacts?id=${c.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 hover:text-[#1c9be8] transition-colors cursor-pointer"
                              title={`Open ${c.full_name || `${c.first_name} ${c.last_name}`} in new tab`}
                            >
                              <span className="truncate max-w-[90px]">{c.full_name || `${c.first_name} ${c.last_name}`}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          ))}
                          {company.contacts.length > 2 && (
                            <span
                              onClick={() => onView(company)}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 cursor-pointer"
                              title="View all contacts in company details"
                            >
                              +{company.contacts.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span onClick={() => onView(company)} className="text-[11px] text-slate-400 italic cursor-pointer">
                          No contacts
                        </span>
                      )}
                    </td>

                    {/* Activity: Status Indicator */}
                    <td onClick={() => onView(company)} className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {renderActivityCell(company.activities_count, company.latest_activity)}
                    </td>

                    {/* Customer Journey: Interactive Stage Progress */}
                    <td onClick={(e) => e.stopPropagation()} className="px-3 py-3 text-center whitespace-nowrap">
                      <CustomerJourneyHoverCard
                        stage={company.stage || "Not Contacted"}
                        entityType="company"
                        name={company.name}
                        dealsCount={company.deals_count}
                        activitiesCount={company.activities_count}
                        responsibleName={responsibleName}
                        createdAt={company.created_at}
                        onStageChange={(newStage) => handleStageUpdate(company.id, newStage)}
                      />
                    </td>

                    {/* Responsible Person: Avatar + Name */}
                    <td onClick={() => onView(company)} className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                          {responsibleName === "Unassigned" ? "—" : responsibleName[0]?.toUpperCase()}
                        </div>
                        <span className={`text-xs font-medium ${responsibleName === "Unassigned" ? "text-slate-400 italic" : "text-slate-700"}`}>
                          {responsibleName}
                        </span>
                      </div>
                    </td>

                    {/* Created Date (DD.MM.YYYY) */}
                    <td onClick={() => onView(company)} className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatB24Date(company.created_at)}
                    </td>

                    {/* Address: Formatted string */}
                    <td onClick={() => onView(company)} className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {company.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{company.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Industry */}
                    <td onClick={() => onView(company)} className="px-4 py-3 whitespace-nowrap">
                      {company.industry ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
                          {company.industry}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Action Dropdown Menu */}
                    <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TableActionMenu
                        isOpen={activeMenuId === company.id}
                        onOpenChange={(open) => setActiveMenuId(open ? company.id : null)}
                        items={[
                          {
                            label: "View",
                            icon: Eye,
                            onClick: () => onView(company),
                          },
                          {
                            label: "EDIT",
                            icon: Edit2,
                            onClick: () => onEdit(company),
                          },
                          {
                            label: "Plan activity",
                            icon: Calendar,
                            onClick: () => onView(company),
                          },
                          {
                            label: "DELETE",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => onDelete(company),
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

        {/* Bitrix24 main.ui.grid Footer Toolbar */}
        <div className="border-t border-slate-200 bg-[#fbfcfd] px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
          {/* Left: Selection Counter */}
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-600">
              SELECTED: {selectedIds.length} / {limit}
            </span>
          </div>

          {/* Center: "Show more" Append Pill Button */}
          {skip + limit < total && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onShowMore}
                className="px-4 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
              >
                Show more
              </button>
            </div>
          )}

          {/* Right: Records-per-page Dropdown & Numbered Pagination */}
          <div className="flex items-center gap-3">
            {/* Records-per-page dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsRecordsMenuOpen(!isRecordsMenuOpen)}
                className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded px-2 py-1 bg-white shadow-2xs"
              >
                <span>RECORDS: {limit}</span>
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isRecordsMenuOpen && (
                <div className="absolute right-0 bottom-full mb-1 w-24 rounded-md border border-slate-200 bg-white py-1 shadow-lg z-30">
                  {recordOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onLimitChange(opt);
                        setIsRecordsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <span>{opt}</span>
                      {opt === limit && <Check className="h-3.5 w-3.5 text-[#1c9be8]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Numbered & Directional Pagination */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                PAGES:
              </span>

              {/* PREV. (Suppressed on Page 1) */}
              {currentPage > 1 && (
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(0, skip - limit))}
                  className="font-semibold text-[#1c9be8] hover:underline"
                >
                  PREV.
                </button>
              )}

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === currentPage;
                return isCurrent ? (
                  <span key={p} className="font-bold text-slate-900 px-1">
                    {p}
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange((p - 1) * limit)}
                    className="text-[#1c9be8] hover:underline px-1 font-medium"
                  >
                    {p}
                  </button>
                );
              })}

              {/* NEXT Link */}
              {currentPage < totalPages && (
                <button
                  type="button"
                  onClick={() => onPageChange(skip + limit)}
                  className="font-semibold text-[#1c9be8] hover:underline"
                >
                  NEXT
                </button>
              )}

              {/* LAST Link */}
              {totalPages > 1 && currentPage < totalPages && (
                <button
                  type="button"
                  onClick={() => onPageChange((totalPages - 1) * limit)}
                  className="font-semibold text-[#1c9be8] hover:underline ml-1"
                >
                  LAST
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md text-white animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1c9be8] text-white font-bold text-[10px]">
              {selectedIds.length}
            </span>
            <span>
              {selectedIds.length} {selectedIds.length === 1 ? "company" : "companies"} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded"
            >
              Deselect All
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        count={selectedIds.length}
        entityName="company"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
