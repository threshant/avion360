/**
 * Base HTTP client for all CRM API calls.
 *
 * Configuration:
 *   NEXT_PUBLIC_API_BASE_URL — set this in .env.local to point at your backend.
 *   Leave it empty to hit Next.js /api/* routes in the same app (default).
 *
 * Usage:
 *   import { api } from "@/services/apiClient";
 *   const lead = await api.get<Lead>("/api/leads/1");
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Get user-friendly error message from API response
   */
  getUserFriendlyMessage(): string {
    if (this.data) {
      const errorData = this.data as { error?: unknown };
      // API returned a user-friendly error message
      if (errorData.error && typeof errorData.error === "string") {
        return errorData.error;
      }
    }
    // Fallback to generic message
    return "An error occurred. Please try again.";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, signal } = options;
  const authToken =
    typeof window !== "undefined"
      ? localStorage.getItem("auth-token")
      : null;
  const resolvedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...headers,
  };

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: resolvedHeaders,
    credentials: "include", // Include cookies with requests
    signal,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // response body may be empty
    }

    const isExpectedUnauthorized =
      endpoint === "/api/auth/me" && res.status === 401;

    if (!isExpectedUnauthorized) {
      // Log detailed error information
      console.error(`[API Error] ${method} ${endpoint}`, {
        status: res.status,
        statusText: res.statusText,
        response: data,
      });
    }

    throw new ApiError(
      res.status,
      `[${method} ${endpoint}] ${res.status} ${res.statusText}`,
      data,
    );
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(
    endpoint: string,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ) => request<T>(endpoint, { method: "GET", headers, signal }),

  post: <T>(
    endpoint: string,
    body: unknown,
    headers?: Record<string, string>,
  ) => request<T>(endpoint, { method: "POST", body, headers }),

  put: <T>(endpoint: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "PUT", body, headers }),

  patch: <T>(
    endpoint: string,
    body: unknown,
    headers?: Record<string, string>,
  ) => request<T>(endpoint, { method: "PATCH", body, headers }),

  delete: <T>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: "DELETE", headers }),
};
