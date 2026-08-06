import type {
  AttendanceFilters,
  AttendanceListResponse,
  AttendanceRecord,
  AttendanceSelfMarkPayload,
  AttendanceSelfMarkResponse,
  AttendanceSummary,
  AttendanceUser,
  CreateAttendancePayload,
} from "@/types/attendance";
import { api } from "./apiClient";

const ENDPOINT = "/api/attendance";

function toQueryString(filters: AttendanceFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAttendance(
  filters: AttendanceFilters = {},
): Promise<AttendanceListResponse> {
  return api.get<AttendanceListResponse>(
    `${ENDPOINT}${toQueryString(filters)}`,
  );
}

export async function fetchAttendanceSummary(
  date: string,
): Promise<AttendanceSummary> {
  return api.get<AttendanceSummary>(`${ENDPOINT}/summary?date=${date}`);
}

export async function fetchAttendanceByEmployee(
  employeeId: string,
  filters: Pick<AttendanceFilters, "date"> = {},
): Promise<AttendanceListResponse> {
  return api.get<AttendanceListResponse>(
    `${ENDPOINT}/employee/${employeeId}${toQueryString(filters)}`,
  );
}

export async function syncAttendanceFromDevice(): Promise<{
  synced: number;
  errors: number;
}> {
  // Triggers Hikvision / attendance-device sync on the backend.
  return api.post<{ synced: number; errors: number }>(`${ENDPOINT}/sync`, {});
}

export async function updateAttendanceRecord(
  id: number,
  payload: Partial<
    Pick<AttendanceRecord, "entryTime" | "exitTime" | "status" | "notes">
  >,
): Promise<AttendanceRecord> {
  return api.patch<AttendanceRecord>(`${ENDPOINT}/${id}`, payload);
}

export async function fetchAttendanceUsers(): Promise<AttendanceUser[]> {
  const response = await api.get<{ data: AttendanceUser[] }>(
    `${ENDPOINT}/users`,
  );
  return response.data || [];
}

export async function createAttendanceRecord(
  payload: CreateAttendancePayload,
): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>(ENDPOINT, payload);
}

export async function selfMarkAttendance(
  payload: AttendanceSelfMarkPayload,
): Promise<AttendanceSelfMarkResponse> {
  return api.post<AttendanceSelfMarkResponse>(`${ENDPOINT}/self-mark`, payload);
}
