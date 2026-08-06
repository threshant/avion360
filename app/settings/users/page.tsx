"use client";

import CrmShell from "@/components/layout/CrmShell";
import { ChangeUserRoleModal } from "@/components/users/ChangeUserRoleModal";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { ShareUserModal } from "@/components/users/ShareUserModal";
import { UserPermissionsModal } from "@/components/users/UserPermissionsModal";
import { UsersList } from "@/components/users/UsersList";
import { useUsers } from "@/hooks/useUserManagement";
import { useAuth } from "@/lib/auth-context";
import type { UserWithPermissions } from "@/types";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Users Management Page - Super Admin Only
 * Manage all users, their permissions, and create new users
 */
export default function UsersManagementPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(
    null,
  );
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const isSuperAdmin = isAuthenticated && user?.role === "super_admin";
  const {
    users,
    pagination,
    loading,
    error,
    refetch,
    createUser,
    deleteUser,
    toggleUserActive,
  } = useUsers(page, limit, isSuperAdmin);
  const total = pagination.total;
  const effectiveMessage =
    message ?? (error ? { type: "error", text: error } : null);

  // Check authorization
  useEffect(() => {
    if (isAuthenticated && user?.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  // Filter users based on search and role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleEditPermissions = (userToEdit: UserWithPermissions) => {
    setSelectedUser(userToEdit);
    setIsPermissionsModalOpen(true);
  };

  const handleChangeRole = (userToEdit: UserWithPermissions) => {
    setSelectedUser(userToEdit);
    setIsChangeRoleModalOpen(true);
  };

  const handleViewProfile = (profileUser: UserWithPermissions) => {
    router.push(`/settings/users/${profileUser.id}`);
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      try {
        await deleteUser(userId);
        setMessage({
          type: "success",
          text: "User deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        setMessage({
          type: "error",
          text: "Failed to delete user",
        });
      }
    }
  };
  const handleShareUser = (userToShare: UserWithPermissions) => {
    setSelectedUser(userToShare);
    setIsShareModalOpen(true);
  };

  const handleUserCreated = async () => {
    await refetch();
    setMessage({
      type: "success",
      text: "User created successfully",
    });
  };

  const handlePermissionsSaved = async () => {
    await refetch();
    setMessage({
      type: "success",
      text: "Permissions updated successfully",
    });
  };

  if (!isAuthenticated || user?.role !== "super_admin") {
    return null;
  }

  return (
    <CrmShell activeNav="Users">
      <div className="relative z-10 min-h-screen flex-1 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              Staff Directory
            </h1>
            <p className="text-slate-600">
              Each user is treated as staff. Manage details, access, and
              compensation.
            </p>
          </div>

          {/* Messages */}
          {effectiveMessage && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                effectiveMessage.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {effectiveMessage.text}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="team_lead">Team Lead</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF6B4A] px-4 py-2.5 font-semibold text-white hover:bg-[#e55a39] transition whitespace-nowrap"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Create User
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">{total}</div>
              <div className="text-sm text-slate-600">Total Users</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">
                {users.filter((u) => u.is_active).length}
              </div>
              <div className="text-sm text-slate-600">Active Users</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <div className="text-sm text-slate-600">Admins</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="text-3xl font-bold text-slate-900">
                {users.filter((u) => u.role === "super_admin").length}
              </div>
              <div className="text-sm text-slate-600">Super Admins</div>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mb-4 text-slate-600">Loading users...</div>
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    All Users
                    <span className="ml-2 text-sm font-normal text-slate-600">
                      (showing {filteredUsers.length} of {total})
                    </span>
                  </h2>
                </div>
                <UsersList
                  users={filteredUsers}
                  onRefresh={refetch}
                  onToggleUserActive={toggleUserActive}
                  onViewProfile={handleViewProfile}
                  onEditPermissions={handleEditPermissions}
                  onChangeRole={handleChangeRole}
                  onDeleteUser={handleDeleteUser}
                  onShareUser={handleShareUser}
                />

                {/* Pagination controls */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-slate-600">Page {page}</span>
                    <button
                      disabled={page >= Math.ceil(total / limit)}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Per page</label>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UserPermissionsModal
        isOpen={isPermissionsModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handlePermissionsSaved}
      />

      {selectedUser && (
        <ChangeUserRoleModal
          user={selectedUser}
          isOpen={isChangeRoleModalOpen}
          onClose={() => {
            setIsChangeRoleModalOpen(false);
            setSelectedUser(null);
          }}
          onRoleChanged={async () => {
            await refetch();
            setIsChangeRoleModalOpen(false);
            setSelectedUser(null);
            setMessage({
              type: "success",
              text: "User role updated successfully",
            });
          }}
        />
      )}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onCreateUser={createUser}
        onUserCreated={handleUserCreated}
      />

      <ShareUserModal
        isOpen={isShareModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedUser(null);
        }}
      />
    </CrmShell>
  );
}
