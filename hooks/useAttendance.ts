"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createAttendanceRecord,
  fetchAttendance,
  fetchAttendanceSummary,
  selfMarkAttendance,
  syncAttendanceFromDevice,
  updateAttendanceRecord,
} from "@/services/attendanceService";
import type {
  AttendanceFilters,
  AttendanceRecord,
  AttendanceSelfMarkPayload,
  AttendanceSelfMarkResponse,
  AttendanceSummary,
  CreateAttendancePayload,
} from "@/types/attendance";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseAttendanceState = {
  records: AttendanceRecord[];
  total: number;
  summary: AttendanceSummary | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
};

export function useAttendance(
  initialFilters: AttendanceFilters = {},
  summaryDate?: string,
) {
  const [filters, setFilters] = useState<AttendanceFilters>(initialFilters);
  const [syncing, setSyncing] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();
  const date = summaryDate ?? new Date().toISOString().split("T")[0];

  const listKey = swrKey("/swr/attendance", filters as Record<string, unknown>);
  const summaryKey = swrKey("/swr/attendance/summary", { date });

  const listQuery = useSWR(listKey, () =>
    withNetworkActivity(() => fetchAttendance(filters)),
  );
  const summaryQuery = useSWR(summaryKey, () =>
    withNetworkActivity(() => fetchAttendanceSummary(date)),
  );

  const load = async () => {
    await Promise.all([listQuery.mutate(), summaryQuery.mutate()]);
  };

  const syncFromDevice = async () => {
    setSyncing(true);
    try {
      await withNetworkActivity(() => syncAttendanceFromDevice());
      await invalidateSWRPrefix(globalMutate, [
        "/swr/attendance",
        "/swr/dashboard",
      ]);
    } catch (err) {
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const editRecord = async (
    id: number,
    payload: Partial<
      Pick<AttendanceRecord, "entryTime" | "exitTime" | "status" | "notes">
    >,
  ): Promise<AttendanceRecord> => {
    const record = await withNetworkActivity(() =>
      updateAttendanceRecord(id, payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/attendance",
      "/swr/dashboard",
    ]);
    return record;
  };

  const addRecord = async (
    payload: CreateAttendancePayload,
  ): Promise<AttendanceRecord> => {
    const record = await withNetworkActivity(() =>
      createAttendanceRecord(payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/attendance",
      "/swr/attendance/summary",
      "/swr/dashboard",
    ]);
    return record;
  };

  const markSelf = async (
    payload: AttendanceSelfMarkPayload,
  ): Promise<AttendanceSelfMarkResponse> => {
    const record = await withNetworkActivity(() => selfMarkAttendance(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/attendance",
      "/swr/attendance/summary",
      "/swr/dashboard",
    ]);
    return record;
  };

  const state: UseAttendanceState = {
    records: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    summary: summaryQuery.data ?? null,
    loading:
      listQuery.isLoading ||
      listQuery.isValidating ||
      summaryQuery.isLoading ||
      summaryQuery.isValidating,
    syncing,
    error:
      (listQuery.error instanceof Error && listQuery.error.message) ||
      (summaryQuery.error instanceof Error && summaryQuery.error.message) ||
      null,
  };

  return {
    ...state,
    filters,
    setFilters,
    refetch: load,
    syncFromDevice,
    editRecord,
    addRecord,
    selfMarkAttendance: markSelf,
  };
}
