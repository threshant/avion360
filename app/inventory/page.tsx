"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { useClients } from "@/hooks/useClients";
import { useInventory } from "@/hooks/useInventory";
import { useUserPermissions } from "@/hooks/useRBAC";
import { useWarehouses } from "@/hooks/useWarehouses";
import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import { fetchStaff } from "@/services/staffService";
import { recordStockChange } from "@/services/stockMaintenanceService";
import type {
  CreateInventoryPayload,
  InventoryItem,
  InventoryStatus,
} from "@/types/inventory";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

// ── skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function WarehouseCardSkeleton() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <SkeletonBox className="h-5 w-40 rounded-lg" />
          <p className="mt-4 text-xs text-slate-500">&nbsp;</p>
          <SkeletonBox className="mt-1 h-6 w-24 rounded-lg" />
          <p className="mt-4 text-xs text-slate-500">&nbsp;</p>
          <SkeletonBox className="mt-1 h-5 w-20 rounded-md" />
        </div>
        <div className="w-56">
          <SkeletonBox className="h-3 w-full rounded-full" />
          <SkeletonBox className="mt-3 h-3 w-20 rounded-full" />
        </div>
      </div>
    </article>
  );
}

// ── status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InventoryStatus }) {
  const cls =
    status === "In Stock"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Out for Delivery"
        ? "bg-sky-100 text-sky-700"
        : status === "Processing"
          ? "bg-amber-100 text-amber-700"
          : status === "Reserved"
            ? "bg-violet-100 text-violet-700"
            : "bg-rose-100 text-rose-700";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${cls}`}
    >
      {status}
    </span>
  );
}

// ── warehouse summary card ────────────────────────────────────────────────────

function WarehouseCard({
  name,
  cbm,
  staff,
}: {
  name: string;
  cbm: number;
  staff: number;
}) {
  const pct = Math.min(100, Math.round((cbm / 300) * 100));
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
          <p className="mt-4 text-xs text-slate-500">Total CBM</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {cbm.toFixed(1)}
          </p>
          <p className="mt-4 text-xs text-slate-500">Staff Members</p>
          <p className="mt-1 text-lg font-semibold">{staff}</p>
        </div>
        <div className="w-56">
          <div className="h-3 w-full rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">Capacity: {pct}%</p>
        </div>
      </div>
    </article>
  );
}

// ── Add Stock Modal ───────────────────────────────────────────────────────────

const STATUSES: InventoryStatus[] = [
  "In Stock",
  "Processing",
  "Reserved",
  "Out for Delivery",
  "Out of Stock",
];

type Warehouse = {
  id: string;
  name: string;
  location?: string;
};

type Client = {
  id: string;
  name: string;
  email?: string;
};

type Staff = {
  id: string;
  name: string;
  warehouseId?: string;
};

type InventoryErrorData = {
  error?: string;
  details?: unknown;
  [key: string]: unknown;
};

type AddStockModalProps = {
  onClose: () => void;
  onCreateItem: (payload: CreateInventoryPayload) => Promise<InventoryItem>;
  onSaved: () => void;
};

function AddStockModal({ onClose, onCreateItem, onSaved }: AddStockModalProps) {
  const [clientId, setClientId] = useState("");
  const [commodity, setCommodity] = useState("");
  const [cbm, setCbm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [packing, setPacking] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState<InventoryStatus>("In Stock");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<unknown>(null);
  const warehousesQuery = useWarehouses();
  const clientsQuery = useClients({ pageSize: 1000 });
  const staffQuery = useSWR(
    warehouseId
      ? swrKey("/swr/inventory/staff-options", { warehouseId })
      : null,
    () => withNetworkActivity(() => fetchStaff({ warehouseId })),
  );

  const warehouses = warehousesQuery.warehouses as Warehouse[];
  const clients = clientsQuery.clients as Client[];
  const staffMembers = (staffQuery.data?.data ?? []) as Staff[];
  const loadingWarehouses = warehousesQuery.isLoading;
  const loadingClients = clientsQuery.loading;
  const loadingStaff = staffQuery.isLoading || staffQuery.isValidating;
  const hasErrorDetails = errorDetails !== null && errorDetails !== undefined;
  const warehouseError = warehousesQuery.error
    ? warehousesQuery.error
    : !loadingWarehouses && warehouses.length === 0
      ? "No warehouses available. Please contact administrator."
      : "";

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouseId, warehouses]);

  useEffect(() => {
    setStaffId("");
  }, [warehouseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorDetails(null);

    // Validate required fields
    if (!commodity.trim() || !packing.trim() || !warehouseId) {
      setError(
        "Commodity, Packing, and Warehouse are required. Client and Staff are optional.",
      );
      return;
    }

    setSaving(true);
    try {
      // Build the correct payload for the API
      const payload: CreateInventoryPayload = {
        commodity: commodity.trim(),
        packing: packing.trim(),
        warehouseId,
        cbm: parseFloat(cbm) || 0,
        quantity: parseInt(quantity) || 0,
        status,
        clientId: clientId || undefined,
        staffId: staffId || undefined,
      };

      try {
        const result = await onCreateItem(payload);
        if (result) {
          onSaved();
          onClose();
        } else {
          setError("Failed to create inventory item");
        }
      } catch (err) {
        let errorMessage = "Failed to save inventory item. Please try again.";
        let details: unknown = null;
        const inventoryError = err as {
          data?: InventoryErrorData;
          getUserFriendlyMessage?: () => string;
        };

        // Use ApiError's built-in method if available
        if (
          inventoryError.getUserFriendlyMessage &&
          typeof inventoryError.getUserFriendlyMessage === "function"
        ) {
          errorMessage = inventoryError.getUserFriendlyMessage();
        }

        // Extract and log detailed error information
        if (err instanceof Error) {
          // Fallback: try to extract from error data property
          if (inventoryError.data) {
            const errorData = inventoryError.data;
            if (errorData.error && typeof errorData.error === "string") {
              errorMessage = errorData.error;
            }
            // Store technical details for display
            details = errorData.details || errorData;

            // Log detailed error info to console
            console.error("[Inventory Form Error]", {
              userMessage: errorMessage,
              details: details,
              fullError: errorData,
            });
          } else {
            console.error("[Inventory Form Error]", {
              userMessage: errorMessage,
              error: err,
            });
          }
        }

        setError(errorMessage);
        setErrorDetails(details);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Stock</SheetTitle>
          <SheetDescription>Fill in the details to add inventory</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 space-y-2">
                <p className="font-semibold">{error}</p>
                {hasErrorDetails && (
                  <details className="text-xs text-rose-500 cursor-pointer">
                    <summary className="font-mono hover:underline">
                      Technical Details
                    </summary>
                    <pre className="mt-2 bg-rose-100 p-2 rounded text-xs overflow-auto max-h-40">
                      {typeof errorDetails === "string"
                        ? errorDetails
                        : JSON.stringify(errorDetails, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {warehouseError && (
              <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-600">
                {warehouseError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Client
                  <span className="text-xs text-slate-400 font-normal">
                    (optional)
                  </span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 disabled:bg-slate-50"
                  disabled={loadingClients}
                >
                  <option value="">
                    {loadingClients
                      ? "Loading clients..."
                      : clients.length === 0
                        ? "No clients available"
                        : "Select a client"}
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Commodity
                  <span className="ml-1 text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electronic Components"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  CBM
                  <span className="text-xs text-slate-400 font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="number"
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                  value={cbm}
                  onChange={(e) => setCbm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Quantity
                  <span className="text-xs text-slate-400 font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Packing
                  <span className="ml-1 text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Box, Container, Pallet"
                  value={packing}
                  onChange={(e) => setPacking(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Staff
                  <span className="text-xs text-slate-400 font-normal">
                    (optional)
                  </span>
                </label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 disabled:bg-slate-50"
                  disabled={loadingStaff || !warehouseId}
                >
                  <option value="">
                    {!warehouseId
                      ? "Select a warehouse first"
                      : loadingStaff
                        ? "Loading staff..."
                        : staffMembers.length === 0
                          ? "No staff available"
                          : "Select staff (optional)"}
                  </option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Warehouse
                  <span className="ml-1 text-rose-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className={`h-10 w-full rounded-xl border px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 ${
                    warehouseError
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200"
                  }`}
                  required
                  disabled={loadingWarehouses || !!warehouseError}
                >
                  <option value="">
                    {loadingWarehouses
                      ? "Loading warehouses..."
                      : warehouses.length === 0
                        ? "No warehouses available"
                        : "Select a warehouse"}
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InventoryStatus)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-slate-100 px-0 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                loadingWarehouses ||
                !!warehouseError ||
                warehouses.length === 0
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Add Stock"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [isStockUpdating, setIsStockUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockError, setStockError] = useState("");
  const [stockSuccess, setStockSuccess] = useState("");
  const inventoryQuery = useInventory({ page: 1, pageSize: 20 });
  const stockItemsQuery = useInventory({ page: 1, pageSize: 100 });
  const warehousesQuery = useWarehouses();
  const items = inventoryQuery.items;
  const stockItems = stockItemsQuery.items;
  const isLoading = inventoryQuery.loading;
  const isLoadingStockItems = stockItemsQuery.loading;
  const totalItemsCount = inventoryQuery.total;
  const page = inventoryQuery.page;
  const pageSize = inventoryQuery.pageSize;
  const maxPages = inventoryQuery.maxPages;
  const setInventoryFilters = inventoryQuery.setFilters;
  const setInventoryPage = inventoryQuery.setPage;
  const setInventoryPageSize = inventoryQuery.setPageSize;
  const refetchInventory = inventoryQuery.refetch;
  const addInventoryItem = inventoryQuery.addItem;
  const refetchStockItems = stockItemsQuery.refetch;

  // Check if user has permission to create inventory
  const { permissions } = useUserPermissions();
  const canCreateInventory = permissions.some(
    (p) => p.key === "inventory.create",
  );
  const canManageStock = permissions.some((p) =>
    [
      "inventory.create",
      "inventory.update",
      "stock_upload.view",
      "stock_upload.create",
    ].includes(p.key),
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setInventoryFilters((current) => ({
        ...current,
        page: 1,
        search: search || undefined,
      }));
    }, 300);
    return () => clearTimeout(t);
  }, [search, setInventoryFilters]);

  useEffect(() => {
    setInventoryFilters((current) => ({
      ...current,
      page: 1,
      warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
    }));
  }, [setInventoryFilters, warehouseFilter]);

  // Derived warehouse stats from loaded items
  const warehouseNames = useMemo(
    () =>
      [
        ...new Set(
          items.map((i) => i.warehouse).filter((w): w is string => !!w),
        ),
      ].sort(),
    [items],
  );
  const warehouseStats = useMemo(
    () =>
      warehouseNames.map((name) => {
        const wItems = items.filter((i) => i.warehouse === name);
        return {
          name,
          cbm: wItems.reduce((s, i) => s + i.cbm, 0),
          staff: new Set(
            wItems.map((i) => i.staff).filter((s): s is string => !!s),
          ).size,
        };
      }),
    [items, warehouseNames],
  );

  const totalCbm = items.reduce((s, i) => s + i.cbm, 0);
  const pendingOut = items.filter(
    (i) => i.status === "Out for Delivery",
  ).length;
  const staffActive = new Set(items.map((i) => i.staff).filter(Boolean)).size;

  const displayed = items;
  const selectedStockItem = stockItems.find(
    (item) => item.id === selectedItemId,
  );

  const handleStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStockError("");
    setStockSuccess("");

    if (!selectedItemId) {
      setStockError("Please select an inventory item");
      return;
    }

    const qty = Number(stockQty);
    if (!stockQty || qty <= 0) {
      setStockError("Please enter a valid stock quantity");
      return;
    }

    if (!selectedStockItem) {
      setStockError("Selected item not found");
      return;
    }

    setIsStockUpdating(true);
    try {
      await recordStockChange(selectedItemId, {
        inventoryItemId: selectedItemId,
        previousQuantity: selectedStockItem.quantity,
        newQuantity: selectedStockItem.quantity + qty,
        changeReason: "Stock Upload",
        changedBy: "System",
      });

      setStockSuccess(
        `Stock updated successfully! Added ${qty} units to ${selectedStockItem.commodity}`,
      );
      setSelectedItemId("");
      setStockQty("");

      await Promise.all([refetchInventory(), refetchStockItems()]);
    } catch (err) {
      setStockError(
        err instanceof Error ? err.message : "Failed to update stock",
      );
    } finally {
      setIsStockUpdating(false);
    }
  };

  return (
    <CrmShell activeNav="Inventory">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Inventory & Warehouse Management" subtitle="Track stock, shipments, and warehouse operations" onRefresh={() => Promise.all([refetchInventory(), refetchStockItems()])}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={!canCreateInventory}
            title={
              !canCreateInventory
                ? "You don't have permission to add inventory"
                : ""
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#e55a39] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#FF6B4A]"
          >
            + Add New Stock
          </button>
        </PageHeader>

        {/* Warehouse Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <WarehouseCardSkeleton key={i} />
            ))}
          </div>
        ) : warehouseStats.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {warehouseStats.map((w) => (
              <WarehouseCard
                key={w.name}
                name={w.name}
                cbm={w.cbm}
                staff={w.staff}
              />
            ))}
          </div>
        ) : null}

        {/* ── inventory list ── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Inventory List
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="search"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-2xl border border-sky-100 bg-white px-4 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="h-11 rounded-2xl border border-sky-100 bg-white px-4 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              >
                <option value="all">All Warehouses</option>
                {warehousesQuery.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagination controls */}
          {!isLoading && (
            <div className="border-b border-slate-100 px-4 py-3 mb-0 flex items-center justify-between bg-slate-50 text-sm rounded-t-lg">
              <div className="flex items-center gap-3 text-slate-600">
                <span>Show per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setInventoryPageSize(Number(e.target.value));
                  }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInventoryPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Prev
                </button>
                <span className="text-sm text-slate-600 px-3 whitespace-nowrap">
                  Page {page} of {maxPages}
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryPage(page + 1)}
                  disabled={page >= maxPages}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-600">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">CBM</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Packing List</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="align-middle">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="py-4 px-4">
                          <SkeletonBox className="h-4 w-24 rounded-md" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : displayed.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-slate-400"
                    >
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  displayed.map((it) => (
                    <tr
                      key={it.id}
                      className="align-middle hover:bg-slate-50/50"
                    >
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {it.id}
                      </td>
                      <td className="py-4 px-4 text-slate-700">{it.client}</td>
                      <td className="py-4 px-4 text-slate-700">
                        {it.commodity}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {it.cbm}
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {it.quantity}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-sky-700">
                          {it.packing}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm text-sky-700">
                          {it.warehouse}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{it.staff}</td>
                      <td className="py-4 px-4">
                        <StatusBadge status={it.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── stock update (merged from stock upload page) ── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">
              Stock Update
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add stock quantity directly from this inventory page.
            </p>
          </div>

          {!canManageStock ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You do not have permission to update stock.
            </div>
          ) : (
            <form className="max-w-md space-y-4" onSubmit={handleStockSubmit}>
              {stockError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {stockError}
                </div>
              )}

              {stockSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                  {stockSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Inventory Item *
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  disabled={isLoadingStockItems}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                >
                  <option value="">
                    {isLoadingStockItems
                      ? "Loading items..."
                      : "Select an inventory item"}
                  </option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.commodity} - {item.warehouse || "Unknown"} - Qty:{" "}
                      {item.quantity} {item.unit || "units"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder="Enter stock quantity"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {selectedStockItem && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Current Quantity:</span>
                    <span className="font-semibold text-sky-700">
                      {selectedStockItem.quantity}{" "}
                      {selectedStockItem.unit || "units"}
                    </span>
                  </div>
                  {stockQty && (
                    <div className="mt-2 flex justify-between border-t border-sky-200 pt-2">
                      <span className="text-slate-600">New Quantity:</span>
                      <span className="font-semibold text-emerald-600">
                        {selectedStockItem.quantity + Number(stockQty)}{" "}
                        {selectedStockItem.unit || "units"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isStockUpdating || isLoadingStockItems || !selectedItemId
                }
                className="h-11 w-full rounded-xl bg-[#FF6B4A] px-4 text-sm font-semibold text-white transition hover:bg-[#e55a39] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStockUpdating ? "Processing..." : "Add Stock"}
              </button>
            </form>
          )}
        </section>

        {/* ── stat tiles ── */}
        <section className="grid gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total Items",
              value: String(totalItemsCount),
              color: "sky",
            },
            { label: "Total CBM", value: totalCbm.toFixed(1), color: "sky" },
            { label: "Pending Out", value: String(pendingOut), color: "amber" },
            {
              label: "Staff Active",
              value: String(staffActive),
              color: "emerald",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`mt-3 text-2xl font-bold text-${color}-600`}>
                {value}
              </p>
            </div>
          ))}
        </section>
      </div>

      {showModal && (
        <AddStockModal
          onClose={() => setShowModal(false)}
          onCreateItem={addInventoryItem}
          onSaved={() => {
            void Promise.all([refetchInventory(), refetchStockItems()]);
          }}
        />
      )}
    </CrmShell>
  );
}
