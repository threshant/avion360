"use client";

import React, { useState } from "react";
import type { UserWithPermissions } from "@/types";

interface ChangeUserRoleModalProps {
  user: UserWithPermissions;
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged: () => void;
}

const AVAILABLE_ROLES = [
  {
    id: "new_user",
    label: "New User",
    description: "No permissions (awaiting approval)",
  },
  { id: "employee", label: "Employee", description: "Standard access" },
  {
    id: "team_lead",
    label: "Team Lead",
    description: "Team management access",
  },
  { id: "admin", label: "Admin", description: "Administrative access" },
  {
    id: "super_admin",
    label: "Super Admin",
    description: "Full system access",
  },
];

export function ChangeUserRoleModal({
  user,
  isOpen,
  onClose,
  onRoleChanged,
}: ChangeUserRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangeRole = async () => {
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update role");
      }

      onRoleChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Change User Role</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign a new role to{" "}
            <span className="font-semibold">{user.name}</span>
          </p>
        </div>

        <div className="space-y-4 px-6 py-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {AVAILABLE_ROLES.map((role) => (
              <label
                key={role.id}
                className="flex gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer transition hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  checked={selectedRole === role.id}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{role.label}</p>
                  <p className="text-xs text-slate-500">{role.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleChangeRole}
            disabled={isLoading || selectedRole === user.role}
            className="flex-1 rounded-lg bg-[#FF6B4A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e55a39] disabled:opacity-50"
          >
            {isLoading ? "Updating..." : "Update Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
