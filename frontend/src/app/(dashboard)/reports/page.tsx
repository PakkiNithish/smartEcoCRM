"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Flame,
  Info,
  Mail,
  PhoneCall,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  Users,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarCheck2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  FileText,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  PipelineStage,
  ReportResponse,
  User,
  UserEfficiencyReport,
} from "@/types/crm";
import { COMPANY_STAGES, CONTACT_STAGES } from "@/lib/form-defaults";

// Date range helpers
function getIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDefaultDates() {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  return {
    start: getIsoDate(thirtyDaysAgo),
    end: getIsoDate(now),
  };
}

export default function ReportsPage() {
  const defaults = useMemo(() => getDefaultDates(), []);
  const [startDate, setStartDate] = useState<string>(defaults.start);
  const [endDate, setEndDate] = useState<string>(defaults.end);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [stageSearch, setStageSearch] = useState("");
  const stageDropdownRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<string>("30d");
  const [mounted, setMounted] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setIsStageDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth & Lookups
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Dynamic configured field options for filters
  const [contactStages, setContactStages] = useState<string[]>([...CONTACT_STAGES]);
  const [companyStages, setCompanyStages] = useState<string[]>([...COMPANY_STAGES]);
  const [activityTypes, setActivityTypes] = useState<string[]>([
    "call",
    "meeting",
    "email",
    "follow_up",
    "note",
  ]);
  const [taskStatuses, setTaskStatuses] = useState<string[]>([
    "pending",
    "in_progress",
    "completed",
    "overdue",
  ]);

  // Load configured options for filters from form configs
  useEffect(() => {
    const loadDynamicConfigs = async () => {
      try {
        const [cConf, compConf, actConf, taskConf] = await Promise.all([
          api.getFormConfig("contact"),
          api.getFormConfig("company"),
          api.getFormConfig("activity"),
          api.getFormConfig("task"),
        ]);

        const cStage = cConf?.fields_config?.find((f) => f.key === "stage");
        if (cStage?.options && cStage.options.length > 0) {
          setContactStages(cStage.options);
        }

        const compStage = compConf?.fields_config?.find((f) => f.key === "stage");
        if (compStage?.options && compStage.options.length > 0) {
          setCompanyStages(compStage.options);
        }

        const actType = actConf?.fields_config?.find((f) => f.key === "type");
        if (actType?.options && actType.options.length > 0) {
          setActivityTypes(actType.options);
        }

        const taskStatus = taskConf?.fields_config?.find((f) => f.key === "status");
        if (taskStatus?.options && taskStatus.options.length > 0) {
          setTaskStatuses(taskStatus.options);
        }
      } catch (err) {
        console.warn("Could not load dynamic configs for reports:", err);
      }
    };
    loadDynamicConfigs();
  }, []);

  // Report Data
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Tabs for detailed logs
  const [detailTab, setDetailTab] = useState<"tasks" | "activities" | "deals">("tasks");

  // Grouped Stage Options for Multi-Select
  const STAGE_GROUPS = useMemo(() => [
    {
      group: "Activities",
      items: [
        { value: "activities", label: "Activities (All Activities)", icon: "📁", isMain: true },
        ...activityTypes.map((t) => ({
          value: `activity:${t}`,
          label: t.charAt(0).toUpperCase() + t.slice(1).replace("_", " "),
          icon: t.includes("call") ? "📞" : t.includes("meet") ? "📅" : t.includes("email") ? "✉️" : "📝",
          isMain: false,
        })),
      ],
    },
    {
      group: "Tasks",
      items: [
        { value: "tasks", label: "Tasks (All Tasks)", icon: "📁", isMain: true },
        ...taskStatuses.map((st) => ({
          value: `task:${st}`,
          label: st.charAt(0).toUpperCase() + st.slice(1).replace("_", " "),
          icon: st.includes("complete") ? "✅" : st.includes("progress") ? "⚡" : "⏳",
          isMain: false,
        })),
      ],
    },
    {
      group: "Deals",
      items: [
        { value: "deals", label: "Deals (All Pipeline Deals)", icon: "📁", isMain: true },
        { value: "deal:won", label: "Won / Closed", icon: "🏆", isMain: false },
        { value: "deal:lost", label: "Lost", icon: "❌", isMain: false },
        ...pipelineStages.map((ps) => ({
          value: `deal:stage:${ps.id}`,
          label: ps.name,
          icon: "💼",
          isMain: false,
        })),
      ],
    },
    {
      group: "Companies",
      items: companyStages.map((cs) => ({
        value: `company:${cs}`,
        label: cs,
        icon: "🏢",
        isMain: false,
      })),
    },
    {
      group: "Contacts",
      items: contactStages.map((cs) => ({
        value: `contact:${cs}`,
        label: cs,
        icon: "👤",
        isMain: false,
      })),
    },
  ], [pipelineStages, companyStages, contactStages, activityTypes, taskStatuses]);

  const filteredStageGroups = useMemo(() => {
    if (!stageSearch.trim()) return STAGE_GROUPS;
    const q = stageSearch.toLowerCase();
    return STAGE_GROUPS.map((grp) => ({
      ...grp,
      items: grp.items.filter(
        (item) => item.label.toLowerCase().includes(q) || grp.group.toLowerCase().includes(q)
      ),
    })).filter((grp) => grp.items.length > 0);
  }, [STAGE_GROUPS, stageSearch]);

  const activeCategories = useMemo(() => {
    if (selectedStages.length === 0) {
      return {
        all: true,
        hasTasks: true,
        hasActivities: true,
        hasDeals: true,
        hasCompanies: true,
        hasContacts: true,
        count: 5,
      };
    }

    const hasTasks = selectedStages.some(
      (s) => s === "tasks" || s.startsWith("task:") || s.startsWith("task_")
    );
    const hasActivities = selectedStages.some(
      (s) => s === "activities" || s.startsWith("activity:") || s.startsWith("activity_")
    );
    const hasDeals = selectedStages.some(
      (s) => s === "deals" || s.startsWith("deal:") || s.startsWith("deal_")
    );
    const hasCompanies = selectedStages.some(
      (s) => s === "companies" || s.startsWith("company:") || s.startsWith("company_")
    );
    const hasContacts = selectedStages.some(
      (s) => s === "contacts" || s.startsWith("contact:") || s.startsWith("contact_")
    );

    const count =
      (hasTasks ? 1 : 0) +
      (hasActivities ? 1 : 0) +
      (hasDeals ? 1 : 0) +
      (hasCompanies ? 1 : 0) +
      (hasContacts ? 1 : 0);

    return {
      all: false,
      hasTasks,
      hasActivities,
      hasDeals,
      hasCompanies,
      hasContacts,
      count,
    };
  }, [selectedStages]);

  useEffect(() => {
    if (activeCategories.all) return;
    if (activeCategories.hasTasks && detailTab !== "tasks" && !activeCategories.hasActivities && !activeCategories.hasDeals) {
      setDetailTab("tasks");
    } else if (activeCategories.hasActivities && detailTab !== "activities" && !activeCategories.hasTasks && !activeCategories.hasDeals) {
      setDetailTab("activities");
    } else if (activeCategories.hasDeals && detailTab !== "deals" && !activeCategories.hasTasks && !activeCategories.hasActivities) {
      setDetailTab("deals");
    } else if (!activeCategories.hasTasks && detailTab === "tasks") {
      if (activeCategories.hasActivities) setDetailTab("activities");
      else if (activeCategories.hasDeals) setDetailTab("deals");
    } else if (!activeCategories.hasActivities && detailTab === "activities") {
      if (activeCategories.hasTasks) setDetailTab("tasks");
      else if (activeCategories.hasDeals) setDetailTab("deals");
    } else if (!activeCategories.hasDeals && detailTab === "deals") {
      if (activeCategories.hasTasks) setDetailTab("tasks");
      else if (activeCategories.hasActivities) setDetailTab("activities");
    }
  }, [activeCategories, detailTab]);

  const handleToggleStage = (stageVal: string) => {
    setSelectedStages((prev) => {
      const updated = prev.includes(stageVal)
        ? prev.filter((s) => s !== stageVal)
        : [...prev, stageVal];

      if (updated.some((s) => s.startsWith("activity:") || s === "activities")) {
        setDetailTab("activities");
      } else if (updated.some((s) => s.startsWith("task:") || s === "tasks")) {
        setDetailTab("tasks");
      } else if (updated.some((s) => s.startsWith("deal:") || s === "deals")) {
        setDetailTab("deals");
      }

      fetchReport(startDate, endDate, selectedUserId, updated);
      return updated;
    });
  };

  const handleClearStages = () => {
    setSelectedStages([]);
    fetchReport(startDate, endDate, selectedUserId, []);
  };
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  // Quick Date Preset Handler
  const applyPreset = (preset: string) => {
    const now = new Date();
    let start = new Date();
    setActivePreset(preset);

    switch (preset) {
      case "today":
        start = new Date(now);
        break;
      case "7d":
        start.setDate(now.getDate() - 7);
        break;
      case "30d":
        start.setDate(now.getDate() - 30);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        now.setDate(0); // last day of previous month
        break;
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case "all":
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return;
    }

    const s = getIsoDate(start);
    const e = getIsoDate(now);
    setStartDate(s);
    setEndDate(e);
    fetchReport(s, e, selectedUserId, selectedStages);
  };

  // Fetch Report Data
  const fetchReport = useCallback(
    async (sDate?: string, eDate?: string, targetUserId?: string, targetStage?: string | string[]) => {
      setLoading(true);
      setError(null);
      try {
        const stageParam = targetStage !== undefined ? targetStage : selectedStages;
        const effectiveStart = sDate || startDate;
        let effectiveEnd = eDate || endDate;
        if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
          effectiveEnd = effectiveStart;
        }

        const res = await api.getEfficiencyReport({
          start_date: effectiveStart,
          end_date: effectiveEnd,
          user_id: targetUserId !== undefined ? (targetUserId || undefined) : (selectedUserId || undefined),
          stage: Array.isArray(stageParam) ? stageParam.filter(Boolean) : stageParam || undefined,
        });
        setReportData(res);
      } catch (err: any) {
        setError(err.detail || err.message || "Failed to generate report.");
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, selectedUserId, selectedStages]
  );

  // Initial Load: User & Lookups
  useEffect(() => {
    setMounted(true);
    let isSubscribed = true;
    async function init() {
      try {
        const [u, fetchedStages] = await Promise.all([
          api.getCurrentUser(),
          api.getPipelineStages().catch(() => []),
        ]);
        if (!isSubscribed) return;
        setCurrentUser(u);
        setPipelineStages(fetchedStages);

        if (u.role === "admin") {
          setUsersLoading(true);
          try {
            // Load users for admin dropdown
            const team = await api.getUsersLookup();
            if (isSubscribed) setAvailableUsers(team);
          } catch {
            // fallback
          } finally {
            if (isSubscribed) setUsersLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    }
    init();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Fetch report when component mounts
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle Export CSV
  const handleDownloadCsv = async () => {
    setIsExporting(true);
    try {
      const exportEnd = endDate < startDate ? startDate : endDate;
      await api.downloadReportCsv({
        start_date: startDate,
        end_date: exportEnd,
        user_id: selectedUserId || undefined,
        stage: selectedStages.length > 0 ? selectedStages : undefined,
      });
    } catch (err: any) {
      alert("Failed to download CSV: " + (err.detail || err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print / Save as PDF
  const handlePrint = () => {
    window.print();
  };

  // Active individual report (either single or first of team)
  const activeReport: UserEfficiencyReport | null = useMemo(() => {
    if (!reportData) return null;
    if (reportData.report) return reportData.report;
    if (reportData.user_reports && reportData.user_reports.length > 0) {
      return reportData.user_reports[0];
    }
    return null;
  }, [reportData]);

  // Color schemes for ratings
  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case "Top Performer":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-300">
            <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-600" />
            Top Performer
          </span>
        );
      case "High Efficiency":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-700 border border-sky-300">
            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
            High Efficiency
          </span>
        );
      case "Good":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 border border-amber-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
            Good
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 border border-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            Needs Attention
          </span>
        );
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <PhoneCall className="h-3.5 w-3.5 text-blue-500" />;
      case "meeting":
        return <Calendar className="h-3.5 w-3.5 text-purple-500" />;
      case "email":
        return <Mail className="h-3.5 w-3.5 text-emerald-500" />;
      case "follow_up":
        return <Clock className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getStageBadgeLabel = (stageVal: string): string => {
    if (!stageVal) return "";
    if (stageVal === "activities" || stageVal === "activity:all") return "Activities (All Activities)";
    if (stageVal === "tasks" || stageVal === "task:all") return "Tasks (All Tasks)";
    if (stageVal === "deals" || stageVal === "deal:all") return "Deals (All Pipeline Deals)";
    if (stageVal === "companies" || stageVal === "company:all") return "Companies (All Companies)";
    if (stageVal === "contacts" || stageVal === "contact:all") return "Contacts (All Contacts)";

    if (stageVal.startsWith("activity:")) {
      const type = stageVal.replace("activity:", "");
      const map: Record<string, string> = {
        call: "Activities > Phone Call",
        meeting: "Activities > Client Meeting",
        email: "Activities > Email",
        follow_up: "Activities > Follow-up",
        note: "Activities > Internal Note",
      };
      return map[type] || `Activities > ${type}`;
    }
    if (stageVal.startsWith("task:")) {
      const status = stageVal.replace("task:", "");
      const map: Record<string, string> = {
        pending: "Tasks > Pending",
        in_progress: "Tasks > In Progress",
        completed: "Tasks > Completed",
        overdue: "Tasks > Overdue",
      };
      return map[status] || `Tasks > ${status}`;
    }
    if (stageVal.startsWith("deal:")) {
      const rest = stageVal.replace("deal:", "");
      if (rest === "won") return "Deals > Won / Closed";
      if (rest === "lost") return "Deals > Lost";
      if (rest.startsWith("stage:")) {
        const stageId = rest.replace("stage:", "");
        const matched = pipelineStages.find((ps) => ps.id === stageId);
        return `Deals > ${matched?.name || "Pipeline Stage"}`;
      }
      return `Deals > ${rest}`;
    }
    if (stageVal.startsWith("company:")) {
      return `Companies > ${stageVal.replace("company:", "")}`;
    }
    if (stageVal.startsWith("contact:")) {
      return `Contacts > ${stageVal.replace("contact:", "")}`;
    }
    return stageVal.replace("_", " ");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              smart<span className="text-[#00AEEF]">Eco</span> CRM
            </h1>
            <p className="text-sm font-medium text-slate-600">
              Executive Performance & Efficiency Report
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>
              Period: {startDate} to {endDate}
            </div>
            <div suppressHydrationWarning>
              Generated: {mounted ? formatDate(new Date().toISOString()) : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-[#00AEEF] border border-sky-100 shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Performance & Efficiency Reports
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track user efficiency, task completion rates, activity velocity, and deal conversions over customizable time periods.
          </p>
        </div>

        {/* Action Controls: CSV Export & Print */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={isExporting || loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 shadow-xs"
            title="Download full report data as CSV spreadsheet"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <Download className="h-4 w-4 text-slate-600" />
            )}
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="gap-2 bg-[#00AEEF] hover:bg-[#0098d4] text-white shadow-xs font-medium"
            title="Print or Save Report as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs print:hidden space-y-4">
        {/* Preset Range Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Presets:
          </span>
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "Last 7 Days" },
            { id: "30d", label: "Last 30 Days" },
            { id: "month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "quarter", label: "This Quarter" },
            { id: "all", label: "All Time" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all select-none",
                activePreset === p.id
                  ? "bg-[#00AEEF] text-white shadow-xs font-semibold"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Inputs: Start Date, End Date, Admin User Selector, and Stage / Status Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Start Date</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                if (val && endDate && val > endDate) {
                  setEndDate(val);
                }
                setActivePreset("custom");
              }}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-2xs focus:border-[#00AEEF] focus:outline-hidden focus:ring-1 focus:ring-[#00AEEF]"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>End Date</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                const val = e.target.value;
                if (startDate && val && val < startDate) {
                  setEndDate(startDate);
                } else {
                  setEndDate(val);
                }
                setActivePreset("custom");
              }}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-2xs focus:border-[#00AEEF] focus:outline-hidden focus:ring-1 focus:ring-[#00AEEF]"
            />
          </div>

          {/* User Selector Field: Conditional based on Admin Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                <span>Target User</span>
              </span>
              {isAdmin && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-1.5 py-0.5 rounded-sm">
                  Admin Feature
                </span>
              )}
            </label>

            {isAdmin ? (
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  fetchReport(startDate, endDate, e.target.value, selectedStages);
                }}
                disabled={usersLoading}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-2xs focus:border-[#00AEEF] focus:outline-hidden focus:ring-1 focus:ring-[#00AEEF]"
              >
                <option value="">👥 All Team Members (Leaderboard & Team Summary)</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.full_name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center justify-between text-xs text-slate-600 select-none">
                <span className="font-medium truncate">
                  👤 {currentUser?.full_name || "Current User"}
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold uppercase">
                  Self
                </span>
              </div>
            )}
          </div>

          {/* Stage / Status Multi-Select Filter */}
          <div className="space-y-1.5" ref={stageDropdownRef}>
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                <span>Stage / Category</span>
              </span>
              {selectedStages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearStages}
                  className="text-[10px] text-sky-600 hover:text-sky-800 font-medium underline cursor-pointer"
                >
                  Reset ({selectedStages.length})
                </button>
              )}
            </label>

            {/* Custom Multi-Select Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStageDropdownOpen((prev) => !prev)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-800 shadow-2xs focus:border-[#00AEEF] focus:outline-hidden focus:ring-1 focus:ring-[#00AEEF] flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {selectedStages.length === 0 ? (
                    <span className="text-slate-600 font-medium">🎯 All Categories & Stages</span>
                  ) : (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#00AEEF] text-white shrink-0">
                        {selectedStages.length}
                      </span>
                      <span className="font-semibold text-slate-800 truncate text-xs">
                        {selectedStages
                          .map((val) => getStageBadgeLabel(val).split(">").pop()?.trim() || val)
                          .slice(0, 2)
                          .join(", ")}
                        {selectedStages.length > 2 ? ` +${selectedStages.length - 2} more` : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {selectedStages.length > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearStages();
                      }}
                      title="Clear all selected stages"
                      className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform duration-200",
                      isStageDropdownOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {/* Dropdown Menu Popover */}
              {isStageDropdownOpen && (
                <div className="absolute left-0 top-11 z-50 w-full sm:w-84 rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Search inside Dropdown */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      value={stageSearch}
                      onChange={(e) => setStageSearch(e.target.value)}
                      placeholder="Search categories & stages..."
                      className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {stageSearch && (
                      <button
                        type="button"
                        onClick={() => setStageSearch("")}
                        className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Header Actions */}
                  <div className="px-3 py-1.5 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <button
                      type="button"
                      onClick={handleClearStages}
                      className={cn(
                        "font-medium hover:text-[#00AEEF] transition-colors cursor-pointer",
                        selectedStages.length === 0 ? "font-bold text-[#00AEEF]" : "text-slate-600"
                      )}
                    >
                      All (Reset)
                    </button>
                    <span className="text-slate-400">
                      {selectedStages.length > 0 ? `${selectedStages.length} selected` : "None selected"}
                    </span>
                  </div>

                  {/* Options List */}
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-2 text-xs">
                    {filteredStageGroups.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No matching categories or stages found.
                      </div>
                    ) : (
                      filteredStageGroups.map((grp) => (
                        <div key={grp.group} className="space-y-0.5">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 rounded">
                            {grp.group}
                          </div>
                          {grp.items.map((item) => {
                            const isChecked = selectedStages.includes(item.value);
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => handleToggleStage(item.value)}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer",
                                  isChecked
                                    ? "bg-sky-50 text-sky-800 font-semibold"
                                    : "hover:bg-slate-100 text-slate-700"
                                )}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div
                                    className={cn(
                                      "h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                      isChecked
                                        ? "bg-[#00AEEF] border-[#00AEEF] text-white"
                                        : "border-slate-300 bg-white"
                                    )}
                                  >
                                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <span className="text-sm shrink-0">{item.icon}</span>
                                  <span className={cn("truncate", item.isMain && "font-bold text-sky-700")}>
                                    {item.label}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <div>
            <Button
              type="button"
              variant="default"
              onClick={() => fetchReport(startDate, endDate, selectedUserId, selectedStages)}
              disabled={loading}
              className="w-full h-9 gap-2 bg-[#00AEEF] hover:bg-[#0098d4] text-white font-semibold shadow-xs"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span>{loading ? "Calculating..." : "Generate Report"}</span>
            </Button>
          </div>
        </div>

        {/* Active Stage Filters Indicator Banner */}
        {selectedStages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#00AEEF]" /> Active Filters ({selectedStages.length}):
            </span>
            {selectedStages.map((stageVal) => (
              <span
                key={stageVal}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold"
              >
                {getStageBadgeLabel(stageVal)}
                <button
                  type="button"
                  onClick={() => handleToggleStage(stageVal)}
                  className="ml-1 text-sky-500 hover:text-sky-800 font-black cursor-pointer text-sm leading-none"
                  title="Remove this filter"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearStages}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
            >
              Clear all
            </button>
            <span className="text-[11px] text-slate-400 w-full sm:w-auto">
              Metrics, counts, and granular records below are scoped exclusively to these selected sections & categories.
            </span>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && !reportData && (
        <LoadingState message="Aggregating performance metrics, activities, tasks, and deals..." />
      )}

      {error && !reportData && (
        <ErrorState
          title="Unable to Generate Report"
          message={error}
          onRetry={() => fetchReport()}
        />
      )}

      {/* Report Content */}
      {reportData && (
        <div className="space-y-6">
          {/* Executive Overview Header Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Efficiency Score Gauge Card (Always visible to retain Score & Performance Tier) */}
            <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/50 to-sky-50/30 p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {reportData.is_team_overview
                    ? "Team Average Efficiency"
                    : "Individual Efficiency Index"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="How efficiency is calculated"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>

              {/* Formula Tooltip Box */}
              {showFormulaInfo && (
                <div className="mt-2 p-3 bg-slate-800 text-white rounded-lg text-xs space-y-1 z-10 shadow-lg">
                  <div className="font-bold text-sky-400">Score Formula Weighting:</div>
                  <p>• 40% Tasks Completion & On-Time Performance</p>
                  <p>• 35% Activities Logged (Calls, Meetings, Emails, Notes)</p>
                  <p>• 25% Deals Win Rate & Revenue Outcomes</p>
                </div>
              )}

              <div className="my-4 flex items-center gap-4">
                {/* Big Score Radial Badge */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-slate-800 text-white shadow-md">
                  <div className="text-center">
                    <span className="text-2xl font-black tracking-tight text-white">
                      {reportData.is_team_overview
                        ? reportData.team_average_efficiency
                        : activeReport?.efficiency_score || 0}
                    </span>
                    <span className="text-xs font-bold text-sky-400 block -mt-1">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">
                      Performance Tier
                    </span>
                    <div className="mt-1">
                      {getRatingBadge(
                        reportData.is_team_overview
                          ? reportData.team_average_efficiency >= 85
                            ? "Top Performer"
                            : reportData.team_average_efficiency >= 70
                            ? "High Efficiency"
                            : "Good"
                          : activeReport?.performance_rating || "Good"
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500">
                    Period: <span className="font-semibold text-slate-700">{reportData.period_start}</span> to{" "}
                    <span className="font-semibold text-slate-700">{reportData.period_end}</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar of Composite Score */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Productivity Benchmark</span>
                  <span className="text-slate-700">
                    {reportData.is_team_overview
                      ? reportData.team_average_efficiency
                      : activeReport?.efficiency_score || 0}
                    / 100
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        reportData.is_team_overview
                          ? reportData.team_average_efficiency
                          : activeReport?.efficiency_score || 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Side: Specific filtered cards or All cards */}
            <div
              className={cn(
                "lg:col-span-8 grid gap-4",
                activeCategories.all || activeCategories.count >= 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1"
              )}
            >
              {/* Tasks Card */}
              {(activeCategories.all || activeCategories.hasTasks) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Tasks
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {activeReport?.tasks.completed || 0}
                      <span className="text-xs text-slate-400 font-normal ml-1">
                        / {activeReport?.tasks.total_assigned || 0} assigned
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-semibold text-emerald-600">
                        {activeReport?.tasks.completion_rate || 0}% rate
                      </span>
                      <span className="text-slate-400">
                        • {activeReport?.tasks.on_time_rate || 0}% on-time
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Pending: {activeReport?.tasks.pending || 0}</span>
                    <span>•</span>
                    <span>In Progress: {activeReport?.tasks.in_progress || 0}</span>
                    {activeReport?.tasks.overdue ? (
                      <>
                        <span>•</span>
                        <span className="text-rose-600 font-semibold">
                          Overdue: {activeReport.tasks.overdue}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Activities Card */}
              {(activeCategories.all || activeCategories.hasActivities) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Activities
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <CalendarCheck2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {reportData.is_team_overview
                        ? reportData.team_activities_logged
                        : activeReport?.activities.total || 0}
                      <span className="text-xs text-slate-400 font-normal ml-1">logged activities</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 font-medium">
                      <span>Calls: {activeReport?.activities.calls || 0}</span>
                      <span>•</span>
                      <span>Meetings: {activeReport?.activities.meetings || 0}</span>
                      <span>•</span>
                      <span>Emails: {activeReport?.activities.emails || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Notes: {activeReport?.activities.notes || 0}</span>
                    <span>Follow-ups: {activeReport?.activities.follow_ups || 0}</span>
                  </div>
                </div>
              )}

              {/* Deals Card */}
              {(activeCategories.all || activeCategories.hasDeals) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Deals
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(activeReport?.deals.won_amount || 0)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-semibold text-emerald-600">
                        {activeReport?.deals.won || 0} won
                      </span>
                      <span className="text-slate-400">
                        • {activeReport?.deals.win_rate || 0}% win rate
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>
                      Pipeline: {formatCurrency(activeReport?.deals.active_amount || 0)}
                    </span>
                    <span>Lost: {activeReport?.deals.lost || 0}</span>
                  </div>
                </div>
              )}

              {/* Contacts & Companies (when All is selected) */}
              {activeCategories.all && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Contacts & Companies
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {(activeReport?.crm_impact.contacts_created || 0) +
                        (activeReport?.crm_impact.companies_created || 0)}
                      <span className="text-xs text-slate-400 font-normal ml-1">entities created</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                      <span>{activeReport?.crm_impact.contacts_created || 0} contacts</span>
                      <span>•</span>
                      <span>{activeReport?.crm_impact.companies_created || 0} companies</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    New records introduced to the workspace
                  </div>
                </div>
              )}

              {/* Companies Card (when specific filter is active) */}
              {!activeCategories.all && activeCategories.hasCompanies && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Companies
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {activeReport?.crm_impact.companies_created || 0}
                      <span className="text-xs text-slate-400 font-normal ml-1">companies created</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Filtered company stage records
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Corporate accounts in this period
                  </div>
                </div>
              )}

              {/* Contacts Card (when specific filter is active) */}
              {!activeCategories.all && activeCategories.hasContacts && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Contacts
                    </span>
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="my-2">
                    <div className="text-2xl font-bold text-slate-900">
                      {activeReport?.crm_impact.contacts_created || 0}
                      <span className="text-xs text-slate-400 font-normal ml-1">contacts created</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Filtered contact stage records
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Individual contacts in this period
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Team Leaderboard Section (Visible when All Team Members is queried) */}
          {reportData.is_team_overview && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#00AEEF]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Team Efficiency Leaderboard & Comparative Ranking
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  {reportData.total_team_members} members evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Efficiency Score</th>
                      <th className="py-3 px-4">Performance</th>
                      <th className="py-3 px-4">Tasks Done</th>
                      <th className="py-3 px-4">Activities</th>
                      <th className="py-3 px-4">Deals Won</th>
                      <th className="py-3 px-4">Won Value</th>
                      <th className="py-3 px-4 text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.user_reports.map((r, idx) => {
                      const isTop3 = idx < 3;
                      return (
                        <tr
                          key={r.user.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold">
                            {idx === 0 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs">
                                🥇
                              </span>
                            )}
                            {idx === 1 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-700 text-xs">
                                🥈
                              </span>
                            )}
                            {idx === 2 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-200 text-amber-900 text-xs">
                                🥉
                              </span>
                            )}
                            {idx >= 3 && <span className="text-slate-500">#{idx + 1}</span>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{r.user.full_name}</div>
                            <div className="text-[11px] text-slate-400">{r.user.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-medium text-[10px]">
                              {r.user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {r.efficiency_score}%
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden hidden sm:block">
                                <div
                                  className="h-full rounded-full bg-[#00AEEF]"
                                  style={{ width: `${Math.min(100, r.efficiency_score)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getRatingBadge(r.performance_rating)}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-slate-800">
                              {r.tasks.completed}/{r.tasks.total_assigned}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({r.tasks.completion_rate}%)
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {r.activities.total}
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-600">
                            {r.deals.won}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {formatCurrency(r.deals.won_amount)}
                          </td>
                          <td className="py-3 px-4 text-right print:hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(r.user.id);
                                fetchReport(startDate, endDate, r.user.id, selectedStages);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00AEEF] hover:text-[#0098d4]"
                            >
                              <span>View Profile</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Visual Activity & Pipeline Breakdown Panels */}
          {activeReport && (activeCategories.all || activeCategories.hasActivities || activeCategories.hasTasks) && (
            <div
              className={cn(
                "grid gap-5",
                (activeCategories.hasActivities && activeCategories.hasTasks) || activeCategories.all
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 max-w-2xl"
              )}
            >
              {/* Activity Types Breakdown */}
              {(activeCategories.all || activeCategories.hasActivities) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CalendarCheck2 className="h-4 w-4 text-purple-600" />
                      Activities
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      Total: {activeReport.activities.total}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Phone Calls", count: activeReport.activities.calls, color: "bg-blue-500" },
                      { label: "Client Meetings", count: activeReport.activities.meetings, color: "bg-purple-500" },
                      { label: "Emails Sent", count: activeReport.activities.emails, color: "bg-emerald-500" },
                      { label: "Internal Notes", count: activeReport.activities.notes, color: "bg-amber-500" },
                      { label: "Scheduled Follow-ups", count: activeReport.activities.follow_ups, color: "bg-indigo-500" },
                    ].map((item) => {
                      const total = activeReport.activities.total;
                      const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{item.label}</span>
                            <span className="text-slate-500">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", item.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task Completion Health Breakdown */}
              {(activeCategories.all || activeCategories.hasTasks) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Tasks
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      Total: {activeReport.tasks.total_assigned}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Completed On-Time", count: activeReport.tasks.completed_on_time, color: "bg-emerald-500" },
                      { label: "Total Completed", count: activeReport.tasks.completed, color: "bg-sky-500" },
                      { label: "In Progress", count: activeReport.tasks.in_progress, color: "bg-amber-500" },
                      { label: "Pending Execution", count: activeReport.tasks.pending, color: "bg-slate-400" },
                      { label: "Overdue Items", count: activeReport.tasks.overdue, color: "bg-rose-500" },
                    ].map((item) => {
                      const total = Math.max(1, activeReport.tasks.total_assigned);
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{item.label}</span>
                            <span className="text-slate-500">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", item.color)}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Granular Logs & Records Tabs */}
          {activeReport && (activeCategories.all || activeCategories.hasTasks || activeCategories.hasActivities || activeCategories.hasDeals) && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Tab Selector Header */}
              <div className="border-b border-slate-200 flex items-center gap-2 px-4 bg-slate-50/50 print:hidden">
                {(activeCategories.all || activeCategories.hasTasks) && (
                  <button
                    type="button"
                    onClick={() => setDetailTab("tasks")}
                    className={cn(
                      "py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                      detailTab === "tasks"
                        ? "border-[#00AEEF] text-[#00AEEF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tasks ({activeReport.recent_tasks.length})</span>
                  </button>
                )}

                {(activeCategories.all || activeCategories.hasActivities) && (
                  <button
                    type="button"
                    onClick={() => setDetailTab("activities")}
                    className={cn(
                      "py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                      detailTab === "activities"
                        ? "border-[#00AEEF] text-[#00AEEF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <CalendarCheck2 className="h-3.5 w-3.5" />
                    <span>Activities ({activeReport.recent_activities.length})</span>
                  </button>
                )}

                {(activeCategories.all || activeCategories.hasDeals) && (
                  <button
                    type="button"
                    onClick={() => setDetailTab("deals")}
                    className={cn(
                      "py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5",
                      detailTab === "deals"
                        ? "border-[#00AEEF] text-[#00AEEF]"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Deals ({activeReport.recent_deals.length})</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Tasks */}
              {detailTab === "tasks" && (
                <div className="overflow-x-auto">
                  {activeReport.recent_tasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No tasks found in this time range.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Task Title</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Priority</th>
                          <th className="py-2.5 px-4">Due Date</th>
                          <th className="py-2.5 px-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeReport.recent_tasks.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-4 font-medium text-slate-800">{t.title}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                                  t.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : t.status === "in_progress"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "bg-slate-100 text-slate-700"
                                )}
                              >
                                {t.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase",
                                  t.priority === "urgent" || t.priority === "high"
                                    ? "text-rose-600"
                                    : "text-slate-500"
                                )}
                              >
                                {t.priority}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">
                              {t.due_date ? formatDate(t.due_date) : "None"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {formatDate(t.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 2: Activities */}
              {detailTab === "activities" && (
                <div className="overflow-x-auto">
                  {activeReport.recent_activities.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No activities logged in this time range.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Type</th>
                          <th className="py-2.5 px-4">Subject</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Scheduled Date</th>
                          <th className="py-2.5 px-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeReport.recent_activities.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5 font-medium capitalize text-slate-800">
                                {getActivityIcon(a.type)}
                                <span>{a.type.replace("_", " ")}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">{a.subject}</td>
                            <td className="py-2.5 px-4">
                              {a.is_completed ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500">
                              {a.scheduled_at ? formatDate(a.scheduled_at) : "N/A"}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {formatDate(a.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Deals */}
              {detailTab === "deals" && (
                <div className="overflow-x-auto">
                  {activeReport.recent_deals.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No deals managed or closed in this time range.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Deal Title</th>
                          <th className="py-2.5 px-4">Amount</th>
                          <th className="py-2.5 px-4">Pipeline Stage</th>
                          <th className="py-2.5 px-4">Outcome</th>
                          <th className="py-2.5 px-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeReport.recent_deals.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-4 font-semibold text-slate-900">{d.title}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {formatCurrency(d.amount, d.currency)}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 text-[11px]">
                                {d.stage_name || "Unknown"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              {d.is_won ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Won
                                </span>
                              ) : d.is_lost ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Lost
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                  In Pipeline
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {formatDate(d.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
