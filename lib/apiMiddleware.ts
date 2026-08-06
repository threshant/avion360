/**
 * API Middleware Utilities
 * Central place for all API middleware functions
 */

import { NextRequest, NextResponse } from "next/server";
import type { ZodSchema } from "zod";

// ─────────────────────── Types ───────────────────────────────────────────

export type ApiContext = {
  request: NextRequest;
  requestId: string;
  userRole: string | null;
  userId: string | null;
  authToken: string | null;
};

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
  requestId: string;
  timestamp: string;
  status: number;
};

export type ApiErrorResponse = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
  status: number;
};

// ─────────────────────── Error Classes ──────────────────────────────────

export class ApiException extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export class AuthenticationException extends ApiException {
  constructor(message: string = "Authentication required") {
    super(401, message);
    this.name = "AuthenticationException";
  }
}

export class AuthorizationException extends ApiException {
  constructor(message: string = "Unauthorized access") {
    super(403, message);
    this.name = "AuthorizationException";
  }
}

export class ValidationException extends ApiException {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>,
  ) {
    super(400, message, details);
    this.name = "ValidationException";
  }
}

export class NotFoundException extends ApiException {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`);
    this.name = "NotFoundException";
  }
}

// ─────────────────────── Logger ───────────────────────────────────────────

export class ApiLogger {
  static log(
    requestId: string,
    message: string,
    level: "info" | "warn" | "error" = "info",
  ) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${requestId}]`;

    switch (level) {
      case "error":
        console.error(`${prefix} ❌ ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  static logRequest(
    requestId: string,
    method: string,
    pathname: string,
    userRole?: string | null,
  ) {
    const roleInfo = userRole ? ` [${userRole}]` : "";
    this.log(requestId, `→ ${method} ${pathname}${roleInfo}`);
  }

  static logResponse(requestId: string, status: number, message?: string) {
    const statusEmoji = status >= 200 && status < 300 ? "✅" : "❌";
    const msg = message ? ` - ${message}` : "";
    this.log(requestId, `← ${status}${msg}`, status >= 400 ? "error" : "info");
  }

  static logError(requestId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.log(requestId, `ERROR: ${message}`, "error");
  }
}

// ─────────────────────── Context Builder ────────────────────────────────

export function buildApiContext(request: NextRequest): ApiContext {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userRole = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  const authToken = request.headers.get("x-auth-token");

  return {
    request,
    requestId,
    userRole,
    userId,
    authToken,
  };
}

// ─────────────────────── Validation ──────────────────────────────────────

export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema,
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationException("Invalid JSON in request body");
  }

  try {
    return schema.parse(body) as T;
  } catch (error) {
    const details =
      error instanceof Error
        ? { message: error.message }
        : { message: "Validation failed" };
    throw new ValidationException("Request validation failed", details);
  }
}

// ─────────────────────── Authorization ──────────────────────────────────

export function requireAuth(context: ApiContext) {
  if (!context.authToken || !context.userId) {
    throw new AuthenticationException("Authentication token required");
  }
}

export function requireRole(context: ApiContext, ...allowedRoles: string[]) {
  if (!context.userRole) {
    throw new AuthenticationException("User role not found");
  }

  if (!allowedRoles.includes(context.userRole)) {
    throw new AuthorizationException(
      `Required role: ${allowedRoles.join(" or ")}, but got: ${context.userRole}`,
    );
  }
}

export function requireAnyRole(context: ApiContext, allowedRoles: string[]) {
  requireRole(context, ...allowedRoles);
}

// ─────────────────────── Permission Checking ────────────────────────────

export type PermissionCheckOptions = {
  context: ApiContext;
  permission?: string;
  allowedRoles?: string[];
};

export function checkPermission({
  context,
  permission,
  allowedRoles = ["super_admin"],
}: PermissionCheckOptions) {
  // Super admin always has access
  if (context.userRole === "super_admin") {
    return true;
  }

  // Check if user has allowed role
  if (allowedRoles.length > 0) {
    return context.userRole ? allowedRoles.includes(context.userRole) : false;
  }

  // Permission-based check would go here
  // TODO: Query database for role-permission mapping
  return false;
}

// ─────────────────────── Response Builders ──────────────────────────────

export function successResponse<T>(
  data: T,
  context: ApiContext,
  message: string = "Success",
): ApiResponse<T> {
  return {
    data,
    message,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    status: 200,
  };
}

export function createdResponse<T>(
  data: T,
  context: ApiContext,
  message: string = "Created",
): ApiResponse<T> {
  return {
    data,
    message,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    status: 201,
  };
}

export function errorResponse(
  error: ApiException | Error,
  context: ApiContext,
): ApiErrorResponse {
  const status = error instanceof ApiException ? error.status : 500;
  const message =
    error instanceof ApiException ? error.message : "Internal server error";
  const details = error instanceof ApiException ? error.details : undefined;

  return {
    error: error.name,
    message,
    details,
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    status,
  };
}

// ─────────────────────── Handler Wrapper ────────────────────────────────

export type ApiHandler<T = unknown> = (context: ApiContext) => Promise<T>;

/**
 * Wraps API handlers with middleware for logging, error handling, and response formatting
 */
export function withApiMiddleware(
  handler: ApiHandler,
  options: {
    method?: string;
    requireAuth?: boolean;
    requireRole?: string[];
    logRequest?: boolean;
  } = {},
) {
  const {
    method = "API",
    requireAuth: needsAuth = true,
    requireRole: allowedRoles = [],
    logRequest: shouldLog = true,
  } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const context = buildApiContext(request);

    try {
      // Log incoming request
      if (shouldLog) {
        ApiLogger.logRequest(
          context.requestId,
          method,
          request.nextUrl.pathname,
          context.userRole,
        );
      }

      // Check authentication
      if (needsAuth) {
        requireAuth(context);
      }

      // Check authorization
      if (allowedRoles.length > 0) {
        requireRole(context, ...allowedRoles);
      }

      // Execute handler
      const result = await handler(context);

      // Log response
      if (shouldLog) {
        ApiLogger.logResponse(context.requestId, 200);
      }

      return NextResponse.json(successResponse(result, context), {
        status: 200,
      });
    } catch (error) {
      // Log error
      ApiLogger.logError(context.requestId, error);

      const response = errorResponse(
        error instanceof ApiException
          ? error
          : new ApiException(500, String(error)),
        context,
      );

      return NextResponse.json(response, {
        status: response.status,
      });
    }
  };
}

// ─────────────────────── Request Parser ───────────────────────────────

export async function parseRequestBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new ValidationException("Invalid JSON in request body");
  }
}

// ─────────────────────── Query Parser ──────────────────────────────────

export function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = request.nextUrl.searchParams;

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

// ─────────────────────── Rate Limiting (Simple) ──────────────────────

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000, // 1 minute
): boolean {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || record.resetTime < now) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function rateLimitResponse(context: ApiContext): NextResponse {
  const response = {
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later.",
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    status: 429,
  };

  return NextResponse.json(response, { status: 429 });
}
