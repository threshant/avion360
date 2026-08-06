/**
 * Frontend API Client Wrapper
 * All frontend->backend communication goes through this wrapper
 * Never call /api endpoints directly from components
 */

import { ApiError } from "@/services/apiClient";

export type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
  requestId: string;
  timestamp: string;
  status: number;
};

/**
 * Wrapper class for all API calls
 * - Adds auth token automatically
 * - Handles middleware responses
 * - Validates responses
 * - Provides consistent error handling
 */
export class ApiClientWrapper {
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get auth token from localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth-token");
  }

  /**
   * Build request headers with auth token
   */
  private buildHeaders(
    customHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(customHeaders || {}),
    };

    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Make HTTP request through middleware
   */
  private async request<T>(
    endpoint: string,
    options: FetchOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers: customHeaders,
      timeout = this.timeout,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders(customHeaders);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await this.fetchWithTimeout(url, fetchOptions, timeout);

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          data.message || data.error || `${method} ${endpoint} failed`,
          data,
        );
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new ApiError(0, "Network error - unable to reach server");
      }

      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "POST", body, headers });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PUT", body, headers });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PATCH", body, headers });
  }

  /**
   * Extract data from API response
   */
  static extractData<T>(response: ApiResponse<T>): T {
    if (!response.data) {
      throw new Error(response.error || "No data in response");
    }
    return response.data;
  }
}

/**
 * Global API client instance
 * Use this in all services and hooks
 */
export const apiClientWrapper = new ApiClientWrapper();

/**
 * Error handler for API calls
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}
