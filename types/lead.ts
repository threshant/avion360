import type { Conversation } from "./conversation";

export type LeadTemperature = "cold" | "warm" | "hot" | "HOT" | "WARM" | "COLD";

export type LeadSource =
  | "WhatsApp"
  | "Calls"
  | "Email"
  | "Website"
  | "Walk-in"
  | "Instagram"
  | "Facebook"
  | "conversation";

export type LeadStatus =
  | "Under Sourcing Process"
  | "Payment Period"
  | "Shifted to Warehouse"
  | "Payment Received"
  | "Pending"
  | "In Progress"
  | "Closed Won"
  | "Closed Lost";

// Aviontive API nested types
export type PipelineStage = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type Contact = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  phone_e164: string;
  notes?: string;
  connections?: unknown[];
};

export type Lead = {
  id: string | number;
  name?: string;
  brand_id?: string;
  pipeline_id?: string;
  stage_id: string;
  conversation_id?: string;
  call_id?: string;
  contact_id?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
  lastContact?: string; // ISO date string
  temperature: LeadTemperature;
  source?: LeadSource;
  amount?: number;
  currency?: string;
  assignedTo?: string | null;
  status?: LeadStatus;
  tags?: string[];
  labels?: string[];
  created_at?: string;
  updated_at?: string;
  stage?: PipelineStage;
  kanbanColumnId?: string | null;
  contact?: Contact;
  conversation?: Conversation;
  pipeline_name?: string;
};

export type CreateLeadPayload = Omit<Lead, "id" | "created_at" | "updated_at">;

export type UpdateLeadPayload = {
  title?: string;
  notes?: string;
  amount?: number | null;
  currency?: string;
  temperature?: LeadTemperature;
  contact_id?: string | null;
  stage_id?: string;
};

export type UpdateLeadStagePayload = {
  lead_id: string;
  stage_id: string;
};

export type LeadResponse<T = Lead> = {
  data: T;
};

export type ListResponse<T = Lead> = {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type LeadListResponse = ListResponse<Lead>;

export type LeadFilters = {
  temperature?: LeadTemperature;
  source?: LeadSource;
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

// Pipeline & Stage types
export type LeadPipeline = {
  id: string;
  name: string;
  brand_id?: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  lead_count?: number;
  stages?: LeadStage[];
};

export type LeadStage = {
  id: string;
  pipeline_id: string;
  name: string;
  color: string | null;
  position: number;
  sla_hours: number | null;
  lead_count?: number;
};

export type CreatePipelinePayload = {
  name: string;
  stages?: { name: string; color?: string; sla_hours?: number | null }[];
};

export type UpdatePipelinePayload = {
  name?: string;
  is_active?: boolean;
};

export type CreateStagePayload = {
  name: string;
  color?: string;
  sla_hours?: number | null;
};

export type UpdateStagePayload = {
  name?: string;
  color?: string;
  sla_hours?: number | null;
};

export type LeadCustomFields = {
  product_name?: string;
  whatsapp_contact?: string;
  quantity?: string;
  services?: string;
} | null;

export type ConvertToLeadPayload = {
  source_type: "conversation" | "call";
  source_id: string;
  pipeline_id: string;
  stage_id: string;
  title?: string;
  temperature?: LeadTemperature;
  notes?: string;
  assigned_to?: string;
  custom_fields?: LeadCustomFields;
};
