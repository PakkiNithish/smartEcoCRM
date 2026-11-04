"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
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
  ExternalLink,
  Phone,
  FileText,
  Activity,
} from "lucide-react";
import { Contact } from "@/types/crm";
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

function getContactStageBadge(stage?: string | null) {
  const s = stage || "Not Contacted";
  switch (s) {
    case "Not Contacted":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "Contacted (LinkedIn & Email )":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Follow-up Required":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Meeting Scheduled & Discussion":
      return "bg-blue-50 text-blue-700 border-blue-200";
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

interface ContactsTableProps {
  contacts: Contact[];
  total: number;
  skip: number;
  limit: number;
  sortOrder: "asc" | "desc";
  onSortToggle: () => void;
  onPageChange: (newSkip: number) => void;
  onLimitChange: (newLimit: number) => void;
  onShowMore: () => void;
  onView: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onBulkDeleted?: (count: number) => void;
  onContactUpdated?: (contact: Contact) => void;
}

export function ContactsTable({
  contacts,
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
  onContactUpdated,
}: ContactsTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isRecordsMenuOpen, setIsRecordsMenuOpen] = useState(false);

  const handleStageUpdate = async (contactId: string, newStage: string) => {
    try {
      const updated = await api.updateContact(contactId, { stage: newStage });
      if (onContactUpdated) {
        onContactUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to update contact stage:", err);
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
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
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
    await api.bulkDeleteContacts(selectedIds);
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
                    checked={contacts.length > 0 && selectedIds.length === contacts.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8] cursor-pointer"
                    title="Select all records"
                  />
                </th>

                {/* 2. Contact */}
                <th scope="col" className="px-4 py-3 min-w-[200px]">
                  Contact
                </th>

                {/* 4. Stage */}
                <th scope="col" className="px-4 py-3 min-w-[170px]">
                  Stage
                </th>

                {/* 5. Activity */}
                <th scope="col" className="px-4 py-3 min-w-[130px]">
                  Activity
                </th>

                {/* 6. Customer Journey */}
                <th scope="col" className="px-3 py-3 text-center min-w-[110px]">
                  Customer Journey
                </th>

                {/* 5. Company */}
                <th scope="col" className="px-4 py-3 min-w-[160px]">
                  Company
                </th>

                {/* 6. Responsible */}
                <th scope="col" className="px-4 py-3 min-w-[160px]">
                  Responsible
                </th>

                {/* 7. E-mail */}
                <th scope="col" className="px-4 py-3 min-w-[180px]">
                  E-mail
                </th>

                {/* 8. Created with dynamic sort indicator */}
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

                {/* Actions Menu */}
                <th scope="col" className="w-12 px-3 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => {
                const fullName =
                  contact.full_name ||
                  `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
                  "Untitled Contact";
                const initials =
                  `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() ||
                  "C";
                const isSelected = selectedIds.includes(contact.id);
                const contactTypeBadge = contact.custom_fields?.contact_type || (contact.stage || "Standard");
                const responsibleName = contact.user?.full_name || "Unassigned";

                return (
                  <tr
                    key={contact.id}
                    onDoubleClick={() => onView(contact)}
                    className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                      isSelected ? "bg-blue-50/50" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      onClick={(e) => handleToggleSelect(contact.id, e)}
                      className="px-3 py-3 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-[#1c9be8] focus:ring-[#1c9be8] cursor-pointer"
                      />
                    </td>

                    {/* Contact: Avatar + Name link + Classification badge */}
                    <td onClick={() => onView(contact)} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#1c9be8] font-bold text-xs border border-blue-200">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="font-semibold text-slate-800 group-hover:text-[#1c9be8] text-left transition-colors truncate block"
                          >
                            {fullName}
                          </button>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 mt-0.5 border border-slate-200">
                            {contactTypeBadge}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Stage: Lifecycle Status Badge */}
                    <td onClick={() => onView(contact)} className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getContactStageBadge(
                          contact.stage
                        )}`}
                      >
                        {contact.stage || "Not Contacted"}
                      </span>
                    </td>

                    {/* Activity: Status Indicator */}
                    <td onClick={() => onView(contact)} className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {renderActivityCell(contact.activities_count, contact.latest_activity)}
                    </td>

                    {/* Customer Journey: Interactive Stage Progress */}
                    <td onClick={(e) => e.stopPropagation()} className="px-3 py-3 text-center whitespace-nowrap">
                      <CustomerJourneyHoverCard
                        stage={contact.stage || "Not Contacted"}
                        entityType="contact"
                        name={fullName}
                        dealsCount={contact.deals_count}
                        activitiesCount={contact.activities_count}
                        responsibleName={responsibleName}
                        createdAt={contact.created_at}
                        onStageChange={(newStage) => handleStageUpdate(contact.id, newStage)}
                      />
                    </td>

                    {/* Associated Company */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {contact.company ? (
                        <a
                          href={`/companies?id=${contact.company.id || contact.company_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 hover:text-[#1c9be8] hover:underline cursor-pointer"
                          title={`Open ${contact.company.name} in new tab`}
                        >
                          <Building2 className="h-3.5 w-3.5 text-[#1c9be8] shrink-0" />
                          <span>{contact.company.name}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      ) : (
                        <span onClick={() => onView(contact)} className="text-slate-400 cursor-pointer">—</span>
                      )}
                    </td>

                    {/* Responsible Person: Avatar + Name */}
                    <td onClick={() => onView(contact)} className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                          {responsibleName === "Unassigned" ? "—" : responsibleName[0]?.toUpperCase()}
                        </div>
                        <span className={`text-xs font-medium ${responsibleName === "Unassigned" ? "text-slate-400 italic" : "text-slate-700"}`}>
                          {responsibleName}
                        </span>
                      </div>
                    </td>

                    {/* E-mail: Clickable mailto */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-[#1c9be8] transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{contact.email}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Created Date (DD.MM.YYYY) */}
                    <td onClick={() => onView(contact)} className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatB24Date(contact.created_at)}
                    </td>

                    {/* Action Dropdown Menu */}
                    <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TableActionMenu
                        isOpen={activeMenuId === contact.id}
                        onOpenChange={(open) => setActiveMenuId(open ? contact.id : null)}
                        items={[
                          {
                            label: "View",
                            icon: Eye,
                            onClick: () => onView(contact),
                          },
                          {
                            label: "EDIT",
                            icon: Edit2,
                            onClick: () => onEdit(contact),
                          },
                          {
                            label: "Plan activity",
                            icon: Calendar,
                            onClick: () => onView(contact),
                          },
                          {
                            label: "DELETE",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => onDelete(contact),
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
              {selectedIds.length} {selectedIds.length === 1 ? "contact" : "contacts"} selected
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
        entityName="contact"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
