"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User as UserIcon, Menu, LogOut, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { User } from "@/types/crm";

interface TopNavProps {
  onToggleMobileSidebar?: () => void;
}

const ROUTE_CONFIG: Record<string, { title: string; badge: string }> = {
  "/dashboard": { title: "Dashboard", badge: "Executive Overview" },
  "/deals": { title: "Deals", badge: "General Pipeline" },
  "/contacts": { title: "Contacts", badge: "Customer Directory" },
  "/companies": { title: "Companies", badge: "Organization Accounts" },
  "/tasks": { title: "Tasks", badge: "Workflow & Follow-ups" },
  "/activities": { title: "Activities", badge: "Customer Interactions" },
  "/admin/users": { title: "Company Users", badge: "Admin Team Management" },
  "/admin/forms": { title: "Form Builder", badge: "Configurable Creation Forms" },
  "/profile": { title: "My Profile", badge: "Account & Preferences" },
};

export function TopNav({ onToggleMobileSidebar }: TopNavProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    async function loadUser() {
      try {
        const user = await api.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadUser();
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  // Determine current route context
  const activeRouteKey =
    Object.keys(ROUTE_CONFIG).find((k) => pathname.startsWith(k)) || "/dashboard";
  const { title, badge } = ROUTE_CONFIG[activeRouteKey] || {
    title: "CRM",
    badge: "Workspace",
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6 sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Toggle & Breadcrumbs Context */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden transition-colors"
            title="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <span className="text-sm font-semibold text-foreground">CRM</span>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Badge
          variant="secondary"
          className="text-[11px] font-normal bg-sky-50 text-[#00AEEF] border-sky-200 hidden sm:inline-flex"
        >
          {badge}
        </Badge>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Pill with Interactive Profile Popover */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors text-left"
            title="View user session & profile"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[#00AEEF] border border-slate-200">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-foreground leading-none">
                {currentUser?.full_name || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                {currentUser?.role ? `${currentUser.role}` : "Active"}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 text-xs space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00AEEF]/10 text-[#00AEEF] font-bold text-base border border-[#00AEEF]/20">
                  {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-foreground text-sm truncate">
                    {currentUser?.full_name || "User"}
                  </div>
                  <div className="text-muted-foreground truncate text-[11px]">
                    {currentUser?.email || "user@crm.com"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <span className="font-semibold uppercase tracking-wider text-[#00AEEF]">
                    {currentUser?.role || "Agent"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Session Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    Active / Authenticated
                  </span>
                </div>
              </div>

              {/* View & Edit Profile Link */}
              <Link
                href="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center justify-between rounded-md bg-slate-50 hover:bg-slate-100 p-2.5 text-xs font-semibold text-slate-800 transition-colors border border-border group"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3.5 w-3.5 text-[#00AEEF]" />
                  <span>View &amp; Edit Profile</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {/* Secure Session Info & Logout Action */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>JWT &amp; Cookie Auth</span>
                </span>
                <button
                  type="button"
                  onClick={() => api.logout()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition-colors"
                  title="Sign out of smartEco"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
