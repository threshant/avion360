import { NextResponse } from "next/server";

/**
 * POST /api/auth/verify-password
 * Verify admin password for accessing sensitive settings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 },
      );
    }

    // Get admin password from environment
    // In production, verify against user's actual password from database
    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      // If no password set, deny access
      return NextResponse.json(
        { message: "Admin verification not configured" },
        { status: 500 },
      );
    }

    // Verify password
    const isValid = password === correctPassword;

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      message: "Password verified",
      verified: true,
    });
  } catch (err) {
    console.error("Password verification error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
