export type AttendanceStatus =
  | "Present"
  | "Late"
  | "Absent"
  | "Half Day"
  | "On Leave";

export type AttendanceRecord = {
  id: number;
  employeeId: string;
  employee: string;
  department: string;
  designation: string;
  date: string; // ISO date string
  entryTime: string | null; // "HH:MM AM/PM"
  exitTime: string | null; // "HH:MM AM/PM"
  workingHours: string | null; // e.g. "8.5h"
  status: AttendanceStatus;
  deviceId?: string; // Hikvision device ID
  notes?: string;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationAccuracy?: number | null;
  locationVerified?: boolean | null;
  locationDistanceMeters?: number | null;
};

export type AttendanceListResponse = {
  data: AttendanceRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type AttendanceFilters = {
  date?: string;
  department?: string;
  status?: AttendanceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AttendanceSummary = {
  date: string;
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
};

export type AttendanceUser = {
  id: string;
  name: string;
  department?: string;
  designation?: string;
};

export type CreateAttendancePayload = {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  entryTime?: string | null;
  exitTime?: string | null;
  notes?: string;
  deviceId?: string;
};

export type AttendanceSelfMarkPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
  notes?: string;
};

export type AttendanceSelfMarkResponse = {
  id: number;
  employeeId: string;
  employee: string;
  department: string;
  designation: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  workingHours: string | null;
  status: AttendanceStatus;
  deviceId?: string;
  notes?: string;
  locationStatus: "verified" | "outside_location";
  locationMessage?: string;
  distanceMeters?: number;
};
