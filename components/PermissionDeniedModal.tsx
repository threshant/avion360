"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

interface PermissionDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPermission?: string;
}

export function PermissionDeniedModal({
  isOpen,
  onClose,
  featureName = "This feature",
  requiredPermission = "required permission",
}: PermissionDeniedModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all duration-200">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Icon */}
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle
                className="h-8 w-8 text-red-600"
                aria-hidden="true"
              />
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-xl font-bold text-slate-900">
              Access Denied
            </h2>

            {/* Message */}
            <p className="mb-6 text-center text-slate-600">
              {featureName} requires{" "}
              <span className="font-semibold text-slate-900">
                {requiredPermission}
              </span>
              . Please contact your administrator to request access.
            </p>

            {/* Action Button */}
            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#e55a39] py-3 font-semibold text-white transition hover:from-[#e55a39] hover:to-[#d44a2d] active:scale-95"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
