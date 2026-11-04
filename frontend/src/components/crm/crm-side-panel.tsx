"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Link as LinkIcon,
  Phone,
  Mail,
  MessageSquare,
  Settings,
  ChevronDown,
  Check,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
} from "lucide-react";
import { Deal, Contact, Company, PipelineStage } from "@/types/crm";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { DealForm } from "./deal-form";

export interface CrmSidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitleBadge?: string | null;
  onTitleChange?: (newTitle: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isCreateMode?: boolean;
  phone?: string | null;
  email?: string | null;
  createdAt?: string | null;
  children: React.ReactNode;
  rightColumnContent?: React.ReactNode;
  stickyActionBar?: React.ReactNode;
  entityType?: "company" | "contact";
  entityId?: string;
  entityName?: string;
  associatedContacts?: Contact[];
  associatedCompany?: Company | null;
}

export function CrmSidePanel({
  open,
  onClose,
  title,
  subtitleBadge,
  activeTab = "General",
  onTabChange,
  isCreateMode = false,
  phone,
  email,
  createdAt,
  children,
  rightColumnContent,
  stickyActionBar,
  entityType = "company",
  entityId,
  associatedContacts = [],
  associatedCompany,
}: CrmSidePanelProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [copiedLink, setCopiedLink] = useState(false);

  // Deals Tab States
  const [panelDeals, setPanelDeals] = useState<Deal[]>([]);
  const [dealFilterSearch, setDealFilterSearch] = useState("");
  const [showCreateDealModal, setShowCreateDealModal] = useState(false);
  const [dealPipelineStages, setDealPipelineStages] = useState<PipelineStage[]>([]);
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [isDeletingDeals, setIsDeletingDeals] = useState(false);

  useEffect(() => {
    if (open && currentTab === "Deals") {
      api
        .getPipelineStages()
        .then((stages) => setDealPipelineStages(stages))
        .catch(() => {});
    }
  }, [open, currentTab]);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // Fetch Deals when Deals tab is opened
  useEffect(() => {
    if (open && currentTab === "Deals" && entityId) {
      const params: any = { limit: 50 };
      if (entityType === "company") params.company_id = entityId;
      if (entityType === "contact") params.contact_id = entityId;
      api
        .getDeals(params)
        .then((res) => {
          let items = res.items || [];
          if (entityType === "company" && entityId) {
            items = items.filter((d) => d.company_id === entityId);
          } else if (entityType === "contact" && entityId) {
            items = items.filter((d) => d.contact_id === entityId);
          }
          setPanelDeals(items);
        })
        .catch(() => {});
    }
  }, [open, currentTab, entityId, entityType]);

  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !showCreateDealModal) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showCreateDealModal]);

  if (!open) return null;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const tabs = [
    "General",
    "Deals",
  ];

  const handleTabClick = (tab: string) => {
    setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleDeleteDeal = async (dealId: string, dealTitle?: string) => {
    if (!window.confirm(`Are you sure you want to remove the deal "${dealTitle || "this deal"}"?`)) {
      return;
    }
    try {
      await api.deleteDeal(dealId);
      setPanelDeals((prev) => prev.filter((d) => d.id !== dealId));
      setSelectedDealIds((prev) => prev.filter((id) => id !== dealId));
    } catch (err: any) {
      console.error("Failed to delete deal:", err);
      alert(err.message || "Failed to remove deal");
    }
  };

  const handleDeleteSelectedDeals = async () => {
    if (!window.confirm(`Are you sure you want to remove ${selectedDealIds.length} deal(s)?`)) {
      return;
    }
    setIsDeletingDeals(true);
    try {
      await Promise.all(selectedDealIds.map((id) => api.deleteDeal(id)));
      setPanelDeals((prev) => prev.filter((d) => !selectedDealIds.includes(d.id)));
      setSelectedDealIds([]);
    } catch (err: any) {
      console.error("Failed to delete deals:", err);
      alert("Failed to remove some deals. Please refresh.");
    } finally {
      setIsDeletingDeals(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity duration-200 animate-in fade-in">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Slider Drawer */}
      <div
        className="relative z-10 flex h-full w-full max-w-6xl bg-slate-100 shadow-2xl overflow-hidden transition-transform duration-300 ease-out animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Blue Utility Rail (Bitrix24 Signature UX) */}
        <div className="w-12 shrink-0 bg-[#1c9be8] flex flex-col items-center py-3 text-white/90 select-none border-r border-[#1587cd]">
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={onClose}
              title="Close (✕)"
              className="p-2.5 rounded hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* SidePanel Content Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#eef2f4] overflow-hidden">
          {/* Top Panel Header (Matching Bitrix24 Reference Screenshots) */}
          <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-0 shrink-0">
            <div className="flex items-center justify-between gap-4 mb-3">
              {/* Title, Edit Pencil, Link Icon & Badge */}
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-xl font-bold text-slate-800 truncate tracking-tight">
                  {title}
                </h1>
                <button
                  type="button"
                  title="Edit title"
                  className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleCopyLink}
                  title="Copy link"
                  className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <LinkIcon className="h-3.5 w-3.5" />
                  )}
                </button>
                {subtitleBadge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {subtitleBadge}
                  </span>
                )}
              </div>

              {/* Header Right Actions (Phone, Mail, Chat, Gear, Document) */}
              <div className="flex items-center gap-2">
                {/* Call Shortcut */}
                <a
                  href={phone ? `tel:${phone}` : undefined}
                  onClick={(e) => {
                    if (!phone) {
                      e.preventDefault();
                      alert("No phone number registered for this record.");
                    }
                  }}
                  title={phone ? `Call ${phone}` : "No phone number available"}
                  className={`p-2 rounded-full border transition-colors ${
                    phone
                      ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                      : "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>

                {/* Email Shortcut */}
                <a
                  href={email ? `mailto:${email}` : undefined}
                  onClick={(e) => {
                    if (!email) {
                      e.preventDefault();
                      alert("No email address registered for this record.");
                    }
                  }}
                  title={email ? `Email ${email}` : "No email address available"}
                  className={`p-2 rounded-full border transition-colors ${
                    email
                      ? "text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                      : "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>

                {/* Chat Shortcut */}
                <button
                  type="button"
                  onClick={() => alert("Discuss in team chat")}
                  title="Open Chat / SMS"
                  className="p-2 rounded-full border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Category Navigation Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 -mx-6 px-6 pt-1">
              {tabs.map((tab) => {
                const isActive = currentTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? "border-[#1c9be8] text-[#1c9be8] font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <span>{tab}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Content Area by Tab */}
          {currentTab === "General" ? (
            /* GENERAL TAB: 2 Columns (Form Card on Left + Timeline Cockpit on Right) */
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#eef2f4] min-w-0">
                {children}
              </div>
              <div className="w-[380px] lg:w-[420px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto flex flex-col">
                {rightColumnContent}
              </div>
            </div>
          ) : (
            /* DEALS TAB */
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#eef2f4]">
              {/* Top Action Bar */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateDealModal(true)}
                  className="px-3.5 py-1.5 rounded bg-[#007bfb] hover:bg-[#006ee4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New deal</span>
                </button>

                {selectedDealIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedDeals}
                    disabled={isDeletingDeals}
                    className="px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{isDeletingDeals ? "Removing..." : `Remove Selected (${selectedDealIds.length})`}</span>
                  </button>
                )}

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#e8f4fc] border border-[#cbe6fb] text-[#007bfb] text-xs font-medium">
                  <span>Deals in progress</span>
                  <button type="button" className="hover:text-slate-600 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={dealFilterSearch}
                    onChange={(e) => setDealFilterSearch(e.target.value)}
                    placeholder="search deals..."
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 pr-14 text-xs text-slate-800 outline-none focus:border-[#007bfb]"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1 text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                    {dealFilterSearch && (
                      <button
                        type="button"
                        onClick={() => setDealFilterSearch("")}
                        className="cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Deals Grid Container */}
              <div className="rounded-t-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* Table Header */}
                <div className="grid grid-cols-12 border-b border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 bg-white select-none items-center">
                  <div className="col-span-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        panelDeals.length > 0 &&
                        selectedDealIds.length === panelDeals.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDealIds(panelDeals.map((d) => d.id));
                        } else {
                          setSelectedDealIds([]);
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="col-span-3">Deal</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Client</div>
                  <div className="col-span-2">Amount/Currency</div>
                  <div className="col-span-1">Created</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                {/* Table Body */}
                {panelDeals.filter(
                  (d) =>
                    !dealFilterSearch.trim() ||
                    d.title.toLowerCase().includes(dealFilterSearch.toLowerCase())
                ).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="relative inline-block text-slate-300 mb-2">
                      <FileText className="h-14 w-14 stroke-[1]" />
                      <X className="h-5 w-5 stroke-[2] absolute inset-0 m-auto text-slate-400" />
                    </div>
                    <div className="text-sm text-slate-400 tracking-wide font-normal">
                      - No data -
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {panelDeals
                      .filter(
                        (d) =>
                          !dealFilterSearch.trim() ||
                          d.title.toLowerCase().includes(dealFilterSearch.toLowerCase())
                      )
                      .map((d) => (
                        <div
                          key={d.id}
                          className="grid grid-cols-12 px-4 py-3 text-xs items-center hover:bg-slate-50 transition-colors"
                        >
                          <div className="col-span-1 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedDealIds.includes(d.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDealIds((prev) => [...prev, d.id]);
                                } else {
                                  setSelectedDealIds((prev) =>
                                    prev.filter((id) => id !== d.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-300"
                            />
                            <span className="text-slate-300 text-xs">≡</span>
                          </div>
                          <div
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.open("/deals", "_blank");
                              }
                            }}
                            className="col-span-3 font-semibold text-[#007bfb] hover:underline cursor-pointer truncate"
                            title="Open Deals in new tab"
                          >
                            {d.title}
                          </div>
                          <div className="col-span-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {d.stage?.name || "New"}
                            </span>
                          </div>
                          <div className="col-span-2 text-slate-700 font-medium truncate">
                            {d.company?.name || d.company_name || (entityType === "company" ? title : (associatedCompany?.name || "—"))}
                          </div>
                          <div className="col-span-2 font-bold text-slate-800">
                            {d.currency || "AED"} {Number(d.amount || 0).toLocaleString()}
                          </div>
                          <div className="col-span-1 text-slate-400 text-[11px]">
                            {d.created_at ? formatDate(d.created_at) : "—"}
                          </div>
                          <div className="col-span-1 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteDeal(d.id, d.title)}
                              title="Remove deal"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar (When in Edit or Create Mode and on General tab) */}
          {stickyActionBar && currentTab === "General" && (
            <div className="sticky bottom-0 z-20 bg-white border-t border-slate-200 px-6 py-3.5 shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150">
              {stickyActionBar}
            </div>
          )}
        </div>
      </div>

      {/* Create Deal Modal (Configurable DealForm) */}
      {showCreateDealModal && (
        <DealForm
          open={showCreateDealModal}
          onOpenChange={setShowCreateDealModal}
          stages={dealPipelineStages}
          defaultCompanyId={entityType === "company" ? entityId : (associatedCompany?.id || undefined)}
          defaultContactId={entityType === "contact" ? entityId : undefined}
          onSuccess={(deal) => {
            setPanelDeals((prev) => [deal, ...prev]);
            setShowCreateDealModal(false);
          }}
        />
      )}
    </div>
  );
}
