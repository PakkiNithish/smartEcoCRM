"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Lock,
  Search,
  RefreshCw,
  Clock,
  Trash2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { User } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "agent",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.getCurrentUser();
      setCurrentUser(user);

      if (user.role !== "admin") {
        setError("Access restricted. Only Administrators can access this section.");
        return;
      }

      const companyUsers = await api.getCompanyUsers();
      setUsers(companyUsers);
    } catch (err: any) {
      setError(err?.message || "Failed to load company users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert("You cannot deactivate your own administrator account.");
      return;
    }
    try {
      const nextStatus = !targetUser.is_active;
      await api.updateCompanyUser(targetUser.id, { is_active: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u))
      );
      setSuccessMsg(`User status updated to ${nextStatus ? "Active" : "Inactive"}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to update user status");
    }
  };

  const handleRoleChange = async (targetUser: User, newRole: string) => {
    if (targetUser.id === currentUser?.id) {
      alert("You cannot modify your own administrator role to prevent accidental lockout.");
      return;
    }
    try {
      await api.updateCompanyUser(targetUser.id, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setSuccessMsg(`Role for "${targetUser.full_name}" successfully updated to ${newRole === "admin" ? "Admin" : "Agent"}.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to update user role");
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      alert("You cannot remove your own administrator account.");
      setUserToDelete(null);
      return;
    }
    try {
      setDeletingUser(true);
      await api.deleteCompanyUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessMsg(`User "${userToDelete.full_name}" was successfully removed from your company workspace.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err?.message || "Failed to remove user from company.");
    } finally {
      setDeletingUser(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      alert("Password must be at least 8 characters");
      return;
    }

    try {
      setSubmitting(true);
      await api.createCompanyUser({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setIsModalOpen(false);
      setFormData({ full_name: "", email: "", password: "", role: "agent" });
      setSuccessMsg("Team member successfully created and added to your company!");
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to create team member");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin text-[#00AEEF]" />
          <span>Loading company workspace users...</span>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 text-center bg-white rounded-xl shadow-xs border border-red-200">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2">
          This section is exclusively for company administrators. Please contact your company administrator to manage team members.
        </p>
      </div>
    );
  }

  const activeCount = users.filter((u) => u.is_active !== false).length;
  const companyName = currentUser?.company_name || "Company Workspace";

  const formatDateLastActive = (dateStr?: string | null) => {
    if (!dateStr) return "Never";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Never";
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Never";
    }
  };

  const isRecentlyActive = (dateStr?: string | null) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const diff = Math.abs(Date.now() - d.getTime());
      return diff < 5 * 60 * 1000;
    } catch {
      return false;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Administrator Control Panel</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span>Company Users</span>
            <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
              <Building2 className="h-3 w-3 mr-1" />
              {companyName}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employees, agents, and supervisors associated with your company workspace.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#00AEEF] hover:bg-[#0098d4] text-white font-medium text-sm transition-all shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Total Team Members</span>
          <div className="text-2xl font-bold text-foreground mt-1">{users.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Active Members</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-medium text-muted-foreground">Workspace Scope</span>
          <div className="text-sm font-semibold text-sky-600 mt-2 truncate">{companyName}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4" title="dateLastActive">Last Active</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.is_active !== false;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs uppercase border border-slate-200">
                            {u.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={cn(
                            "font-medium",
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100"
                              : "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          )}
                        >
                          {u.role === "admin" ? "Admin" : "Agent"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-muted-foreground font-medium">
                          {u.company_name || companyName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4" data-testid="user-date-last-active">
                        <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium whitespace-nowrap">
                            {formatDateLastActive(u.last_active_at || u.dateLastActive)}
                          </span>
                          {isRecentlyActive(u.last_active_at || u.dateLastActive) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Online
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.id !== currentUser?.id && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRoleChange(u, u.role === "admin" ? "agent" : "admin")}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-md font-medium transition-colors border cursor-pointer flex items-center gap-1",
                                u.role === "admin"
                                  ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                                  : "border-sky-200 text-[#00AEEF] hover:bg-sky-50"
                              )}
                              title={`Switch role to ${u.role === "admin" ? "Agent" : "Admin"}`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>{u.role === "admin" ? "Make Agent" : "Make Admin"}</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border cursor-pointer ${
                                isActive
                                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setUserToDelete(u)}
                              title="Remove user from company"
                              className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#00AEEF]" />
                <span>Add Team Member</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                >
                  <option value="agent">Agent (Standard CRM Operations)</option>
                  <option value="manager">Manager (Team Oversight)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground uppercase mb-1">
                  Initial Password (Min 8 Characters) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-[#00AEEF]"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Company Association:</span> This user will automatically be assigned to <span className="font-medium text-sky-600">{companyName}</span> and work inside your company workspace.
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#00AEEF] hover:bg-[#0098d4] text-white disabled:opacity-50 transition-all shadow-xs cursor-pointer min-w-[120px]"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>Remove Team Member</span>
              </h3>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-900 space-y-1">
                  <p className="font-semibold">
                    Are you sure you want to remove &quot;{userToDelete.full_name}&quot;?
                  </p>
                  <p className="text-red-700">
                    This user will lose access to the company CRM workspace ({companyName}). Existing CRM records (deals, tasks, contacts) will remain preserved.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal footer: strictly only affirmative action button, NO cancel button */}
            <div className="flex items-center justify-end pt-3 border-t border-border">
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer min-w-[120px]"
              >
                {deletingUser && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {deletingUser ? "Removing..." : "Remove User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
