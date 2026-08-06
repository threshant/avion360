"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { useStaff } from "@/hooks/useStaff";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { CreateStaffPayload, UpdateStaffPayload } from "@/types/warehouse";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function StaffCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <SkeletonBox className="h-5 w-40 rounded-lg" />
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-4 w-28 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-8 w-20 rounded-xl" />
          <SkeletonBox className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Staff Modal ──────────────────────────────────────────────────────────────

function StaffModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isLoading,
  warehouses,
}: {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: any;
  onClose: () => void;
  onSubmit: (payload: CreateStaffPayload | UpdateStaffPayload) => Promise<void>;
  isLoading: boolean;
  warehouses: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && mode === "edit" && initialData) {
      setName(initialData.name || "");
      setWarehouseId(initialData.warehouseId || "");
    } else if (isOpen && mode === "add") {
      setName("");
      setWarehouseId("");
    }
    setError("");
  }, [isOpen, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      await onSubmit({ name, warehouseId: warehouseId || undefined });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save staff member",
      );
    }
  };

  if (!isOpen) return null;

  const isAdding = mode === "add";
  const title = isAdding ? "Add New Staff Member" : "Edit Staff Member";
  const desc = isAdding
    ? "Create a new staff member record"
    : "Update staff member details";
  const btnText = isAdding ? "Add Staff" : "Update Staff";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              placeholder="e.g., John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Assigned Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              <option value="">Select a warehouse (optional)</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-50"
            >
              {isLoading ? (isAdding ? "Adding..." : "Updating...") : btnText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-teal-500",
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

function StaffCard({
  staff,
  warehouseName,
  onEdit,
  onDelete,
}: {
  staff: any;
  warehouseName?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const index = staff.id.charCodeAt(0) % avatarColors.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${getAvatarColor(index)}`}
        >
          {getInitials(staff.name)}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900">{staff.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {warehouseName ? `📦 ${warehouseName}` : "No warehouse assigned"}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">ID: {staff.id}</p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Page ───────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { staff, isLoading, error, load, create, update, remove } = useStaff();
  const { warehouses, load: loadWarehouses } = useWarehouses();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    load(searchTerm);
    loadWarehouses();
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: any) => {
    setModalMode("edit");
    setEditingStaff(member);
    setIsModalOpen(true);
  };

  const handleSubmit = async (
    payload: CreateStaffPayload | UpdateStaffPayload,
  ) => {
    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await create(payload as CreateStaffPayload);
      } else if (editingStaff) {
        await update(editingStaff.id, payload as UpdateStaffPayload);
      }
      await load(searchTerm);
      setIsModalOpen(false);
      setEditingStaff(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      await remove(id);
      await load(searchTerm);
    }
  };

  const warehouseMap = Object.fromEntries(
    warehouses.map((w) => [w.id, w.name]),
  );

  return (
    <CrmShell activeNav="Employees">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Staff Members" subtitle="Manage your team and staff assignments" onRefresh={() => load(searchTerm)}>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 font-semibold text-sky-600 transition hover:bg-sky-100"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add Staff Member
          </button>
        </PageHeader>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder="Search staff by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Staff list */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <StaffCardSkeleton />
              <StaffCardSkeleton />
              <StaffCardSkeleton />
            </>
          ) : staff && staff.length > 0 ? (
            staff.map((member: any) => (
              <StaffCard
                key={member.id}
                staff={member}
                warehouseName={
                  member.warehouseId
                    ? warehouseMap[member.warehouseId]
                    : undefined
                }
                onEdit={() => handleOpenEditModal(member)}
                onDelete={() => handleDeleteStaff(member.id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
              <Users
                className="mx-auto h-12 w-12 text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-4 font-semibold text-slate-600">
                No staff members found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first staff member to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <StaffModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingStaff}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        warehouses={warehouses}
      />
    </CrmShell>
  );
}
