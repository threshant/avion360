"use client";

import { useState, useEffect } from "react";
import { useWarehouses } from "@/hooks/useWarehouses";
import type {
  Warehouse,
  CreateWarehousePayload,
  UpdateWarehousePayload,
} from "@/types/warehouse";

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateWarehousePayload) => Promise<void>;
  isLoading: boolean;
}

export function AddWarehouseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: AddWarehouseModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, location });
    setName("");
    setLocation("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add New Warehouse</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Warehouse Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., North Warehouse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Delhi, India"
            />
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
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WarehouseList() {
  const { warehouses, total, isLoading, error, load, create, remove } =
    useWarehouses();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    load(searchTerm);
  }, [searchTerm, load]);

  const handleCreate = async (payload: CreateWarehousePayload) => {
    setIsSubmitting(true);
    try {
      await create(payload);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this warehouse?")) {
      await remove(id);
    }
  };

  if (isLoading && warehouses.length === 0) {
    return <div className="text-center py-8">Loading warehouses...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Warehouses</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#FF6B4A] text-white rounded-md hover:bg-[#e55a39]"
        >
          + Add Warehouse
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
          placeholder="Search warehouses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4">
        {warehouses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No warehouses found
          </div>
        ) : (
          warehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{warehouse.name}</h3>
                  {warehouse.location && (
                    <p className="text-gray-600 text-sm">
                      {warehouse.location}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Created:{" "}
                    {new Date(warehouse.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(warehouse.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddWarehouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {total > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Total: {total} warehouse{total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
