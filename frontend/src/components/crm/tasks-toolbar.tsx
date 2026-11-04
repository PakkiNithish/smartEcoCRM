"use client";

import React from "react";
import { Search, Plus, RefreshCw, X, CheckSquare, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TasksToolbarProps {
  total: number;
  search: string;
  onSearchChange: (search: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  statusOptions?: string[];
  priorityOptions?: string[];
  onCreateClick: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function TasksToolbar({
  total,
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  statusOptions,
  priorityOptions,
  onCreateClick,
  onRefresh,
  isLoading,
}: TasksToolbarProps) {
  const statuses = statusOptions && statusOptions.length > 0
    ? statusOptions
    : ["pending", "in_progress", "completed", "cancelled"];
  const priorities = priorityOptions && priorityOptions.length > 0
    ? priorityOptions
    : ["low", "medium", "high", "urgent"];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-card px-6 py-3.5">
      {/* Left: Title & Count */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-[#00AEEF]" />
          Tasks
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
            placeholder="Search tasks by title or notes..."
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

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <option value="">All Statuses</option>
          {statuses.map((st) => (
            <option key={st} value={st}>
              {st.charAt(0).toUpperCase() + st.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <option value="">All Priorities</option>
          {priorities.map((pr) => (
            <option key={pr} value={pr}>
              {pr.charAt(0).toUpperCase() + pr.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
          title="Refresh tasks"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>

        {/* Create Task Action */}
        <Button
          variant="bitrix"
          size="sm"
          onClick={onCreateClick}
          className="h-9 gap-1.5 font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Task</span>
        </Button>
      </div>
    </div>
  );
}
