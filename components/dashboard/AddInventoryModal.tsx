"use client";

import { useState, useEffect } from "react";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useStaff } from "@/hooks/useStaff";
import type { InventoryItem, InventoryStatus } from "@/types/inventory";

const STATUSES: InventoryStatus[] = [
  "In Stock",
  "Processing",
  "Reserved",
  "Out for Delivery",
  "Out of Stock",
];

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  warehouses: { id: string; name: string }[];
  staffMembers: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}

export function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  warehouses,
  staffMembers,
  clients,
}: AddInventoryModalProps) {
  const [clientId, setClientId] = useState("");
  const [commodity, setCommodity] = useState("");
  const [cbm, setCbm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [packing, setPacking] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState<InventoryStatus>("In Stock");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!clientId || !commodity.trim() || !packing.trim() || !warehouseId) {
      setError("Client, commodity, packing, and warehouse are required.");
      return;
    }

    try {
      await onSubmit({
        clientId,
        commodity: commodity.trim(),
        cbm: parseFloat(cbm) || 0,
        quantity: parseInt(quantity) || 0,
        packing: packing.trim(),
        warehouseId,
        staffId: staffId || undefined,
        status,
      });
      // Reset form
      setClientId("");
      setCommodity("");
      setCbm("");
      setQuantity("");
      setPacking("");
      setWarehouseId("");
      setStaffId("");
      setStatus("In Stock");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add inventory");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add New Inventory Item</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Commodity *
              </label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Electronics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CBM</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cbm}
                onChange={(e) => setCbm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Packing *
              </label>
              <input
                type="text"
                value={packing}
                onChange={(e) => setPacking(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., PL-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Warehouse *
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Staff</label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff (optional)</option>
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InventoryStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
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
              {isLoading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
