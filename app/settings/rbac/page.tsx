"use client";

import React, { useState, useCallback } from "react";
import {
  useRoles,
  usePermissions,
  useRole,
  useRolePermissions,
  useRoleManagement,
} from "@/hooks/useRBAC";
import type { Role, Permission, RoleWithPermissions } from "@/types";
import * as rbacService from "@/services/rbacService";

/**
 * RBAC Management Page - Super Admin Only
 * Allows management of roles and role-to-permission assignments
 */
export default function RBACManagementPage() {
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useRoles();
  const { permissions, loading: permsLoading } = usePermissions();
  const { createRole: createRoleAPI, updateRole: updateRoleAPI } =
    useRoleManagement();

  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [permissionsByCategory, setPermissionsByCategory] = useState<
    Record<string, Permission[]>
  >({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(
    null,
  );

  // Organize permissions by category
  React.useEffect(() => {
    if (permissions.length > 0) {
      const byCategory: Record<string, Permission[]> = {};
      permissions.forEach((perm) => {
        const category = perm.category || "Other";
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(perm);
      });
      setPermissionsByCategory(byCategory);
    }
  }, [permissions]);

  // Update selected permissions when role changes
  React.useEffect(() => {
    if (selectedRole) {
      const permIds: Set<string> = new Set(
        selectedRole.permissions.map((p: Permission) => p.id),
      );
      setSelectedPermissions(permIds);
    }
  }, [selectedRole]);

  const handleSelectRole = (role: Role) => {
    const roleWithPerms = roles.find((r) => r.id === role.id) as
      | RoleWithPermissions
      | undefined;
    if (roleWithPerms) {
      setSelectedRole(roleWithPerms);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setMessage({ type: "error", text: "Role name is required" });
      return;
    }

    try {
      setIsUpdating(true);
      await createRoleAPI(newRoleName, newRoleDesc || undefined);
      setMessage({ type: "success", text: "Role created successfully" });
      setNewRoleName("");
      setNewRoleDesc("");
      setShowCreateForm(false);
      await refetchRoles();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create role",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    try {
      setIsUpdating(true);
      const permissionIds = Array.from(selectedPermissions);
      await rbacService.updateRolePermissions(selectedRole.id, {
        roleId: selectedRole.id,
        permissionIds,
      });
      setMessage({ type: "success", text: "Permissions updated successfully" });
      await refetchRoles();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update permissions",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Role-Based Access Control
          </h1>
          <p className="text-slate-600 mt-2">
            Manage roles and assign permissions to users
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Roles</h2>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-3 py-1 bg-[#FF6B4A] text-white rounded hover:bg-[#e55a39] transition text-sm"
                >
                  + New Role
                </button>
              </div>

              {/* Create Role Form */}
              {showCreateForm && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Role name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded mb-2 text-sm"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded mb-2 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRole}
                      disabled={isUpdating}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm disabled:bg-gray-400"
                    >
                      {isUpdating ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-3 py-2 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Roles List */}
              {rolesLoading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading...
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => handleSelectRole(role)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedRole?.id === role.id
                          ? "bg-[#FF6B4A] text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                      }`}
                    >
                      <div className="font-medium">{role.name}</div>
                      {role.description && (
                        <div className="text-xs opacity-75">
                          {role.description}
                        </div>
                      )}
                      {role.isSystem && (
                        <div className="text-xs opacity-75">(System role)</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Permissions Assignment */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  {selectedRole.name}
                </h2>
                {selectedRole.description && (
                  <p className="text-slate-600 text-sm mb-4">
                    {selectedRole.description}
                  </p>
                )}

                {selectedRole.isSystem && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                    This is a system role. Some settings cannot be modified.
                  </div>
                )}

                {/* Permissions by Category */}
                {permsLoading ? (
                  <div className="text-center py-8 text-slate-500">
                    Loading permissions...
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionsByCategory)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([category, categoryPerms]) => (
                        <div key={category}>
                          <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide mb-3">
                            {category}
                          </h3>
                          <div className="space-y-2">
                            {categoryPerms.map((perm) => (
                              <label
                                key={perm.id}
                                className="flex items-center p-3 hover:bg-slate-50 rounded cursor-pointer transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.has(perm.id)}
                                  onChange={() =>
                                    handlePermissionToggle(perm.id)
                                  }
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <div className="ml-3 flex-1">
                                  <div className="font-medium text-slate-900">
                                    {perm.label}
                                  </div>
                                  {perm.description && (
                                    <div className="text-xs text-slate-600">
                                      {perm.description}
                                    </div>
                                  )}
                                </div>
                                {perm.icon && (
                                  <span className="text-slate-400 text-sm">
                                    {perm.icon}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={handleSavePermissions}
                    disabled={isUpdating || selectedRole.isSystem}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:bg-gray-400"
                  >
                    {isUpdating ? "Saving..." : "Save Permissions"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-slate-500">
                  Select a role to view and manage permissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
