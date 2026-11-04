"use client";

import React from "react";
import {
  Calendar,
  Building,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import { Deal } from "@/types/crm";
import { formatCurrency, formatDate, getContactName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableActionMenu } from "@/components/ui/table-action-menu";
import { BulkDeleteDialog } from "@/components/crm/bulk-delete-dialog";
import { api } from "@/lib/api-client";

interface DealsTableProps {
  deals: Deal[];
  total: number;
  skip: number;
  limit: number;
  onPageChange: (newSkip: number) => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onBulkDeleted?: (count: number) => void;
}

export function DealsTable({
  deals,
  total,
  skip,
  limit,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onBulkDeleted,
}: DealsTableProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [selectedDealIds, setSelectedDealIds] = React.useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = React.useState(false);

  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Toggle selection for all deals on the current page
  function handleSelectAll() {
    if (selectedDealIds.length === deals.length) {
      setSelectedDealIds([]);
    } else {
      setSelectedDealIds(deals.map((d) => d.id));
    }
  }

  // Toggle selection for an individual deal
  function handleToggleSelect(dealId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedDealIds((prev) =>
      prev.includes(dealId) ? prev.filter((id) => id !== dealId) : [...prev, dealId]
    );
  }

  // Confirm bulk deletion
  async function handleConfirmBulkDelete() {
    if (selectedDealIds.length === 0) return;
    const countToDelete = selectedDealIds.length;
    await api.bulkDeleteDeals(selectedDealIds);
    setSelectedDealIds([]);
    if (onBulkDeleted) {
      onBulkDeleted(countToDelete);
    }
  }

  return (
    <div className="flex flex-col flex-1 p-6 relative">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={deals.length > 0 && selectedDealIds.length === deals.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF] cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th scope="col" className="px-5 py-3">Deal Title</th>
                <th scope="col" className="px-5 py-3">Stage</th>
                <th scope="col" className="px-5 py-3">Contact</th>
                <th scope="col" className="px-5 py-3">Company</th>
                <th scope="col" className="px-5 py-3">Amount</th>
                <th scope="col" className="px-5 py-3">Responsible</th>
                <th scope="col" className="px-5 py-3">Close Date</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deals.map((deal) => {
                const contactName = getContactName(deal.contact);
                const companyName = deal.company?.name;
                const isSelected = selectedDealIds.includes(deal.id);

                return (
                  <tr
                    key={deal.id}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                      isSelected ? "bg-blue-50/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      onClick={(e) => handleToggleSelect(deal.id, e)}
                      className="w-10 px-4 py-3.5 text-center"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-[#00AEEF] focus:ring-[#00AEEF] cursor-pointer"
                      />
                    </td>

                    {/* Title */}
                    <td
                      onClick={() => onView(deal)}
                      className="px-5 py-3.5 font-semibold text-foreground group-hover:text-[#00AEEF] transition-colors max-w-xs"
                    >
                      <div className="truncate">{deal.title}</div>
                      {deal.custom_fields && Object.keys(deal.custom_fields).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(deal.custom_fields).map(([k, v]) => {
                            if (v === undefined || v === null || v === "") return null;
                            const label = k.replace(/^cf_/, "").replace(/_\d+$/, "").replace(/_/g, " ");
                            return (
                              <span
                                key={k}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200 capitalize font-medium max-w-[180px] truncate"
                              >
                                {label}: {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    {/* Stage Badge */}
                    <td onClick={() => onView(deal)} className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-2xs"
                        style={{ backgroundColor: deal.stage?.color || "#00AEEF" }}
                      >
                        {deal.stage?.name || "Unknown"}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {deal.contact?.id ? (
                          <a
                            href={`/contacts?id=${deal.contact.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="truncate max-w-[150px] font-medium text-[#00AEEF] hover:underline cursor-pointer"
                            title="Open contact details in new tab"
                          >
                            {contactName || "Contact"}
                          </a>
                        ) : contactName ? (
                          <span
                            onClick={() => onView(deal)}
                            className="truncate max-w-[150px] font-medium text-slate-700 cursor-pointer"
                          >
                            {contactName}
                          </span>
                        ) : (
                          <span onClick={() => onView(deal)} className="text-slate-400 font-normal cursor-pointer">—</span>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {deal.company?.id ? (
                          <a
                            href={`/companies?id=${deal.company.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="truncate max-w-[150px] font-medium text-[#00AEEF] hover:underline cursor-pointer"
                            title="Open company details in new tab"
                          >
                            {companyName || "Company"}
                          </a>
                        ) : companyName ? (
                          <span
                            onClick={() => onView(deal)}
                            className="truncate max-w-[150px] font-medium text-slate-700 cursor-pointer"
                          >
                            {companyName}
                          </span>
                        ) : (
                          <span onClick={() => onView(deal)} className="text-slate-400 font-normal cursor-pointer">—</span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td onClick={() => onView(deal)} className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(deal.amount, deal.currency)}
                    </td>

                    {/* Responsible User */}
                    <td onClick={() => onView(deal)} className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {deal.responsible_user?.full_name || "Unassigned"}
                        </span>
                      </div>
                    </td>

                    {/* Close Date */}
                    <td onClick={() => onView(deal)} className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-xs">
                      {deal.expected_close_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(deal.expected_close_date)}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <TableActionMenu
                        isOpen={activeMenuId === deal.id}
                        onOpenChange={(open) => setActiveMenuId(open ? deal.id : null)}
                        items={[
                          {
                            label: "View Details",
                            icon: Eye,
                            onClick: () => onView(deal),
                          },
                          {
                            label: "Edit Deal",
                            icon: Edit2,
                            onClick: () => onEdit(deal),
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => onDelete(deal),
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-slate-50 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {total === 0 ? 0 : skip + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(skip + limit, total)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span> deals
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={skip === 0}
              onClick={() => onPageChange(Math.max(0, skip - limit))}
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>

            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={skip + limit >= total}
              onClick={() => onPageChange(skip + limit)}
              className="h-8 gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedDealIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md text-white animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00AEEF] text-white font-bold text-[10px]">
              {selectedDealIds.length}
            </span>
            <span>
              {selectedDealIds.length} {selectedDealIds.length === 1 ? "deal" : "deals"} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDealIds([])}
              className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Deselect All
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="h-7 gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        count={selectedDealIds.length}
        entityName="deal"
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
