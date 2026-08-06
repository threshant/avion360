"use client";

import type { UserWithPermissions } from "@/types";
import { useState } from "react";

interface UsersListProps {
  users: UserWithPermissions[];
  onRefresh: () => Promise<unknown> | unknown;
  onToggleUserActive: (user: UserWithPermissions) => Promise<unknown>;
  onViewProfile: (user: UserWithPermissions) => void;
  onEditPermissions: (user: UserWithPermissions) => void;
  onChangeRole: (user: UserWithPermissions) => void;
  onDeleteUser: (userId: string) => void;
  onShareUser: (user: UserWithPermissions) => void;
}

export function UsersList({
  users,
  onRefresh,
  onToggleUserActive,
  onViewProfile,
  onEditPermissions,
  onChangeRole,
  onDeleteUser,
  onShareUser,
}: UsersListProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

  const handleDeactivateUser = async (userId: string) => {
    try {
      setIsDeactivating(userId);
      const user = users.find((u) => u.id === userId);
      if (user) {
        await onToggleUserActive(user);
        onRefresh();
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert("Failed to update user status");
    } finally {
      setIsDeactivating(null);
    }
  };

  const getRoleBadgeColor = (
    role: string,
  ):
    | "bg-red-100 text-red-800"
    | "bg-blue-100 text-blue-800"
    | "bg-purple-100 text-purple-800"
    | "bg-gray-100 text-gray-800" => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "team_lead":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Role
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Department
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                  selectedUser === user.id ? "bg-sky-50" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <button
                    onClick={() => onViewProfile(user)}
                    className="font-medium text-slate-900 transition hover:text-sky-700 hover:underline"
                    title="Open user profile"
                  >
                    {user.name}
                  </button>
                  <div className="text-sm text-slate-500">
                    {user.designation}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeColor(
                      user.role,
                    )}`}
                  >
                    {user.role.replace("_", " ").toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.department || "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      user.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onViewProfile(user)}
                      className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200"
                      title="Open full profile"
                    >
                      Profile
                    </button>
                    {user.role === "new_user" && (
                      <button
                        onClick={() => {
                          setSelectedUser(user.id);
                          onEditPermissions(user);
                        }}
                        title="This user needs a role change before permissions can be assigned"
                        disabled
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                      >
                        Permissions
                      </button>
                    )}
                    {user.role !== "new_user" && (
                      <button
                        onClick={() => {
                          setSelectedUser(user.id);
                          onEditPermissions(user);
                        }}
                        className="rounded-lg bg-[#FFF1EE] px-3 py-1.5 text-xs font-semibold text-[#FF6B4A] hover:bg-[#FDDDD6] transition"
                      >
                        Permissions
                      </button>
                    )}
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      disabled={isDeactivating === user.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        user.is_active
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      } disabled:opacity-50`}
                    >
                      {isDeactivating === user.id
                        ? "Updating..."
                        : user.is_active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user.id);
                        onChangeRole(user);
                      }}
                      className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-200 transition"
                      title="Change user role"
                    >
                      Change Role
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user.id);
                        onShareUser(user);
                      }}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition"
                      title="Share access link"
                    >
                      Share
                    </button>
                    {user.role !== "super_admin" && (
                      <button
                        onClick={() => onDeleteUser(user.id)}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-12">
          <p className="text-slate-500">No users found</p>
        </div>
      )}
    </div>
  );
}
