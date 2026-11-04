"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Users,
  Building2,
  CheckSquare,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Flame,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  User as UserIcon,
  LogOut,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { User } from "@/types/crm";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Deals", href: "/deals", icon: Briefcase },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Activities", href: "/activities", icon: CalendarCheck2 },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "My Profile", href: "/profile", icon: UserIcon },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Company Users", href: "/admin/users", icon: ShieldCheck },
  { label: "Form Builder", href: "/admin/forms", icon: SlidersHorizontal },
];

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const u = await api.getCurrentUser();
        if (mounted && u) setCurrentUser(u);
      } catch {
        // Silently handle if unauthenticated
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);


  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-slate-700/60 bg-[#1E293B] text-slate-200 transition-all duration-300 select-none shrink-0",
          "relative z-30",
          collapsed ? "w-16" : "w-60",
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center px-4 border-b border-slate-700/60 justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00AEEF] text-white font-bold shadow-md">
                <Flame className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-tight text-white leading-none text-base">
                  smart<span className="text-[#00AEEF]">Eco</span>
                </span>
                <span
                  className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider mt-1 truncate max-w-[140px]"
                  title={currentUser?.company_name || "Simple CRM"}
                >
                  {currentUser?.company_name || "Simple CRM"}
                </span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#00AEEF] text-white font-bold">
              <Flame className="h-5 w-5" />
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            title="Close sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400 uppercase px-3 py-2">
            {!collapsed ? "CRM Modules" : "CRM"}
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  title={`${item.label} (Coming in next phase)`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => onMobileClose?.()}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#00AEEF] text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-white",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {currentUser?.role === "admin" && (
            <div className="pt-4 mt-3 border-t border-slate-700/60">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase px-3 py-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {!collapsed ? "Admin Center" : "Admin"}
              </div>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => onMobileClose?.()}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs font-semibold"
                        : "text-slate-300 hover:bg-slate-700/60 hover:text-white",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

      {/* Footer / Logout & Collapse Toggle */}
      <div className="border-t border-slate-700/60 p-3 space-y-1">
        <button
          type="button"
          onClick={() => api.logout()}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors",
            collapsed && "justify-center px-0"
          )}
          title="Sign out of smartEco"
        >
          <LogOut className="h-4 w-4 shrink-0 text-rose-400" />
          {!collapsed && <span>Log Out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-xs text-slate-400 hover:bg-slate-700/60 hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
