"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Lock, Mail, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, LogOut } from "lucide-react";
import { api, ApiError, getAuthToken } from "@/lib/api-client";
import { User } from "@/types/crm";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    async function checkSession() {
      // If there is no stored token, user is unauthenticated; skip /me request to keep console clean
      if (!getAuthToken()) return;
      try {
        const u = await api.getCurrentUser();
        if (u) setCurrentUser(u);
      } catch {
        // No active session or token expired
      }
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.login(email, password);
      // Navigate to target route after successful auth
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.detail || "Authentication failed. Please check your credentials.");
      } else {
        setError("Network error connecting to authentication server.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4">
      {/* Background Accent Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00AEEF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/25 mb-4">
              <Flame className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              smart<span className="text-[#00AEEF]">Eco</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-slate-400 mt-1 font-medium">
              Secure Cloud Workspace
            </p>
          </div>

          {/* Active Session Notification / Quick Switch */}
          {currentUser && (
            <div className="mb-6 rounded-xl bg-slate-900/90 border border-[#00AEEF]/40 p-4 shadow-lg animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00AEEF]/20 text-[#00AEEF] font-bold text-xs shrink-0 border border-[#00AEEF]/30">
                    {currentUser.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Currently Signed In
                    </p>
                    <p className="text-xs font-bold text-white truncate">
                      {currentUser.full_name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentUser.email} &bull; <span className="text-[#00AEEF] uppercase font-semibold">{currentUser.role}</span>
                    </p>
                  </div>
                </div>

                <Link
                  href={redirectUrl}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#00AEEF] px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-[#009cd6] transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Want to log in with another account?</span>
                <button
                  type="button"
                  onClick={async () => {
                    await api.logout();
                    setCurrentUser(null);
                  }}
                  className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-start gap-3 text-rose-200 text-xs animate-in fade-in zoom-in-95">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="off"
                  required
                  autoFocus
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-700 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#00AEEF] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#009cd6] focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to CRM</span>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="text-center pt-3">
              <p className="text-xs text-slate-400">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#00AEEF] hover:text-[#47BBEF] hover:underline transition-colors"
                >
                  Create an account / Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Security Notice Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          smartEco &bull; Enterprise Secure Cloud Workspace
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
          Loading authentication portal...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
