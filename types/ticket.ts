export type TicketPriority = "High" | "Medium" | "Low";
export type TicketStatus = "Open" | "In Progress" | "Closed" | "Resolved";
export type TicketCategory =
  | "General"
  | "Bug"
  | "Feature Request"
  | "Support"
  | "Task"
  | "Other";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  created_by: string;
  created_by_name?: string | null;
  created_by_email?: string | null;
  assigned_to: string | null;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
  comment_count?: number;
  created_at: string;
  updated_at: string;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  content: string;
  created_at: string;
};

export type CreateTicketPayload = {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  assigned_to?: string | null;
};

export type UpdateTicketPayload = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  category?: TicketCategory;
  assigned_to?: string | null;
};

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type TicketListResponse = {
  data: Ticket[];
  total: number;
  page: number;
  pageSize: number;
};
