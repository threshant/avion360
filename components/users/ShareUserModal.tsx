"use client";

import { useShareUserAccess } from "@/hooks/useUserManagement";
import type { UserWithPermissions } from "@/types";
import { AlertCircle, Check, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ShareUserModalProps {
  isOpen: boolean;
  user: UserWithPermissions | null;
  onClose: () => void;
}

export function ShareUserModal({ isOpen, user, onClose }: ShareUserModalProps) {
  const [copied, setCopied] = useState(false);
  const { shareData, loading, error, generateLink, reset } = useShareUserAccess(
    user?.id ?? null,
  );

  useEffect(() => {
    if (isOpen && user) {
      void generateLink();
    } else {
      reset();
    }
  }, [generateLink, isOpen, reset, user]);

  const copyToClipboard = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Share Access</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-900">{user.name}</div>
              <div className="text-sm text-slate-500">
                {user.role.replace("_", " ").toUpperCase()}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Generate a secure, one-time login link to share access to this
              user&apos;s account. The link will expire in 1 hour.
            </p>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
                <p className="text-sm text-slate-500 font-medium">
                  Generating secure link...
                </p>
              </div>
            ) : shareData ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="relative">
                  <input
                    readOnly
                    value={shareData.shareUrl}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-600 focus:outline-none ring-sky-100 focus:ring-2"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-1.5 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check
                        className="h-5 w-5 text-green-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Anyone with this link can login as {user.name} until it
                  expires.
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Close
          </button>
          {shareData && (
            <button
              onClick={copyToClipboard}
              className="rounded-xl bg-[#FF6B4A] px-6 py-2.5 font-bold text-white hover:bg-[#e55a39] shadow-lg shadow-[#FDDDD6] transition active:scale-95"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
