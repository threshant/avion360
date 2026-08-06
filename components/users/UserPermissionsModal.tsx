"use client";

import { useUserPermissionsData } from "@/hooks/useUserManagement";
import type { UserWithPermissions } from "@/types";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface UserPermissionsModalProps {
  isOpen: boolean;
  user: UserWithPermissions | null;
  onClose: () => void;
  onSave: () => void;
}

interface PermissionItem {
  id: string;
  key: string;
  label: string;
  category: string;
  hasAccess: boolean;
}

export function UserPermissionsModal({
  isOpen,
  user,
  onClose,
  onSave,
}: UserPermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [permissionsByCategory, setPermissionsByCategory] = useState<
    Record<string, PermissionItem[]>
  >({});
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const {
    permissions,
    loading: isLoading,
    error,
    savePermissions,
  } = useUserPermissionsData(user?.id ?? null, isOpen && Boolean(user));

  useEffect(() => {
    if (!permissions.length) {
      setSelectedPermissions(new Set());
      setPermissionsByCategory({});
      return;
    }

    const selected = new Set<string>();
    const byCategory: Record<string, PermissionItem[]> = {};
    const selectedPerms: string[] = [];

    permissions.forEach((perm: PermissionItem) => {
      if (perm.hasAccess) {
        selected.add(perm.id);
        selectedPerms.push(perm.key);
      }
      const category = perm.category || "Other";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(perm);
    });

    console.log("Loaded permissions for user:", {
      userId: user?.id,
      userName: user?.email,
      totalPermissions: permissions.length,
      grantedPermissions: selectedPerms,
      grantedCount: selected.size,
    });

    setSelectedPermissions(selected);
    setPermissionsByCategory(byCategory);
  }, [permissions, user?.email, user?.id]);

  useEffect(() => {
    if (!error) {
      return;
    }

    setNotification({
      type: "error",
      message: `Failed to load permissions: ${error}`,
    });
  }, [error]);

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSavePermissions = async () => {
    try {
      setIsSaving(true);
      const permIds = Array.from(selectedPermissions);
      const selectedPermDetails = permissions
        .filter((p: PermissionItem) => permIds.includes(p.id))
        .map((p: PermissionItem) => p.key);

      console.log("Saving permissions for user:", {
        userId: user!.id,
        userName: user!.email,
        permissionsCount: permIds.length,
        permissionIds: permIds,
        permissionKeys: selectedPermDetails,
      });

      await savePermissions({
        userId: user!.id,
        permissionIds: permIds,
      });

      const updatedPermDetails = permissions
        .filter((p: PermissionItem) => permIds.includes(p.id))
        .map((p: PermissionItem) => p.key);

      console.log("Permissions saved successfully:", {
        userId: user!.id,
        savedPermissionsCount: permIds.length,
        savedPermissionKeys: updatedPermDetails,
      });

      setNotification({
        type: "success",
        message: "Permissions updated successfully",
      });
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error saving permissions:", error);
      setNotification({
        type: "error",
        message: "Failed to save permissions",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Manage Permissions
              </h3>
              <p className="text-sm text-slate-600">{user.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="divide-y divide-slate-200 p-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((categoryIndex) => (
                <div key={categoryIndex} className="space-y-3">
                  {/* Category title shimmer */}
                  <div className="h-5 w-24 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />

                  {/* Permission items shimmer */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex items-center gap-3 rounded-lg p-3"
                      >
                        {/* Checkbox shimmer */}
                        <div className="h-4 w-4 rounded border border-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer flex-shrink-0" />

                        {/* Text shimmer */}
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                          <div className="h-3 w-1/2 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(permissionsByCategory).length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No permissions available
            </div>
          ) : (
            Object.entries(permissionsByCategory).map(
              ([category, categoryPermissions]) => (
                <div
                  key={category}
                  className="space-y-3 py-4 first:pt-0 last:pb-0"
                >
                  <h4 className="font-semibold text-slate-900">{category}</h4>
                  <div className="space-y-2">
                    {categoryPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(permission.id)}
                          onChange={() => handleTogglePermission(permission.id)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">
                            {permission.label}
                          </div>
                          <div className="text-xs text-slate-500">
                            {permission.key}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white p-6">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={isSaving}
              className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-semibold text-white hover:bg-[#e55a39] transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Permissions"}
            </button>
          </div>
        </div>

        {/* Notification Modal */}
        {notification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className={`w-full max-w-sm rounded-xl shadow-2xl p-6 ${
                notification.type === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-4">
                {notification.type === "success" ? (
                  <div className="flex-shrink-0">
                    <CheckCircle2
                      className="h-6 w-6 text-green-600"
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <XCircle
                      className="h-6 w-6 text-red-600"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h3
                    className={`text-sm font-semibold ${
                      notification.type === "success"
                        ? "text-green-900"
                        : "text-red-900"
                    }`}
                  >
                    {notification.type === "success" ? "Success" : "Error"}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      notification.type === "success"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {notification.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`mt-4 w-full rounded-lg px-4 py-2 font-semibold text-white transition ${
                  notification.type === "success"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
