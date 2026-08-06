"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { sendOtp } from "@/services/authService";

type Step = "phone" | "otp";

type PhoneOtpLoginProps = {
  onSuccess: () => void;
  onError: (message: string) => void;
  isParentLoading?: boolean;
};

export default function PhoneOtpLogin({
  onSuccess,
  onError,
  isParentLoading = false,
}: PhoneOtpLoginProps) {
  const { loginWithPhoneOtp } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    onError("");
    setIsLoading(true);
    try {
      const result = await sendOtp(phone);
      setStep("otp");
      setResendSeconds(result.retryAfterSeconds ?? 60);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    onError("");
    setIsLoading(true);
    try {
      await loginWithPhoneOtp(phone, otp);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    onError("");
    setIsLoading(true);
    try {
      const result = await sendOtp(phone);
      setResendSeconds(result.retryAfterSeconds ?? 60);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isParentLoading;

  if (step === "phone") {
    return (
      <form className="space-y-4" onSubmit={handleSendOtp}>
        <div className="space-y-1.5">
          <label htmlFor="otp-phone" className="text-base font-semibold">
            Mobile number
          </label>
          <div className="flex gap-2">
            <span className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600">
              +91
            </span>
            <input
              id="otp-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
              required
            />
          </div>
          <p className="text-xs text-slate-500">
            Use the mobile number linked to your CRM account.
          </p>
        </div>
        <button
          type="submit"
          disabled={busy || phone.length !== 10}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-base font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleVerifyOtp}>
      <p className="text-sm text-slate-600">
        OTP sent to <span className="font-semibold">+91 {phone}</span>
        <button
          type="button"
          className="ml-2 text-sky-700 hover:underline"
          onClick={() => {
            setStep("phone");
            setOtp("");
          }}
        >
          Change
        </button>
      </p>
      <div className="space-y-1.5">
        <label htmlFor="otp-code" className="text-base font-semibold">
          OTP
        </label>
        <input
          id="otp-code"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
          }
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base tracking-widest text-slate-700 outline-none ring-sky-300 transition focus:bg-white focus:ring-2"
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy || otp.length < 4}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-slate-800 to-sky-700 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Verifying..." : "Verify & Sign In"}
      </button>
      <button
        type="button"
        disabled={busy || resendSeconds > 0}
        onClick={handleResend}
        className="w-full text-sm font-semibold text-sky-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {resendSeconds > 0
          ? `Resend OTP in ${resendSeconds}s`
          : "Resend OTP"}
      </button>
    </form>
  );
}
