"use client";

import CrmShell from "@/components/layout/CrmShell";
import { useWarehouses } from "@/hooks/useWarehouses";
import type {
  CreateWarehousePayload,
  UpdateWarehousePayload,
} from "@/types/warehouse";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function WarehouseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <SkeletonBox className="h-5 w-40 rounded-lg" />
          <SkeletonBox className="mt-3 h-4 w-32 rounded-md" />
          <SkeletonBox className="mt-3 h-4 w-28 rounded-md" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-8 w-20 rounded-xl" />
          <SkeletonBox className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Warehouse Modal ────────────────────────────────────────────────

function WarehouseModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  mode: "add" | "edit";
  initialData?: any;
  onClose: () => void;
  onSubmit: (
    payload: CreateWarehousePayload | UpdateWarehousePayload,
  ) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && mode === "edit" && initialData) {
      setName(initialData.name || "");
      setLocation(initialData.location || "");
    } else if (isOpen && mode === "add") {
      setName("");
      setLocation("");
    }
    setError("");
  }, [isOpen, mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Warehouse name is required");
      return;
    }

    try {
      await onSubmit({ name, location });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save warehouse");
    }
  };

  const isAdding = mode === "add";
  const title = isAdding ? "Create New Warehouse" : "Edit Warehouse";
  const desc = isAdding
    ? "Add a new warehouse to your inventory system"
    : "Update warehouse details";
  const btnText = isAdding ? "Create" : "Update";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{desc}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Warehouse Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              placeholder="e.g., North Warehouse"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
              placeholder="e.g., Delhi, India"
            />
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
              {isLoading ? (isAdding ? "Creating..." : "Updating...") : btnText}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Warehouse Card ───────────────────────────────────────────────────────────

const warehouseIcons = ["📦", "🏢", "🏭", "🏗️", "⚙️"];

function getWarehouseIcon(index: number): string {
  return warehouseIcons[index % warehouseIcons.length];
}

function WarehouseCard({
  warehouse,
  index,
  onEdit,
  onDelete,
}: {
  warehouse: any;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
            {getWarehouseIcon(index)}
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900">
              {warehouse.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {warehouse.location || "No location specified"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">ID: {warehouse.id}</p>
          </div>
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

// ─── Warehouse Page ───────────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { warehouses, isLoading, error, load, create, update, remove } =
    useWarehouses();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    load(searchTerm);
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingWarehouse(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (warehouse: any) => {
    setModalMode("edit");
    setEditingWarehouse(warehouse);
    setIsModalOpen(true);
  };

  const handleSubmit = async (
    payload: CreateWarehousePayload | UpdateWarehousePayload,
  ) => {
    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await create(payload as CreateWarehousePayload);
      } else if (editingWarehouse) {
        await update(editingWarehouse.id, payload as UpdateWarehousePayload);
      }
      await load(searchTerm);
      setIsModalOpen(false);
      setEditingWarehouse(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (confirm("Are you sure you want to delete this warehouse?")) {
      await remove(id);
      await load(searchTerm);
    }
  };

  return (
    <CrmShell activeNav="Warehouse">
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Warehouses</h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage your warehouse locations and inventory centers
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 font-semibold text-sky-600 transition hover:bg-sky-100"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Add Warehouse
            </button>
          </div>
        </section>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="text"
            placeholder="Search warehouses by name or location..."
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

        {/* Warehouse list */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <WarehouseCardSkeleton />
              <WarehouseCardSkeleton />
              <WarehouseCardSkeleton />
            </>
          ) : warehouses && warehouses.length > 0 ? (
            warehouses.map((warehouse: any, index: number) => (
              <WarehouseCard
                key={warehouse.id}
                warehouse={warehouse}
                index={index}
                onEdit={() => handleOpenEditModal(warehouse)}
                onDelete={() => handleDeleteWarehouse(warehouse.id)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
              <Building2
                className="mx-auto h-12 w-12 text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-4 font-semibold text-slate-600">
                No warehouses found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first warehouse to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <WarehouseModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editingWarehouse}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWarehouse(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </CrmShell>
  );
}
