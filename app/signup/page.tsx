"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [organizationName, setOrganizationName] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signup({
        name,
        email,
        password,
        role,
        masterPin,
        organizationName,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-linear-to-b from-[#f8fbff] via-[#eff4ff] to-[#e6efff]">
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
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl text-slate-800 mb-6">
              Sourcersbiz CRM
            </h1>

            <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-6 text-zinc-900 shadow-2xl shadow-slate-300/50 backdrop-blur md:p-8">
              <h2 className="text-2xl font-bold">Sign up</h2>
              <p className="mt-1.5 text-base text-zinc-500">
                Create your account (master pin required)
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="text-base font-semibold">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-base font-semibold">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-base font-semibold">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-base font-semibold">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-base font-semibold">
                    Organization
                  </label>
                  <input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-base font-semibold">Master PIN</label>
                  <input
                    value={masterPin}
                    onChange={(e) => setMasterPin(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-slate-800 to-sky-700 text-base font-semibold text-white transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing up..." : "Sign up"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <a
                  href="/"
                  className="text-sm font-semibold text-sky-700 hover:underline"
                >
                  Already have an account? Sign in
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
