"use client";

import {
  usePermissions,
  useRole,
  useRoleManagement,
  useRolePermissions,
  useRoles,
} from "@/hooks/useRBAC";
import { useAuth } from "@/lib/auth-context";
import * as rbacService from "@/services/rbacService";
import type { Permission, Role } from "@/types";
import { useMemo, useState } from "react";

type Feedback = {
  type: "success" | "error";
  text: string;
};

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function RoleEditor({
  role,
  onSave,
  onCancel,
  saving,
}: {
  role: Role;
  onSave: (payload: {
    name: string;
    description: string;
    isActive: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [isActive, setIsActive] = useState(role.isActive);

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          placeholder="Role name"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          placeholder="Description"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Active role
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ name, description, isActive })}
          disabled={saving}
          className="rounded-lg bg-[#FF6B4A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function RbacManagementPanel() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const { roles, loading: rolesLoading, refetch: refetchRoles } = useRoles();
  const {
    permissions,
    loading: permissionsLoading,
    refetch: refetchPermissions,
  } = usePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = useRole(selectedRoleId);
  const selectedRolePermissions = useRolePermissions(selectedRoleId);
  const roleMutations = useRoleManagement();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const [permissionMode, setPermissionMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(
    null,
  );
  const [permissionSaving, setPermissionSaving] = useState(false);

  const [permKey, setPermKey] = useState("");
  const [permLabel, setPermLabel] = useState("");
  const [permDescription, setPermDescription] = useState("");
  const [permCategory, setPermCategory] = useState("");

  const rolePermissionIdSet = useMemo(() => {
    return new Set(selectedRolePermissions.permissions.map((perm) => perm.id));
  }, [selectedRolePermissions.permissions]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>(
      (acc, permission) => {
        const category = permission.category || "General";
        if (!acc[category]) acc[category] = [];
        acc[category].push(permission);
        return acc;
      },
      {},
    );
  }, [permissions]);

  const resetPermissionForm = () => {
    setPermKey("");
    setPermLabel("");
    setPermDescription("");
    setPermCategory("");
    setEditingPermissionId(null);
    setPermissionMode("create");
  };

  const hydratePermissionForm = (permission: Permission) => {
    setPermissionMode("edit");
    setEditingPermissionId(permission.id);
    setPermKey(permission.key || "");
    setPermLabel(permission.label || "");
    setPermDescription(permission.description || "");
    setPermCategory(permission.category || "");
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setFeedback({ type: "error", text: "Role name is required." });
      return;
    }

    try {
      setCreatingRole(true);
      const created = await roleMutations.createRole(
        newRoleName.trim(),
        newRoleDescription.trim() || undefined,
      );
      setSelectedRoleId(created.id);
      setNewRoleName("");
      setNewRoleDescription("");
      setFeedback({ type: "success", text: "Role created successfully." });
      await refetchRoles();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create role.",
      });
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    const confirmed = confirm(`Delete role \"${role.name}\"?`);
    if (!confirmed) return;

    try {
      await roleMutations.deleteRole(role.id);
      if (selectedRoleId === role.id) {
        setSelectedRoleId(null);
      }
      setFeedback({ type: "success", text: "Role deleted successfully." });
      await refetchRoles();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete role.",
      });
    }
  };

  const handleSaveRole = async (
    roleId: string,
    payload: { name: string; description: string; isActive: boolean },
  ) => {
    try {
      await rbacService.updateRole(roleId, {
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
      });
      setFeedback({ type: "success", text: "Role updated successfully." });
      setEditingRoleId(null);
      await refetchRoles();
      if (selectedRoleId === roleId) {
        await selectedRole.refetch();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update role.",
      });
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;

    const selectedIds = permissions
      .filter((permission) => {
        const checkbox = document.getElementById(
          `perm-${permission.id}`,
        ) as HTMLInputElement | null;
        return checkbox?.checked;
      })
      .map((permission) => permission.id);

    try {
      await selectedRolePermissions.updatePermissions(selectedIds);
      setFeedback({
        type: "success",
        text: "Role permissions updated successfully.",
      });
      await selectedRolePermissions.refetch();
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update role permissions.",
      });
    }
  };

  const handleSavePermission = async () => {
    if (!permKey.trim() || !permLabel.trim()) {
      setFeedback({
        type: "error",
        text: "Permission key and label are required.",
      });
      return;
    }

    try {
      setPermissionSaving(true);
      if (permissionMode === "create") {
        await rbacService.createPermission({
          key: permKey.trim(),
          label: permLabel.trim(),
          description: permDescription.trim() || undefined,
          category: permCategory.trim() || undefined,
        });
        setFeedback({
          type: "success",
          text: "Permission created successfully.",
        });
      } else if (editingPermissionId) {
        await rbacService.updatePermission(editingPermissionId, {
          key: permKey.trim(),
          label: permLabel.trim(),
          description: permDescription.trim() || undefined,
          category: permCategory.trim() || undefined,
        });
        setFeedback({
          type: "success",
          text: "Permission updated successfully.",
        });
      }

      resetPermissionForm();
      await refetchPermissions();
      await selectedRolePermissions.refetch();
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to save permission.",
      });
    } finally {
      setPermissionSaving(false);
    }
  };

  const handleDeletePermission = async (permission: Permission) => {
    const confirmed = confirm(`Delete permission \"${permission.label}\"?`);
    if (!confirmed) return;

    try {
      await rbacService.deletePermission(permission.id);
      setFeedback({
        type: "success",
        text: "Permission deleted successfully.",
      });
      await refetchPermissions();
      await selectedRolePermissions.refetch();
    } catch (error) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete permission.",
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-medium text-amber-700">
        Only super admins can manage roles and permissions.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Roles</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage custom roles.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Role name"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <input
              value={newRoleDescription}
              onChange={(e) => setNewRoleDescription(e.target.value)}
              placeholder="Description"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="button"
              onClick={handleCreateRole}
              disabled={creatingRole || roleMutations.loading}
              className="rounded-xl bg-[#FF6B4A] px-4 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-60"
            >
              {creatingRole ? "Creating..." : "Add Role"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {rolesLoading ? (
              <p className="text-sm text-slate-500">Loading roles...</p>
            ) : roles.length === 0 ? (
              <EmptyState text="No roles found." />
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`text-left ${selectedRoleId === role.id ? "text-sky-700" : "text-slate-900"}`}
                    >
                      <p className="text-sm font-semibold">{role.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {role.description || "No description"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {role.isSystem
                          ? "System role"
                          : role.isActive
                            ? "Active"
                            : "Inactive"}
                      </p>
                    </button>
                    <div className="flex gap-2">
                      {!role.isSystem && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingRoleId(role.id)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingRoleId === role.id && (
                    <div className="mt-3">
                      <RoleEditor
                        role={role}
                        saving={roleMutations.loading}
                        onCancel={() => setEditingRoleId(null)}
                        onSave={(payload) => handleSaveRole(role.id, payload)}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            Permissions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create, update, and delete permission keys.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={permKey}
              onChange={(e) => setPermKey(e.target.value)}
              placeholder="Permission key (e.g. reports)"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <input
              value={permLabel}
              onChange={(e) => setPermLabel(e.target.value)}
              placeholder="Label"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <input
              value={permCategory}
              onChange={(e) => setPermCategory(e.target.value)}
              placeholder="Category"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <input
              value={permDescription}
              onChange={(e) => setPermDescription(e.target.value)}
              placeholder="Description"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSavePermission}
              disabled={permissionSaving}
              className="rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-60"
            >
              {permissionSaving
                ? "Saving..."
                : permissionMode === "create"
                  ? "Add Permission"
                  : "Update Permission"}
            </button>
            {permissionMode === "edit" && (
              <button
                type="button"
                onClick={resetPermissionForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
            {permissionsLoading ? (
              <p className="text-sm text-slate-500">Loading permissions...</p>
            ) : permissions.length === 0 ? (
              <EmptyState text="No permissions found." />
            ) : (
              permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {permission.label}
                    </p>
                    <p className="text-xs text-slate-500">{permission.key}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => hydratePermissionForm(permission)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePermission(permission)}
                      className="rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          Role Permission Mapping
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Assign permission access for the selected role.
        </p>

        {!selectedRoleId ? (
          <div className="mt-4">
            <EmptyState text="Select a role from the Roles section to manage permissions." />
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">
                Selected role: {selectedRole.role?.name || "Loading..."}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Toggle permissions and click Save Permissions to apply changes.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(groupedPermissions).length === 0 ? (
                <EmptyState text="No permissions available." />
              ) : (
                Object.entries(groupedPermissions).map(
                  ([category, categoryPerms]) => (
                    <div
                      key={category}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <h4 className="text-sm font-semibold text-slate-900">
                        {category}
                      </h4>
                      <div className="mt-2 space-y-2">
                        {categoryPerms.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <input
                              id={`perm-${permission.id}`}
                              type="checkbox"
                              defaultChecked={rolePermissionIdSet.has(
                                permission.id,
                              )}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300"
                            />
                            <span>
                              <span className="font-medium text-slate-800">
                                {permission.label}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {permission.key}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveRolePermissions}
              disabled={selectedRolePermissions.loading}
              className="mt-4 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-60"
            >
              {selectedRolePermissions.loading
                ? "Saving..."
                : "Save Permissions"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
