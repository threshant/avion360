import { getUserIdFromRequest } from "@/lib/auth-middleware";
import { NextRequest, NextResponse } from "next/server";

const TELECMI_PLAY_ENDPOINT = "https://rest.telecmi.com/v2/play";

export async function GET(req: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appId = process.env.TELECMI_APP_ID?.trim();
    const appSecret = process.env.TELECMI_APP_SECRET?.trim();
    const file = req.nextUrl.searchParams.get("file")?.trim();

    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          error:
            "TeleCMI credentials not configured. Set TELECMI_APP_ID and TELECMI_APP_SECRET.",
        },
        { status: 503 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Missing file query parameter" },
        { status: 400 },
      );
    }

    const playUrl = new URL(TELECMI_PLAY_ENDPOINT);
    playUrl.searchParams.set("appid", appId);
    playUrl.searchParams.set("secret", appSecret);
    playUrl.searchParams.set("file", file);

    const range = req.headers.get("range");
    const upstream = await fetch(playUrl.toString(), {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      const details = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Unable to fetch recording from TeleCMI", details },
        { status: upstream.status || 502 },
      );
    }

    const headers = new Headers();
    const passThroughHeaders = [
      "content-type",
      "content-length",
      "accept-ranges",
      "content-range",
      "content-disposition",
      "cache-control",
    ];

    for (const headerName of passThroughHeaders) {
      const headerValue = upstream.headers.get(headerName);
      if (headerValue) {
        headers.set(headerName, headerValue);
      }
    }

    if (!headers.get("content-type")) {
      headers.set("content-type", "audio/wav");
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("[GET /api/telecmi/play]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
