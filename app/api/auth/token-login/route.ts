import {
  buildLoginResponse,
  createLoginNextResponse,
} from "@/lib/auth-session";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { resolveActiveTenantForUser } from "@/lib/tenant-auth";
import * as crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function verifyTokenSignature(token: string): {
  valid: boolean;
  payload: any;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, payload: null };

    const [headerB64, payloadB64, signatureB64] = parts;
    const secret = process.env.JWT_SECRET || "demo-secret-key";

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64");

    if (signatureB64 !== expectedSignature)
      return { valid: false, payload: null };

    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now)
      return { valid: false, payload: null };

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, tenantId: preferredTenantId } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Fix potential mangling where '+' was converted to ' ' in URL query params
    const normalizedToken = token.replace(/ /g, "+");

    const { valid, payload } = verifyTokenSignature(normalizedToken);
    if (!valid || !payload?.sub) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const userId = payload.sub;
    const supabase = createServerSupabaseClient();

    // Fetch user
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found or inactive" },
        { status: 401 },
      );
    }

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", user.id);

    const tenantId = await resolveActiveTenantForUser(
      supabase,
      { id: user.id as string, name: user.name as string },
      typeof preferredTenantId === "string" ? preferredTenantId : null,
    );

    // Generate a fresh long-lived token
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64");
    const newPayload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        tenant_id: tenantId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      }),
    ).toString("base64");
    const signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "demo-secret-key")
      .update(`${header}.${newPayload}`)
      .digest("base64");
    const longLivedToken = `${header}.${newPayload}.${signature}`;

    const response = buildLoginResponse(user, tenantId);
    response.token = longLivedToken;

    return createLoginNextResponse(response);
  } catch (error) {
    console.error("Token login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
