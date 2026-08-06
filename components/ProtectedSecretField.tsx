"use client";

import { CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type ProtectedSecretFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCopy: () => void;
  isCopied: boolean;
  isLoading: boolean;
  placeholder?: string;
};

export function ProtectedSecretField({
  label,
  value,
  onChange,
  onSave,
  onCopy,
  isCopied,
  isLoading,
  placeholder,
}: ProtectedSecretFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminError, setAdminError] = useState("");

  const maskValue = (val: string) => {
    if (!val) return "";
    return "•".repeat(Math.min(val.length, 20));
  };

  const handleShowClick = () => {
    if (!adminVerified) {
      setShowAdminDialog(true);
      setAdminError("");
    } else {
      setShowPassword(!showPassword);
    }
  };

  const handleAdminVerify = async () => {
    setAdminError("");
    try {
      // In a real app, this would verify against user's actual password
      // For now, we'll do a simple check against a hardcoded value (in production, verify on backend)
      const response = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        setAdminError(error.message || "Invalid password");
        return;
      }

      setAdminVerified(true);
      setShowPassword(true);
      setShowAdminDialog(false);
      setAdminPassword("");
    } catch (err) {
      setAdminError("Verification failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
          />
          <button
            type="button"
            onClick={handleShowClick}
            title={showPassword ? "Hide" : "Show"}
            className="flex shrink-0 items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600 transition"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!showPassword}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
              isCopied
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600"
            }`}
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Admin Password Dialog */}
      {showAdminDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Admin Verification Required
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Enter your admin password to reveal sensitive information.
            </p>

            {adminError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                <p className="text-xs text-rose-600">{adminError}</p>
              </div>
            )}

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAdminVerify();
              }}
              placeholder="Enter admin password"
              autoFocus
              className="mt-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:bg-white focus:ring-2"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAdminDialog(false);
                  setAdminPassword("");
                  setAdminError("");
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminVerify}
                className="flex-1 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isLoading}
        className="mt-2 flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-50"
      >
        Save {label}
      </button>
    </div>
  );
}
