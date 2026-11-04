"use client";

import React from "react";
import { Search, Plus, RefreshCw, X, CalendarCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ActivitiesToolbarProps {
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCompleted: string;
  onCompletedChange: (completed: string) => void;
  typeOptions?: string[];
  onCreateClick: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ActivitiesToolbar({
  total,
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCompleted,
  onCompletedChange,
  typeOptions,
  onCreateClick,
  onRefresh,
  isLoading,
}: ActivitiesToolbarProps) {
  const types =
    typeOptions && typeOptions.length > 0
      ? typeOptions
      : ["call", "meeting", "email", "note", "follow_up"];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-card px-6 py-3.5">
      {/* Left: Title & Count */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarCheck2 className="h-5 w-5 text-[#00AEEF]" />
          Activities
        </h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#00AEEF] border border-blue-100">
          {total}
        </span>
      </div>

      {/* Middle & Right: Filters, Search, Actions */}
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
        {/* Search input */}
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search activities by subject or notes..."
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

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <option value="">All Types</option>
          {types.map((tp) => (
            <option key={tp} value={tp}>
              {tp.charAt(0).toUpperCase() + tp.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedCompleted}
          onChange={(e) => onCompletedChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="true">Completed</option>
          <option value="false">Pending</option>
        </select>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
          title="Refresh activities"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>

        {/* Record Activity Action */}
        <Button
          variant="bitrix"
          size="sm"
          onClick={onCreateClick}
          className="h-9 gap-1.5 font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Record Activity</span>
        </Button>
      </div>
    </div>
  );
}
