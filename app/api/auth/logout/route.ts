// ── POST /api/auth/logout ─────────────────────────────────────────

export async function POST() {
  // Clear both auth cookies
  const response = new Response(
    JSON.stringify({ message: "Logged out successfully" }),
  );
  response.headers.set(
    "Set-Cookie",
    "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
  response.headers.append(
    "Set-Cookie",
    "user-id=; Path=/; SameSite=Lax; Max-Age=0",
  );
  response.headers.append(
    "Set-Cookie",
    "tenant-id=; Path=/; SameSite=Lax; Max-Age=0",
  );
  return response;
}
