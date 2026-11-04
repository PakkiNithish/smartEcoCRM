"use client";

import React from "react";
import { Plus, RefreshCw, Upload, Settings, ChevronDown } from "lucide-react";
import { CrmSearchFilter } from "@/components/crm/crm-search-filter";

interface CompaniesToolbarProps {
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  activePreset: string;
  onPresetChange: (presetId: string) => void;
  onFilterSubmit?: (filters: Record<string, string>) => void;
  onResetFilters?: () => void;
  onCreateClick: () => void;
  onBulkAddClick?: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CompaniesToolbar({
  total,
  search,
  onSearchChange,
  activePreset,
  onPresetChange,
  onFilterSubmit,
  onResetFilters,
  onCreateClick,
  onBulkAddClick,
  onRefresh,
  isLoading,
}: CompaniesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 bg-white px-6 py-3">
      {/* Left: Module Title & Count Badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Companies</h1>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1c9be8] border border-blue-200">
          {total}
        </span>
      </div>

      {/* Center / Search & Filter Bar (Bitrix24 main.ui.filter Parity) */}
      <div className="flex-1 max-w-2xl px-2">
        <CrmSearchFilter
          entityType="company"
          search={search}
          onSearchChange={onSearchChange}
          activePreset={activePreset}
          onPresetChange={onPresetChange}
          onFilterSubmit={onFilterSubmit}
          onResetFilters={onResetFilters}
          totalRecords={total}
        />
      </div>

      {/* Right: Actions Bar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          title="Refresh companies"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        {/* Bulk Add / Import Button */}
        {onBulkAddClick && (
          <button
            type="button"
            onClick={onBulkAddClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>Import</span>
          </button>
        )}

        {/* Primary CTA: + Create (Bitrix24 Green Button) */}
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#80c200] hover:bg-[#72ad00] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Create</span>
        </button>
      </div>
    </div>
  );
}
