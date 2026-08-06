import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify JWT token signature
 */
function verifyTokenSignature(token: string): {
  valid: boolean;
  payload: any;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, payload: null };

    const [headerB64, payloadB64, signatureB64] = parts;
    const secret = process.env.JWT_SECRET || "demo-secret-key";

    // Verify signature
    const expectedSignature = createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64");

    if (signatureB64 !== expectedSignature) {
      return { valid: false, payload: null };
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, payload: null };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

export function getAuthPayloadFromRequest(
  request: NextRequest,
): Record<string, unknown> | null {
  const authToken = request.cookies.get("auth-token")?.value;
  if (!authToken) {
    return null;
  }
  const { valid, payload } = verifyTokenSignature(authToken);
  if (!valid || !payload || typeof payload !== "object") {
    return null;
  }
  return payload as Record<string, unknown>;
}

/**
 * Extract the authenticated user ID from the request.
 * Reads from the `auth-token` cookie (JWT) and falls back to the
 * `user-id` cookie for backwards-compatibility.
 * Returns null when no valid token is found.
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const payload = getAuthPayloadFromRequest(request);
  if (payload?.sub && typeof payload.sub === "string") {
    return payload.sub;
  }

  // Fallback: plain user-id cookie (kept for older sessions)
  const userIdCookie = request.cookies.get("user-id")?.value;
  if (userIdCookie) return userIdCookie;

  return null;
}

/**
 * Resolve tenant from JWT claim first, then tenant-id cookie fallback.
 */
export function getTenantIdFromRequest(request: NextRequest): string | null {
  const payload = getAuthPayloadFromRequest(request);
  const tokenTenant = payload?.tenant_id;
  if (typeof tokenTenant === "string" && tokenTenant.trim()) {
    return tokenTenant;
  }

  const tenantCookie = request.cookies.get("tenant-id")?.value;
  if (tenantCookie && tenantCookie.trim()) {
    return tenantCookie;
  }

  return null;
}

export function requireTenantIdFromRequest(request: NextRequest): string {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    throw new Error("Tenant context missing");
  }
  return tenantId;
}

/**
 * Verify that the request is from an authenticated super_admin user
 * Extracts user info from JWT token in Authorization header
 */
export async function verifySuperAdminAuth(request: NextRequest) {
  try {
    // Get the token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return {
        isValid: false,
        user: null,
        error: "Missing authorization header",
      };
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return { isValid: false, user: null, error: "Missing token" };
    }

    // Verify token signature and get payload
    const { valid, payload } = verifyTokenSignature(token);
    if (!valid || !payload?.sub) {
      return { isValid: false, user: null, error: "Invalid or expired token" };
    }

    const userId = payload.sub;
    const supabase = createServerSupabaseClient();

    // Get user details from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return { isValid: false, user: null, error: "User not found" };
    }

    // Check if user is super_admin
    if (userData.role !== "super_admin") {
      return {
        isValid: false,
        user: userData,
        error: "This action requires super_admin privileges",
      };
    }

    return { isValid: true, user: userData, error: null };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { isValid: false, user: null, error: "Authentication failed" };
  }
}

/**
 * Create a 403 Forbidden response
 */
export function createUnauthorizedResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthenticatedResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create a 400 Bad Request response
 */
export function createBadRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Create a 500 Internal Server Error response
 */
export function createErrorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
