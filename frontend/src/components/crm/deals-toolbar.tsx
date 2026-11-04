"use client";

import React from "react";
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Filter,
  RefreshCw,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PipelineStage } from "@/types/crm";
import { cn } from "@/lib/utils";

interface DealsToolbarProps {
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedStageId: string;
  onStageChange: (stageId: string) => void;
  stages: PipelineStage[];
  onCreateClick: () => void;
  onBulkAddClick?: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function DealsToolbar({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  selectedStageId,
  onStageChange,
  stages,
  onCreateClick,
  onBulkAddClick,
  onRefresh,
  isLoading,
}: DealsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-card px-6 py-3.5">
      {/* Left: Search & Filter */}
      <div className="flex flex-1 flex-wrap items-center gap-2.5 max-w-2xl">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search deals by title or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50/50"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Stage Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={selectedStageId}
            onChange={(e) => onStageChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Stages</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Deals"
          className="h-9 w-9 shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Right: View Toggle & Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* View Toggle */}
        <div className="flex items-center rounded-lg border border-border bg-slate-100 p-0.5">
          <button
            onClick={() => onViewModeChange("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "kanban"
                ? "bg-white text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Kanban Board View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list"
                ? "bg-white text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="List Table View"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        {/* Bulk Add / Import Button */}
        {onBulkAddClick && (
          <Button
            onClick={onBulkAddClick}
            variant="outline"
            className="gap-1.5 h-9 font-medium text-slate-700 hover:text-slate-900 border-slate-300 shadow-2xs"
            title="Bulk Add or XLS/CSV Import Deals"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Bulk Add</span>
          </Button>
        )}

        {/* Create Deal Button */}
        <Button
          onClick={onCreateClick}
          variant="bitrix"
          className="gap-1.5 h-9 font-semibold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Deal</span>
        </Button>
      </div>
    </div>
  );
}
