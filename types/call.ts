export type CallType =
  | "answered"
  | "missed"
  | "rejected"
  | "voicemail"
  | "complaint"
  | "followup";

export type CallStatus =
  | "Completed"
  | "Missed"
  | "Active"
  | "Escalated"
  | "Rejected"
  | "Voicemail"
  | "No Response";

export type CallTemperature = "hot" | "warm" | "cold";
export type CallDirection = "inbound" | "outbound";

export type CallRecord = {
  id: number;
  caller: string;
  company: string | null;
  phone: string;
  temperature: CallTemperature | null;
  type: CallType;
  direction: CallDirection;
  ivrOption: string;
  assignedTo: string;
  assignedToUserId: string | null;
  duration: string; // e.g. "5:23"
  time: string; // ISO date string
  status: CallStatus;
  recordingUrl?: string;
  notes?: string;
};

export type CreateCallPayload = Omit<CallRecord, "id">;
export type UpdateCallPayload = Partial<Omit<CallRecord, "id">>;

export type CallListResponse = {
  data: CallRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type CallFilters = {
  type?: CallType;
  status?: CallStatus;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CallKpis = {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  activeCalls: number;
  rejectedCalls: number;
  voicemailCalls: number;
  complaintCalls: number;
  followupCalls: number;
  noResponseCalls: number;
  avgDuration: string;
  callsToday: number;
};

export type TelecmiCallInsightsView =
  | "incomingAnswered"
  | "incomingMissed"
  | "outgoingAnswered"
  | "outgoingMissed";

export type TelecmiCallInsightsFilters = {
  view: TelecmiCallInsightsView;
  dateFrom?: string | number;
  dateTo?: string | number;
  page?: number;
  limit?: number;
};

export type TelecmiCallInsightsRecordNote = {
  msg: string;
  date: number;
  agent: string;
};

export type TelecmiCallInsightsRecord = {
  cmiuid: string;
  name: string;
  from: string;
  to: string;
  agent: string | null;
  duration: number;
  billedsec: number;
  time: number;
  filename: string | null;
  record: string | boolean | null;
  rate: number | string | null;
  notes: TelecmiCallInsightsRecordNote[];
};

export type TelecmiCallInsightsResponse = {
  view: TelecmiCallInsightsView;
  label: string;
  endpoint: string;
  count: number;
  page: number;
  limit: number;
  analytics: {
    total: number;
    answered: number;
    missed: number;
  } | null;
  records: TelecmiCallInsightsRecord[];
};

export type TelecmiBrowserUserResponse = {
  enabled: boolean;
  telecmiUserId: string | null;
};
