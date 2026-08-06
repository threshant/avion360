export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
export type TaskType =
  | "Call"
  | "Email"
  | "Meeting"
  | "Follow-up"
  | "Demo"
  | "Other";

export type TaskRelation = {
  type: "lead" | "customer" | "deal";
  id: number;
  name: string;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string; // User ID from users table
  assignedToName?: string | null; // Resolved from users join
  assignedToEmail?: string | null; // Resolved from users join
  assignedBy?: string | null; // User ID who assigned the task
  assignedByName?: string | null; // Resolved from users join
  assignedByEmail?: string | null; // Resolved from users join
  createdBy?: string; // User ID who created the task
  createdByName?: string | null; // Resolved from users join
  createdByEmail?: string | null; // Resolved from users join
  selfAssigned?: boolean;
  relatedTo?: TaskRelation;
  dueDate: string; // ISO date string
  completedAt: string | null; // ISO date string
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
};

export type CreateTaskPayload = {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
  relatedTo?: TaskRelation;
  dueDate: string;
  completedAt: null;
};

export type UpdateTaskPayload = Partial<Omit<Task, "id" | "createdAt">>;

export type TaskListResponse = {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
};

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
