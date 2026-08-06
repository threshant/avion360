"use client";

import { ApiError } from "@/services/apiClient";
import { createAviontiveLead } from "@/services/leadService";
import { ChevronDown, Download, Upload, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type LeadFormState = {
  customerName: string;
  phoneNumber: string;
  emailId: string;
  serviceRequired: string;
};

type AddNewLeadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated?: () => void;
};

const initialLeadForm: LeadFormState = {
  customerName: "",
  phoneNumber: "",
  emailId: "",
  serviceRequired: "",
};

export default function AddNewLeadModal({
  isOpen,
  onClose,
  onLeadCreated,
}: AddNewLeadModalProps) {
  const [leadForm, setLeadForm] = useState<LeadFormState>(initialLeadForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  function resetLeadForm() {
    setLeadForm(initialLeadForm);
    setSubmitError(null);
  }

  function handleLeadInputChange(field: keyof LeadFormState, value: string) {
    setLeadForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    const payload = {
      title: leadForm.customerName.trim(),
      source: "manual",
      notes: `Service Required: ${leadForm.serviceRequired}`,
      service_required: leadForm.serviceRequired,
      contact: {
        full_name: leadForm.customerName.trim(),
        email: leadForm.emailId.trim() || undefined,
        phone: leadForm.phoneNumber.trim(),
      },
    };
    console.log("[AddNewLeadModal] Submitting lead payload", payload);

    try {
      const created = await createAviontiveLead(payload);
      console.log("[AddNewLeadModal] Lead created successfully", created);

      onLeadCreated?.();
      onClose();
      resetLeadForm();
    } catch (error) {
      console.error("[AddNewLeadModal] Lead creation failed", error);
      if (error instanceof ApiError) {
        setSubmitError(error.getUserFriendlyMessage());
      } else {
        setSubmitError("Failed to create lead. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add New Lead"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">
              Add New Lead
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create a new lead manually or import from Excel
            </p>
          </div>
          <button
            type="button"
            aria-label="Close add new lead popup"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <Upload className="h-5 w-5" aria-hidden="true" />
            Import from Excel
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
            Export to CSV
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <form className="space-y-3" onSubmit={handleCreateLead}>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={leadForm.customerName}
                onChange={(event) =>
                  handleLeadInputChange("customerName", event.target.value)
                }
                placeholder="Enter customer name"
                className="h-10 w-full rounded-xl border border-transparent bg-slate-100 px-3.5 text-sm text-slate-800 outline-none ring-sky-200 transition focus:border-sky-200 focus:bg-white focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={leadForm.phoneNumber}
                onChange={(event) =>
                  handleLeadInputChange("phoneNumber", event.target.value)
                }
                placeholder="+91 XXXXX XXXXX"
                className="h-10 w-full rounded-xl border border-transparent bg-slate-100 px-3.5 text-sm text-slate-800 outline-none ring-sky-200 transition focus:border-sky-200 focus:bg-white focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">
                Email ID
              </label>
              <input
                type="email"
                value={leadForm.emailId}
                onChange={(event) =>
                  handleLeadInputChange("emailId", event.target.value)
                }
                placeholder="customer@example.com"
                className="h-10 w-full rounded-xl border border-transparent bg-slate-100 px-3.5 text-sm text-slate-800 outline-none ring-sky-200 transition focus:border-sky-200 focus:bg-white focus:ring-2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-900">
                Service Required <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={leadForm.serviceRequired}
                  onChange={(event) =>
                    handleLeadInputChange("serviceRequired", event.target.value)
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-transparent bg-slate-100 px-3.5 pr-10 text-sm text-slate-700 outline-none ring-sky-200 transition focus:border-sky-200 focus:bg-white focus:ring-2"
                >
                  <option value="" disabled>
                    Select service
                  </option>
                  <option value="freight-forwarding">Freight Forwarding</option>
                  <option value="warehousing">Warehousing</option>
                  <option value="custom-clearance">Custom Clearance</option>
                  <option value="sourcing">Sourcing</option>
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#e55a39] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Creating..." : "Create Lead"}
              </button>
              <button
                type="button"
                onClick={resetLeadForm}
                disabled={isSubmitting}
                className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Clear Form
              </button>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {submitError}
              </div>
            ) : null}

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
              <p>
                <span className="font-semibold">Import Note:</span> When
                importing from Excel, ensure your file has columns for
                &quot;Phone Number&quot; and &quot;Email ID&quot;. The system
                will automatically link contacts based on these fields.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
