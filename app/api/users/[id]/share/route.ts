import { NextRequest, NextResponse } from "next/server";
import {
  verifySuperAdminAuth,
  createUnauthenticatedResponse,
  createErrorResponse,
} from "@/lib/auth-middleware";
import * as crypto from "crypto";

/**
 * POST /api/users/[id]/share - Generate a shareable login token for a user
 * Protected: Super admin only
 */

function generateShareToken(userId: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64");
  
  // Share tokens expire in 1 hour for security
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      shared: true,
    }),
  ).toString("base64");
  
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "demo-secret-key")
    .update(`${header}.${payload}`)
    .digest("base64");
    
  return `${header}.${payload}.${signature}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify super admin
    const auth = await verifySuperAdminAuth(request);
    if (!auth.isValid) {
      return createUnauthenticatedResponse(auth.error || "Unauthorized");
    }

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Generate token
    const token = generateShareToken(id);
    
    // Construct shareable URL
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const shareUrl = `${baseUrl}?share_token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      data: {
        token,
        shareUrl,
        expiresIn: 3600,
      }
    });
  } catch (error) {
    console.error("Error generating share token:", error);
    return createErrorResponse("Failed to generate share token");
  }
}
