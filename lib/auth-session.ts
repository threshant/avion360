import type { LoginResponse, User } from "@/types/auth";
import * as crypto from "crypto";
import { NextResponse } from "next/server";

export function generateToken(
  userId: string,
  tenantId?: string | null,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64");
  const payloadObject: Record<string, unknown> = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  };
  if (tenantId) {
    payloadObject.tenant_id = tenantId;
  }
  const payload = Buffer.from(JSON.stringify(payloadObject)).toString("base64");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "demo-secret-key")
    .update(`${header}.${payload}`)
    .digest("base64");
  return `${header}.${payload}.${signature}`;
}

export function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as User["role"],
    phone: (row.phone as string) ?? undefined,
    designation: (row.designation as string) ?? undefined,
    department: (row.department as string) ?? undefined,
    avatarUrl: (row.avatar_url as string) ?? undefined,
    tenantId: (row.tenant_id as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    lastLogin: (row.last_login as string) ?? new Date().toISOString(),
  };
}

export function buildLoginResponse(
  userRow: Record<string, unknown>,
  tenantId?: string | null,
): LoginResponse {
  const token = generateToken(userRow.id as string, tenantId);
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    token,
    user: {
      ...toUser(userRow),
      tenantId: tenantId ?? null,
    },
    tenantId: tenantId ?? null,
    expiresAt,
  };
}

export function createLoginNextResponse(response: LoginResponse): NextResponse {
  const cookieResponse = NextResponse.json(response);
  cookieResponse.cookies.set("auth-token", response.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  cookieResponse.cookies.set("user-id", response.user.id, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  if (response.tenantId) {
    cookieResponse.cookies.set("tenant-id", response.tenantId, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
  }
  return cookieResponse;
}
