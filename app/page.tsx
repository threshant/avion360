"use client";

import PhoneOtpLogin from "@/components/PhoneOtpLogin";
import { useOtpLoginStatus } from "@/hooks/useOtpLoginStatus";
import { useAuth } from "@/lib/auth-context";
import { LoaderCircle, LogIn } from "lucide-react";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

const headingFont = Sora({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Home() {
  const router = useRouter();
  const { login, isAuthenticated, loginWithToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { otpLoginStatus } = useOtpLoginStatus(!isAuthenticated);

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
    <main
      className={`${bodyFont.className} relative min-h-screen overflow-hidden bg-[#e8ebff]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(90,121,255,.35),transparent_35%),radial-gradient(circle_at_80%_90%,rgba(31,83,255,.2),transparent_32%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_30px_80px_rgba(20,33,90,0.22)] md:grid-cols-[0.95fr_1.05fr]">
          <section className="relative flex flex-col justify-between bg-linear-to-b from-[#4f62ff] to-[#2640e9] p-8 text-white sm:p-10">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-7.5 -left-7.5 h-40 w-40 rounded-full bg-[#7ca1ff]/30 blur-2xl" />

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/75">
                Sourcersbiz CRM
              </p>
              <h1
                className={`${headingFont.className} mt-6 text-3xl font-semibold leading-tight sm:text-4xl`}
              >
                Welcome back.
                <br />
                Close more deals with one clean workspace.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
                Unified calls, leads, and follow-ups for fast-moving teams. Sign
                in to continue where you left off.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-white/90">
                "The team now tracks every lead stage and conversation without
                spreadsheet chaos."
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-blue-100">
                Revenue Ops Lead
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <h2
                className={`${headingFont.className} text-3xl font-semibold text-slate-900`}
              >
                Sign in
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your workspace credentials.
              </p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Work email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#253ed8] to-[#4f62ff] text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <span>Sign in</span>
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
                    <div className="relative flex justify-center text-xs uppercase tracking-[0.18em]">
                      <span className="bg-white px-3 text-slate-400">
                        or phone login
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

              <p className="mt-6 text-center text-sm text-slate-500">
                Need an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#3148de] hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
