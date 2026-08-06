import { apiClientWrapper } from "@/lib/apiClientWrapper";
import type {
  UserWithPermissions,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserPermissionsPayload,
} from "@/types/userManagement";

/**
 * Service for managing Users
 * All calls go through apiClientWrapper for safety and consistency
 * Only accessible to super admin
 */

function extractData<T>(response: any): T {
  return response.data as T;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<UserWithPermissions[]> {
  const response = await apiClientWrapper.get("/api/users?limit=1000");
  return extractData<{ users: UserWithPermissions[] }>(response).users;
}

export async function getUsers(
  page = 1,
  limit = 20,
): Promise<{
  users: UserWithPermissions[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const response = await apiClientWrapper.get(
    `/api/users?page=${page}&limit=${limit}`,
  );
  return extractData<{ users: UserWithPermissions[]; pagination: any }>(
    response,
  );
}

export async function getUserById(
  userId: string,
): Promise<UserWithPermissions> {
  const response = await apiClientWrapper.get(`/api/users/${userId}`);
  return extractData<UserWithPermissions>(response);
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserWithPermissions> {
  const response = await apiClientWrapper.post("/api/users", payload);
  return extractData<UserWithPermissions>(response);
}

export async function updateUser(
  userId: string,
  payload: UpdateUserPayload,
): Promise<UserWithPermissions> {
  const response = await apiClientWrapper.put(`/api/users/${userId}`, payload);
  return extractData<UserWithPermissions>(response);
}

export async function deleteUser(userId: string): Promise<void> {
  await apiClientWrapper.delete(`/api/users/${userId}`);
}

export async function deactivateUser(userId: string): Promise<void> {
  await apiClientWrapper.put(`/api/users/${userId}`, { is_active: false });
}

export async function activateUser(userId: string): Promise<void> {
  await apiClientWrapper.put(`/api/users/${userId}`, { is_active: true });
}

// ─── User Permissions ───────────────────────────────────────────────────────

export async function getUserPermissions(
  userId: string,
): Promise<{ permissions: any[] }> {
  const response = await apiClientWrapper.get(
    `/api/users/${userId}/permissions`,
  );
  return extractData<{ permissions: any[] }>(response);
}

export async function updateUserPermissions(
  userId: string,
  payload: UpdateUserPermissionsPayload,
): Promise<{ permissions: any[] }> {
  const response = await apiClientWrapper.put(
    `/api/users/${userId}/permissions`,
    payload,
  );
  return extractData<{ permissions: any[] }>(response);
}

export async function generateShareLink(
  userId: string,
): Promise<{ token: string; shareUrl: string; expiresIn: number }> {
  const response = await apiClientWrapper.post(`/api/users/${userId}/share`, {});
  return extractData<{ token: string; shareUrl: string; expiresIn: number }>(
    response,
  );
}
