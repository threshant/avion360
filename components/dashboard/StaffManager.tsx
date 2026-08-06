"use client";

import { useState, useEffect } from "react";
import { useStaff } from "@/hooks/useStaff";
import { useWarehouses } from "@/hooks/useWarehouses";
import type {
  Staff,
  CreateStaffPayload,
  UpdateStaffPayload,
} from "@/types/warehouse";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStaffPayload) => Promise<void>;
  isLoading: boolean;
  warehouses: { id: string; name: string }[];
}

export function AddStaffModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  warehouses,
}: AddStaffModalProps) {
  const [name, setName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, warehouseId: warehouseId || undefined });
    setName("");
    setWarehouseId("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Staff Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Assigned Warehouse
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#FF6B4A] text-white rounded-md hover:bg-[#e55a39] disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function StaffList() {
  const { staff, total, isLoading, error, load, create, remove } = useStaff();
  const { warehouses, load: loadWarehouses } = useWarehouses();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  useEffect(() => {
    load(searchTerm);
  }, [searchTerm, load]);

  const handleCreate = async (payload: CreateStaffPayload) => {
    setIsSubmitting(true);
    try {
      await create(payload);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      await remove(id);
    }
  };

  const getWarehouseName = (warehouseId?: string) => {
    return warehouses.find((w) => w.id === warehouseId)?.name || "Unassigned";
  };

  if (isLoading && staff.length === 0) {
    return <div className="text-center py-8">Loading staff...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#FF6B4A] text-white rounded-md hover:bg-[#e55a39]"
        >
          + Add Staff
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">
                Assigned Warehouse
              </th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No staff members found
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">{member.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {getWarehouseName(member.warehouseId)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddStaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
        warehouses={warehouses}
      />

      {total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Total: {total} staff member{total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
