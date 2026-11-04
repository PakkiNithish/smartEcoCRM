"use client";

import React from "react";
import {
  User as UserIcon,
  ShieldCheck,
  Building2,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Calendar,
  Sparkles,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { User } from "@/types/crm";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"details" | "security" | "permissions">("details");

  // Profile Edit State
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileMessage, setProfileMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load Current User
  React.useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      try {
        const u = await api.getCurrentUser();
        if (u) {
          setUser(u);
          setFullName(u.full_name || "");
          setEmail(u.email || "");
          setCompanyName(u.company_name || "");
        }
      } catch (err: any) {
        setProfileMessage({
          text: err.detail || err.message || "Failed to load profile details.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  // Save Profile Details
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);

    if (!fullName.trim()) {
      setProfileMessage({ text: "Full name cannot be blank.", type: "error" });
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setProfileMessage({ text: "Please enter a valid email address.", type: "error" });
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await api.updateCurrentUserProfile({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        company_name: user?.role === "admin" ? companyName.trim() : undefined,
      });
      setUser(updated);
      setFullName(updated.full_name || "");
      setEmail(updated.email || "");
      setCompanyName(updated.company_name || "");
      setProfileMessage({
        text: "Your profile details have been saved successfully.",
        type: "success",
      });
      setTimeout(() => setProfileMessage(null), 5000);
    } catch (err: any) {
      setProfileMessage({
        text: err.detail || err.message || "Failed to update profile details.",
        type: "error",
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Change Password
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ text: "Please enter your current password.", type: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        text: "New password must be at least 8 characters in length.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        text: "New password and confirmation do not match.",
        type: "error",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.updateCurrentUserProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        text: "Your account password was updated successfully.",
        type: "success",
      });
      setTimeout(() => setPasswordMessage(null), 5000);
    } catch (err: any) {
      setPasswordMessage({
        text: err.detail || err.message || "Failed to update password. Verify your current password.",
        type: "error",
      });
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-[#00AEEF]" />
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-slate-50 min-h-0">
      {/* Top Banner & Header */}
      <div className="relative border-b border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#00AEEF] text-white text-xl font-bold shadow-lg border-2 border-white/20">
              {initials}
            </div>

            {/* User Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {user?.full_name || "User Profile"}
                </h1>
                <Badge
                  className={`text-xs px-2.5 py-0.5 font-semibold uppercase tracking-wider ${
                    isAdmin
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                  }`}
                >
                  {isAdmin ? "Administrator" : "Standard User"}
                </Badge>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Account
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {user?.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {user?.company_name || "Telugu Cine"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Admin Shortcut */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link href="/admin/users">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Company Users</span>
                </Button>
              </Link>
              <Link href="/admin/forms">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Form Builder</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "details"
                ? "bg-white text-slate-900 shadow-xs border border-border"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "security"
                ? "bg-white text-slate-900 shadow-xs border border-border"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Security &amp; Password</span>
          </button>

          <button
            onClick={() => setActiveTab("permissions")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "permissions"
                ? "bg-white text-slate-900 shadow-xs border border-border"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Role &amp; Privileges</span>
          </button>
        </div>

        {/* TAB 1: EDITABLE PROFILE DETAILS */}
        {activeTab === "details" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">Edit Profile Information</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your account display name, email address, and workspace settings.
              </p>
            </div>

            {profileMessage && (
              <div
                className={`flex items-start gap-2.5 rounded-lg p-3.5 text-xs ${
                  profileMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {profileMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* User Role (Read-only badge info) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Assigned Account Role
                  </label>
                  <div className="flex h-9 items-center justify-between rounded-md border border-input bg-slate-50/70 px-3 text-xs text-slate-700">
                    <span className="font-semibold uppercase tracking-wider text-[#00AEEF]">
                      {user?.role}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isAdmin ? "Workspace Administrator" : "Standard Team Member"}
                    </span>
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Company Workspace</span>
                    {isAdmin ? (
                      <span className="text-[10px] text-emerald-600 font-medium">Editable by Admin</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Managed by Admin</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Company Name"
                    className={`h-9 text-xs ${!isAdmin ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Account created: {formatDate(user?.created_at)}
                </span>

                <Button
                  type="submit"
                  variant="bitrix"
                  size="sm"
                  disabled={isSavingProfile}
                  className="gap-2 text-xs font-semibold text-white px-5 shadow-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: SECURITY & PASSWORD CHANGE */}
        {activeTab === "security" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">Change Password</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure your CRM account remains protected by choosing a strong, distinct password.
              </p>
            </div>

            {passwordMessage && (
              <div
                className={`flex items-start gap-2.5 rounded-lg p-3.5 text-xs ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-9 text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    className="h-9 text-xs pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 8 characters. Use letters, numbers, and symbols for best security.
                </p>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  variant="bitrix"
                  size="sm"
                  disabled={isSavingPassword}
                  className="gap-2 text-xs font-semibold text-white px-5 shadow-sm"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ROLE & PRIVILEGES BREAKDOWN */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Role Privileges: {isAdmin ? "Administrator" : "Standard User / Agent"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your assigned account privileges within the &ldquo;{user?.company_name || "Telugu Cine"}&rdquo; workspace.
                  </p>
                </div>
                <Badge
                  className={`text-xs px-2.5 py-1 ${
                    isAdmin ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"
                  }`}
                >
                  {isAdmin ? "Full Access Control" : "Standard Operational Access"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {/* Privilege items */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>CRM Modules &amp; Pipelines</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">
                    Full capability to create, view, edit, search, and manage Deals, Contacts, Companies, Tasks, and Activities.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Bulk Operations &amp; AED Currency</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">
                    Access to multi-row quick addition grids, CSV file imports, multi-select checkboxes, and bulk deletion with safety confirmation.
                  </p>
                </div>

                <div className={`rounded-lg border p-3.5 space-y-1.5 ${
                  isAdmin ? "border-slate-200 bg-slate-50/60" : "border-slate-100 bg-slate-50/30 opacity-70"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                    {isAdmin ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400" />
                    )}
                    <span>Company User Management</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">
                    {isAdmin
                      ? "Create, activate, deactivate, and assign roles for all employees in your company workspace."
                      : "Restricted to administrators. Normal users cannot modify other user accounts."}
                  </p>
                </div>

                <div className={`rounded-lg border p-3.5 space-y-1.5 ${
                  isAdmin ? "border-slate-200 bg-slate-50/60" : "border-slate-100 bg-slate-50/30 opacity-70"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-800">
                    {isAdmin ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400" />
                    )}
                    <span>Dynamic Form Builder</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">
                    {isAdmin
                      ? "Add, remove, toggle, and configure custom fields on deal, contact, and company creation forms."
                      : "Creation forms automatically adjust to configurations set by your company administrator."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
