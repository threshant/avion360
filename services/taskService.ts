import { api } from "./apiClient";
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskListResponse,
  TaskFilters,
} from "@/types/task";

const ENDPOINT = "/api/tasks";

function toQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchTasks(
  filters: TaskFilters = {},
): Promise<TaskListResponse> {
  const response = await api.get<TaskListResponse>(
    `${ENDPOINT}${toQueryString(filters)}`,
  );
  return response;
}

export async function fetchTaskById(id: number): Promise<Task> {
  return api.get<Task>(`${ENDPOINT}/${id}`);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return api.post<Task>(ENDPOINT, payload);
}

export async function updateTask(
  id: number,
  payload: UpdateTaskPayload,
): Promise<Task> {
  return api.patch<Task>(`${ENDPOINT}/${id}`, payload);
}

export async function completeTask(id: number): Promise<Task> {
  return api.patch<Task>(`${ENDPOINT}/${id}/complete`, {});
}

export async function deleteTask(id: number): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
