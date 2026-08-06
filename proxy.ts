import type { NextFetchEvent } from "next/server";
import { NextRequest, NextResponse } from "next/server";

// ────────────────────── Protected Routes ──────────────────────────────────

const publicRoutes = ["/signup", "/api/auth", "/api/webhooks"];
const adminRoutes = ["/settings/rbac", "/admin"];
const tenantOptionalRoutes = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/otp/send",
  "/api/auth/otp/verify",
  "/api/auth/token-login",
  "/api/tenant/memberships",
  "/api/tenant/switch",
];

// ────────────────────── Logger Middleware ────────────────────────────────

function logRequest(request: NextRequest, requestId: string): void {
  const { pathname, search } = request.nextUrl;
  const method = request.method;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] [${requestId}] ${method} ${pathname}${search}`);
}

// ────────────────────── Authentication Middleware ────────────────────────

function isAuthenticated(request: NextRequest): {
  isAuth: boolean;
  token: string | null;
  userId: string | null;
  tenantId: string | null;
} {
  const token = request.cookies.get("auth-token")?.value;
  const userId = request.cookies.get("user-id")?.value;
  const tenantIdCookie = request.cookies.get("tenant-id")?.value;

  let tokenTenantId: string | null = null;
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], "base64").toString();
        const payload = JSON.parse(payloadJson) as { tenant_id?: string };
        tokenTenantId = payload.tenant_id ?? null;
      }
    } catch {
      tokenTenantId = null;
    }
  }

  const tenantId = tokenTenantId || tenantIdCookie || null;

  return {
    isAuth: !!token || !!userId,
    token: token || null,
    userId: userId || null,
    tenantId,
  };
}

// ────────────────────── Authorization Middleware ────────────────────────

function checkAuthorization(
  pathname: string,
  isAuthenticated: boolean,
  userRole: string | null,
): {
  authorized: boolean;
  reason?: string;
} {
  // Root path is always public (it's the login page)
  if (pathname === "/") {
    return { authorized: true };
  }

  // Check other public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return { authorized: true };
  }

  // All other routes require authentication
  if (!isAuthenticated) {
    return {
      authorized: false,
      reason: "Authentication required",
    };
  }

  // Admin routes require super_admin role
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (userRole !== "super_admin") {
      return {
        authorized: false,
        reason: "Admin access required",
      };
    }
  }

  return { authorized: true };
}

// ────────────────────── Main Middleware (Proxy) ────────────────────────────────

export function proxy(request: NextRequest, event?: NextFetchEvent) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { pathname } = request.nextUrl;

  // Log all requests
  logRequest(request, requestId);

  // Check authentication
  const { isAuth, token, userId, tenantId } = isAuthenticated(request);

  // If authenticated and on login/signup page, redirect to dashboard
  if (isAuth && (pathname === "/" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Get user role from cookie or header
  const userRole = request.cookies.get("user-role")?.value || null;

  // Check authorization
  const { authorized, reason } = checkAuthorization(pathname, isAuth, userRole);

  if (!authorized) {
    // Log unauthorized attempt
    console.warn(
      `[${new Date().toISOString()}] [${requestId}] UNAUTHORIZED: ${reason} - ${pathname}`,
    );

    if (pathname.startsWith("/api")) {
      // Return JSON error for API routes
      return NextResponse.json(
        {
          error: reason || "Unauthorized",
          requestId,
        },
        { status: 401 },
      );
    }

    // Redirect to login for page routes
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const requiresTenant =
    isAuth &&
    !publicRoutes.some((route) => pathname.startsWith(route)) &&
    !tenantOptionalRoutes.some((route) => pathname.startsWith(route));

  if (requiresTenant && !tenantId) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error: "Tenant context required",
          requestId,
        },
        { status: 400 },
      );
    }

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("tenant_required", "1");
    return NextResponse.redirect(redirectUrl);
  }

  // Add request ID and user info to headers for downstream processing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  if (userId) requestHeaders.set("x-user-id", userId);
  if (userRole) requestHeaders.set("x-user-role", userRole);
  if (token) requestHeaders.set("x-auth-token", token);
  if (tenantId) requestHeaders.set("x-tenant-id", tenantId);

  // Continue with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
