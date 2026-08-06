"use client";

import PhoneOtpLogin from "@/components/PhoneOtpLogin";
import { useOtpLoginStatus } from "@/hooks/useOtpLoginStatus";
import { useAuth } from "@/lib/auth-context";
import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type RoleKey = "super_admin" | "admin" | "employee";

type RolePreset = {
  id: RoleKey;
  label: string;
  email: string;
  password: string;
  dotClass: string;
};

const rolePresets: RolePreset[] = [
  {
    id: "super_admin",
    label: "Super Admin",
    email: "super.admin@crm.demo",
    password: "Super@123",
    dotClass: "border-sky-600",
  },
  {
    id: "admin",
    label: "Admin / Team Lead",
    email: "admin@crm.demo",
    password: "Admin@123",
    dotClass: "border-cyan-600",
  },
  {
    id: "employee",
    label: "Employee",
    email: "employee@crm.demo",
    password: "Employee@123",
    dotClass: "border-teal-600",
  },
];

export default function Home() {
  const router = useRouter();
  const { login, isAuthenticated, loginWithToken } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleKey>("super_admin");
  const [email, setEmail] = useState(rolePresets[0].email);
  const [password, setPassword] = useState(rolePresets[0].password);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { otpLoginStatus } = useOtpLoginStatus(!isAuthenticated);

  const currentRole = useMemo(
    () =>
      rolePresets.find((role) => role.id === selectedRole) ?? rolePresets[0],
    [selectedRole],
  );

  const handleTokenLogin = useCallback(
    async (token: string) => {
      try {
        setIsLoading(true);
        await loginWithToken(token);
        router.push("/dashboard");
      } catch {
        setError("Shared link is invalid or has expired.");
        // Clear token from URL
        router.replace("/");
      } finally {
        setIsLoading(false);
      }
    },
    [loginWithToken, router],
  );

  // Handle redirect if already authenticated or check for share_token
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
      return;
    }

    // Check for share_token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("share_token");
    if (token) {
      void handleTokenLogin(token);
    }
  }, [handleTokenLogin, isAuthenticated, router]);

  const handleRoleSelect = (role: RolePreset) => {
    setSelectedRole(role.id);
    setEmail(role.email);
    setPassword(role.password);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render login form if authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#f8fbff] via-[#eff4ff] to-[#e6efff]">
      {/* ── Animated background (fixed so they never affect layout) ── */}
      <div className="bg-shimmer pointer-events-none fixed inset-0 z-0" />
      <div className="animate-float-slow pointer-events-none fixed -top-32 left-1/3 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
      <div className="animate-float-medium pointer-events-none fixed right-10 top-24 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="animate-float-fast pointer-events-none fixed bottom-20 left-1/4 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      <div
        className="animate-float-slow pointer-events-none fixed bottom-1/3 right-1/3 h-64 w-64 rounded-full bg-sky-200/25 blur-3xl"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full">
          <div className="mx-auto flex flex-col items-center justify-center text-center">
            {/* Sourcersbiz CRM Title */}
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl text-slate-800 mb-6">
              Sourcersbiz CRM
            </h1>

            {/* Login Card */}
            <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-6 text-zinc-900 shadow-2xl shadow-slate-300/50 backdrop-blur md:p-8">
              <h2 className="text-2xl font-bold">Login</h2>
              <p className="mt-1.5 text-base text-zinc-500">
                Enter your credentials to access the system
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                Signing in as{" "}
                <span className="font-semibold">{currentRole.label}</span>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-base font-semibold">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-base font-semibold">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-800 to-sky-700 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin"
                      />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn aria-hidden="true" className="h-5 w-5" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {otpLoginStatus?.active && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-3 text-slate-500">
                        or sign in with phone
                      </span>
                    </div>
                  </div>
                  <PhoneOtpLogin
                    isParentLoading={isLoading}
                    onSuccess={() => router.push("/dashboard")}
                    onError={(message) => setError(message)}
                  />
                </>
              )}

              <div className="mt-4 text-center">
                <a
                  href="/signup"
                  className="text-sm font-semibold text-sky-700 hover:underline"
                >
                  Don&apos;t have an account? Sign up
                </a>
              </div>

              <div className="mt-6 border-t border-zinc-200 pt-5">
                <div className="mt-4 space-y-3">
                  {rolePresets.map((role) => {
                    const isActive = selectedRole === role.id;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelect(role)}
                        className={`flex h-12 w-full items-center gap-3 rounded-xl border px-4 text-left text-base font-semibold transition ${
                          isActive
                            ? "border-sky-300 bg-sky-50 text-sky-800"
                            : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${role.dotClass}`}
                        />
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
