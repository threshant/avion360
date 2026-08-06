"use client";

import type { CreateUserPayload } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import React, { useState } from "react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (payload: CreateUserPayload) => Promise<unknown>;
  onUserCreated: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "admin" | "team_lead" | "employee";
  phone: string;
  telecmiUserId: string;
  designation: string;
  department: string;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onCreateUser,
  onUserCreated,
}: CreateUserModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    phone: "",
    telecmiUserId: "",
    designation: "",
    department: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts editing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        telecmi_user_id: formData.telecmiUserId || undefined,
        designation: formData.designation || undefined,
        department: formData.department || undefined,
      });

      alert("User created successfully");
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "employee",
        phone: "",
        telecmiUserId: "",
        designation: "",
        department: "",
      });
      onUserCreated();
      onClose();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Create New User</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className={`mt-2 w-full rounded-lg border px-4 py-2.5 transition focus:outline-none focus:ring-2 ${
                errors.name
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-300 focus:ring-sky-200"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              className={`mt-2 w-full rounded-lg border px-4 py-2.5 transition focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-red-300 focus:ring-red-200"
                  : "border-slate-300 focus:ring-sky-200"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••"
                className={`mt-2 w-full rounded-lg border px-4 py-2.5 transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-300 focus:ring-red-200"
                    : "border-slate-300 focus:ring-sky-200"
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••"
                className={`mt-2 w-full rounded-lg border px-4 py-2.5 transition focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? "border-red-300 focus:ring-red-200"
                    : "border-slate-300 focus:ring-sky-200"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="employee">Employee</option>
              <option value="team_lead">Team Lead</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* TeleCMI User ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              TeleCMI User ID (Optional)
            </label>
            <input
              type="text"
              name="telecmiUserId"
              value={formData.telecmiUserId}
              onChange={handleInputChange}
              placeholder="e.g. 1001_1111112"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Phone (Optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 000-0000"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {/* Designation */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Designation (Optional)
            </label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              placeholder="Sales Executive"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Department (Optional)
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              placeholder="Sales"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-semibold text-white hover:bg-[#e55a39] transition disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
