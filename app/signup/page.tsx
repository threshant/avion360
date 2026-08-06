"use client";

import { useAuth } from "@/lib/auth-context";
import type { SignupPayload } from "@/types/auth";
import { ArrowLeft, ArrowRight, Building2, UserPlus } from "lucide-react";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const headingFont = Sora({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Step = 1 | 2 | 3;

const stepLabels = [
  "Account details",
  "Company profile",
  "Review & submit",
] as const;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [planTier, setPlanTier] = useState("starter");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canGoToStepTwo =
    name.trim().length > 1 &&
    email.trim().length > 3 &&
    password.length >= 8 &&
    password === confirmPassword;

  const parsedTeamSize = Number(teamSize);
  const canGoToStepThree =
    organizationName.trim().length > 1 &&
    industry.trim().length > 1 &&
    Number.isInteger(parsedTeamSize) &&
    parsedTeamSize > 0;

  const goNext = () => {
    setError(null);
    if (step === 1 && !canGoToStepTwo) {
      setError("Enter valid account details and matching passwords.");
      return;
    }
    if (step === 2 && !canGoToStepThree) {
      setError("Please complete company details before continuing.");
      return;
    }
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canGoToStepTwo || !canGoToStepThree) {
      setError("Please complete all required fields.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const payload: SignupPayload = {
      name: name.trim(),
      email: email.trim(),
      password,
      organizationName: organizationName.trim(),
      teamSize: parsedTeamSize,
      industry: industry.trim(),
      companyWebsite: companyWebsite.trim() || undefined,
      planTier,
    };

    try {
      await signup(payload);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      className={`${bodyFont.className} relative min-h-screen overflow-hidden bg-[#e8ebff]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(104,130,255,.35),transparent_35%),radial-gradient(circle_at_75%_80%,rgba(61,92,255,.18),transparent_38%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="grid w-full overflow-hidden rounded-[30px] border border-white/60 bg-white shadow-[0_30px_80px_rgba(20,33,90,0.22)] md:grid-cols-[0.95fr_1.05fr]">
          <section className="relative flex flex-col justify-between bg-linear-to-b from-[#4f62ff] to-[#2640e9] p-8 text-white sm:p-10">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-7.5 -left-7.5 h-40 w-40 rounded-full bg-[#7ca1ff]/30 blur-2xl" />

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/75">
                Onboarding
              </p>
              <h1
                className={`${headingFont.className} mt-6 text-3xl font-semibold leading-tight sm:text-4xl`}
              >
                Launch your CRM workspace in minutes.
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
                Create your admin account, set up company details, and invite
                your team after you sign up.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {stepLabels.map((label, index) => {
                const isActive = index + 1 <= step;
                return (
                  <div
                    key={label}
                    className={`rounded-xl border px-2 py-2 transition ${
                      isActive
                        ? "border-white/60 bg-white/20 text-white"
                        : "border-white/20 bg-white/5 text-blue-100"
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <h2
                className={`${headingFont.className} text-3xl font-semibold text-slate-900`}
              >
                Create account
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Step {step} of 3: {stepLabels[step - 1]}.
              </p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                {step === 1 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Full name
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Work email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="you@company.com"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Create password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="Minimum 8 characters"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Confirm password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="Retype your password"
                        required
                      />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Company name
                      </label>
                      <input
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="Acme Logistics"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Team size
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={teamSize}
                          onChange={(e) => setTeamSize(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                          placeholder="25"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">
                          Industry
                        </label>
                        <input
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                          placeholder="SaaS, Staffing, Retail"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Company website (optional)
                      </label>
                      <input
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">
                        Plan tier
                      </label>
                      <select
                        value={planTier}
                        onChange={(e) => setPlanTier(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none ring-[#5d71ff] transition focus:bg-white focus:ring-2"
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <UserPlus className="h-4 w-4 text-[#3148de]" />
                      Account owner
                    </div>
                    <p className="text-sm text-slate-600">
                      {name} ({email})
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Building2 className="h-4 w-4 text-[#3148de]" />
                      Company
                    </div>
                    <p className="text-sm text-slate-600">
                      {organizationName} · {industry} · {teamSize} team members
                    </p>
                    {companyWebsite && (
                      <p className="text-sm text-slate-600">{companyWebsite}</p>
                    )}
                    <p className="text-sm text-slate-600">Plan: {planTier}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  )}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#253ed8] to-[#4f62ff] text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#253ed8] to-[#4f62ff] text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Creating account..." : "Create account"}
                    </button>
                  )}
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/"
                  className="font-semibold text-[#3148de] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
