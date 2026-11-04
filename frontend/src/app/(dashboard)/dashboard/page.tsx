"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/crm/task-form";
import { ActivityForm } from "@/components/crm/activity-form";
import { DealForm } from "@/components/crm/deal-form";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  DashboardMetricsResponse,
  Task,
  Activity,
  PipelineStage,
  User,
} from "@/types/crm";
import { api } from "@/lib/api-client";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck2,
  PlusCircle,
  PhoneCall,
  Calendar,
  Mail,
  FileText,
  Briefcase,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Check,
  Building2,
  User as UserIcon,
  CircleDot,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardMetricsResponse | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab for Activities section ("open" | "recent")
  const [activityTab, setActivityTab] = useState<"open" | "recent">("open");

  // Modals
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, stagesRes, userRes] = await Promise.all([
        api.getDashboardMetrics(),
        api.getPipelineStages().catch(() => []),
        api.getCurrentUser().catch(() => null),
      ]);
      setData(metricsRes);
      setStages(stagesRes);
      if (userRes) setCurrentUser(userRes);
    } catch (err: any) {
      setError(err.detail || err.message || "Failed to load dashboard metrics from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  async function handleToggleTask(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await api.updateTask(task.id, { status: newStatus });
      fetchMetrics();
    } catch (err) {
      console.error("Failed to toggle task status", err);
    }
  }

  async function handleToggleActivity(activity: Activity) {
    try {
      await api.updateActivity(activity.id, { is_completed: !activity.is_completed });
      fetchMetrics();
    } catch (err) {
      console.error("Failed to toggle activity completion", err);
    }
  }

  const activityIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("call") || t.includes("phone")) {
      return <PhoneCall className="h-4 w-4 text-blue-500" />;
    }
    if (t.includes("meet")) {
      return <Calendar className="h-4 w-4 text-purple-500" />;
    }
    if (t.includes("email") || t.includes("mail")) {
      return <Mail className="h-4 w-4 text-emerald-500" />;
    }
    if (t.includes("follow")) {
      return <Clock className="h-4 w-4 text-indigo-500" />;
    }
    return <FileText className="h-4 w-4 text-amber-500" />;
  };

  if (loading && !data) {
    return <LoadingState message="Loading activities, tasks, and commercial deals..." />;
  }

  if (error && !data) {
    return (
      <ErrorState
        title="Dashboard Offline"
        message={error}
        onRetry={fetchMetrics}
      />
    );
  }

  const tm = data?.tasks || {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    high_priority: 0,
  };

  const am = data?.activities || {
    total: 0,
    calls: 0,
    meetings: 0,
    emails: 0,
    notes: 0,
    follow_ups: 0,
    completed: 0,
    pending: 0,
  };

  const dm = data?.deals || {
    total: 0,
    won: 0,
    won_revenue: 0,
    active: 0,
    active_revenue: 0,
    lost: 0,
    lost_revenue: 0,
    win_rate: 0,
  };

  const taskCompletionRate = tm.total > 0 ? Math.round((tm.completed / tm.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50/70 p-4 md:p-6 space-y-6">
      {/* Top Banner Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-[#00AEEF]">
              Live CRM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of active deals, tasks, and customer activities.
          </p>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDealFormOpen(true)}
            className="h-8 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 bg-white"
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>New Deal</span>
          </Button>

          <Button
            variant="bitrix"
            size="sm"
            onClick={() => setTaskFormOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Task</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActivityFormOpen(true)}
            className="h-8 gap-1.5 text-xs text-purple-700 border-purple-200 hover:bg-purple-50 bg-white"
          >
            <PlusCircle className="h-3.5 w-3.5 text-purple-600" />
            <span>Log Activity</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            className="h-8 w-8 p-0 text-slate-500 bg-white"
            title="Refresh metrics"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* 3 Core Metric Pillar Cards (Deals, Tasks, Activities) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Deals & Pipeline */}
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Deals & Pipeline
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            {/* Split View: Active Pipeline (In Progress) and Won Revenue (Closed) */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Active Pipeline
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live active deals in progress" />
                </div>
                <div className="text-lg font-black text-emerald-700 tracking-tight mt-0.5">
                  {formatCurrency(dm.active_revenue)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {dm.active} deals in progress
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                  Won Revenue
                </span>
                <div className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                  {formatCurrency(dm.won_revenue)}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  {dm.won} deals closed won
                </div>
              </div>
            </div>

            {/* Explanation Note on when values get updated */}
            <div className="mt-2 text-[10px] text-slate-500 bg-slate-50/80 p-2 rounded-lg border border-slate-100 leading-relaxed">
              ⚡ <strong>Active Pipeline</strong> updates as soon as deals are created or updated. <strong>Won Revenue</strong> updates when a deal is moved to the <span className="font-semibold text-emerald-700">Close deal (Won)</span> stage.
            </div>

            {/* Sub-metrics Grid */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded-lg bg-sky-50/70 border border-sky-100">
                <span className="text-[10px] text-sky-700 block font-semibold">Active</span>
                <span className="text-xs font-bold text-sky-900">{dm.active}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-semibold">Won</span>
                <span className="text-xs font-bold text-emerald-900">{dm.won}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-600 block font-semibold">Win Rate</span>
                <span className="text-xs font-bold text-slate-900">{dm.win_rate}%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                <span className="text-[10px] text-rose-700 block font-semibold">Lost</span>
                <span className="text-xs font-bold text-rose-900">{dm.lost}</span>
              </div>
            </div>
          </div>

          <Link
            href="/deals"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center justify-between pt-3 mt-3 border-t border-slate-100"
          >
            <span>Open Deals Kanban Board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Pillar 2: Tasks & To-Dos */}
        <div className="rounded-xl border border-sky-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-[#00AEEF]" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-[#00AEEF]" />
                Tasks & To-Dos
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-[#00AEEF] border border-sky-100">
                <CheckSquare className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {tm.completed}
                <span className="text-sm font-normal text-slate-400 ml-1.5">
                  / {tm.total} completed
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {tm.total > 0
                  ? `${taskCompletionRate}% execution rate`
                  : "No tasks created yet"}
              </div>
            </div>

            {/* Sub-metrics Grid */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-600 block font-semibold">Pending</span>
                <span className="text-xs font-bold text-slate-900">{tm.pending}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-sky-50/70 border border-sky-100">
                <span className="text-[10px] text-sky-700 block font-semibold">In Progress</span>
                <span className="text-xs font-bold text-sky-900">{tm.in_progress}</span>
              </div>
              <div
                className={cn(
                  "p-1.5 rounded-lg border",
                  tm.overdue > 0
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] block font-semibold",
                    tm.overdue > 0 ? "text-rose-700" : "text-slate-600"
                  )}
                >
                  Overdue
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    tm.overdue > 0 ? "text-rose-800" : "text-slate-900"
                  )}
                >
                  {tm.overdue}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-100">
                <span className="text-[10px] text-amber-700 block font-semibold">Priority</span>
                <span className="text-xs font-bold text-amber-900">{tm.high_priority}</span>
              </div>
            </div>
          </div>

          <Link
            href="/tasks"
            className="text-xs font-semibold text-[#00AEEF] hover:text-sky-700 hover:underline flex items-center justify-between pt-3 mt-3 border-t border-slate-100"
          >
            <span>Manage Tasks List</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Pillar 3: Activities & Touchpoints */}
        <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-600" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                <CalendarCheck2 className="h-4 w-4 text-purple-600" />
                Activities & Touchpoints
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {am.total}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Total Logged • {am.completed} completed, {am.pending} scheduled/open
              </div>
            </div>

            {/* Sub-metrics Grid */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100">
                <span className="text-[10px] text-blue-700 block font-semibold">Calls</span>
                <span className="text-xs font-bold text-blue-900">{am.calls}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                <span className="text-[10px] text-purple-700 block font-semibold">Meetings</span>
                <span className="text-xs font-bold text-purple-900">{am.meetings}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-semibold">Emails</span>
                <span className="text-xs font-bold text-emerald-900">{am.emails}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                <span className="text-[10px] text-indigo-700 block font-semibold">Follow-ups</span>
                <span className="text-xs font-bold text-indigo-900">{am.follow_ups + am.notes}</span>
              </div>
            </div>
          </div>

          <Link
            href="/activities"
            className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline flex items-center justify-between pt-3 mt-3 border-t border-slate-100"
          >
            <span>View Activities Timeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Commercial Deals Opportunities Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Active Deals & Opportunities
              </h2>
              <p className="text-[11px] text-slate-400">
                Recent deals moving through commercial pipeline stages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDealFormOpen(true)}
              className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1"
            >
              <PlusCircle className="h-3 w-3" />
              <span>Add Deal</span>
            </Button>
            <Link
              href="/deals"
              className="text-xs text-[#00AEEF] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View All Deals</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {data?.recent_deals && data.recent_deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {data.recent_deals.map((deal) => (
              <div
                key={deal.id}
                className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-[#00AEEF] hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="font-semibold text-slate-900 text-xs block truncate flex-1"
                      title={deal.title}
                    >
                      {deal.title}
                    </span>
                    <span
                      className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: deal.stage_color || "#00AEEF" }}
                    >
                      {deal.stage_name || "Stage"}
                    </span>
                  </div>

                  <div className="text-base font-black text-emerald-600 mt-1">
                    {formatCurrency(deal.amount, deal.currency)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                  <div className="flex items-center gap-1 truncate max-w-[170px]" title={deal.company_name || deal.contact_name || "Unassigned account"}>
                    <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {deal.company_name || deal.contact_name || "No linked account"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatDate(deal.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg space-y-2">
            <Briefcase className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="font-medium text-slate-600">No deals in pipeline yet</p>
            <p className="text-[11px] text-slate-400">
              Create your first deal to track revenue, close dates, and pipeline progression.
            </p>
            <Button
              variant="bitrix"
              size="sm"
              onClick={() => setDealFormOpen(true)}
              className="mt-2 text-xs"
            >
              + Create Deal
            </Button>
          </div>
        )}
      </div>

      {/* Operational 2-Column Grid: Tasks & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tasks & Action Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 text-[#00AEEF] flex items-center justify-center">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Tasks & Action Items
                </h2>
                <p className="text-[11px] text-slate-400">
                  Pending and upcoming to-dos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskFormOpen(true)}
                className="h-7 text-xs text-sky-700 border-sky-200 hover:bg-sky-50 gap-1"
              >
                <PlusCircle className="h-3 w-3" />
                <span>Add Task</span>
              </Button>
              <Link
                href="/tasks"
                className="text-xs text-[#00AEEF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
            {data?.follow_ups_due_soon && data.follow_ups_due_soon.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.follow_ups_due_soon.map((task) => {
                  const isDone = task.status === "completed";
                  const overdue =
                    task.due_date && !isDone && new Date(task.due_date).getTime() < Date.now();
                  return (
                    <div
                      key={task.id}
                      className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 px-1.5 rounded transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(task)}
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors cursor-pointer",
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-[#00AEEF] bg-white"
                          )}
                          title={isDone ? "Mark as pending" : "Mark as completed"}
                        >
                          {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "font-semibold block truncate",
                              isDone ? "line-through text-slate-400" : "text-slate-800"
                            )}
                          >
                            {task.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {task.due_date ? (
                              <span
                                className={cn(
                                  "font-medium flex items-center gap-1",
                                  overdue ? "text-red-600 font-semibold" : "text-slate-500"
                                )}
                              >
                                {overdue && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                                Due: {formatDate(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-slate-400">No due date</span>
                            )}
                            {task.deal && (
                              <span className="text-slate-500 truncate max-w-[140px]">
                                • Deal: {task.deal.title}
                              </span>
                            )}
                            {task.company && (
                              <span className="text-slate-500 truncate max-w-[140px]">
                                • {task.company.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded capitalize",
                            task.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : task.priority === "high"
                              ? "bg-amber-100 text-amber-800"
                              : task.priority === "medium"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {task.priority || "Normal"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">All tasks completed!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pending action items right now.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customer Activities & Touchpoints */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <CalendarCheck2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Customer Activities
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => setActivityTab("open")}
                    className={cn(
                      "text-[11px] font-semibold transition-colors pb-0.5",
                      activityTab === "open"
                        ? "text-purple-700 border-b-2 border-purple-600"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Open & Scheduled ({data?.upcoming_activities?.length || 0})
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => setActivityTab("recent")}
                    className={cn(
                      "text-[11px] font-semibold transition-colors pb-0.5",
                      activityTab === "recent"
                        ? "text-purple-700 border-b-2 border-purple-600"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Recent Logged ({data?.recent_activities?.length || 0})
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivityFormOpen(true)}
                className="h-7 text-xs text-purple-700 border-purple-200 hover:bg-purple-50 gap-1"
              >
                <PlusCircle className="h-3 w-3" />
                <span>Log</span>
              </Button>
              <Link
                href="/activities"
                className="text-xs text-[#00AEEF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Timeline</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
            {activityTab === "open" ? (
              data?.upcoming_activities && data.upcoming_activities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.upcoming_activities.map((act) => (
                    <div
                      key={act.id}
                      className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 px-1.5 rounded transition-colors"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActivity(act)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 hover:border-emerald-600 flex items-center justify-center transition-colors cursor-pointer bg-white"
                          title="Click to mark completed"
                        >
                          {act.is_completed && <Check className="h-3 w-3 stroke-[3] text-emerald-600" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0">{activityIcon(act.type)}</span>
                            <span className="font-semibold text-slate-800 truncate">
                              {act.subject}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="text-purple-700 font-semibold">
                              {act.scheduled_at
                                ? formatDate(act.scheduled_at)
                                : "No date set"}
                            </span>
                            {act.contact && (
                              <span className="text-slate-600">
                                • {act.contact.full_name || `${act.contact.first_name} ${act.contact.last_name}`}
                              </span>
                            )}
                            {act.company && <span>• {act.company.name}</span>}
                            {act.deal && <span>• Deal: {act.deal.title}</span>}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-purple-100 text-purple-800">
                        {act.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <CalendarCheck2 className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No scheduled activities</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Schedule calls, meetings, or reminders with your clients.
                  </p>
                  <Button
                    variant="bitrix"
                    size="sm"
                    onClick={() => setActivityFormOpen(true)}
                    className="mt-3 text-xs"
                  >
                    + Schedule Activity
                  </Button>
                </div>
              )
            ) : data?.recent_activities && data.recent_activities.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.recent_activities.map((act) => (
                  <div
                    key={act.id}
                    className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 px-1.5 rounded transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">{activityIcon(act.type)}</div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-800 block truncate">
                          {act.subject}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatDate(act.scheduled_at || act.activity_date || act.created_at)}</span>
                          {act.user && <span>• by {act.user.full_name}</span>}
                          {act.contact && <span>• with {act.contact.full_name || `${act.contact.first_name} ${act.contact.last_name}`}</span>}
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
                        act.is_completed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {act.is_completed ? "Completed" : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No activity history yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Logged interactions will automatically appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSuccess={() => {
          fetchMetrics();
        }}
      />

      {/* Activity Creation Modal */}
      <ActivityForm
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        onSuccess={() => {
          fetchMetrics();
        }}
      />

      {/* Deal Creation Modal */}
      <DealForm
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        stages={stages}
        onSuccess={() => {
          fetchMetrics();
        }}
      />
    </div>
  );
}
