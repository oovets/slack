import { NextRequest } from "next/server";

/**
 * Catch-all proxy to the aspace backend (world:8787 by default).
 * Forwards any GET under /api/aspace/<path> to {ASPACE_API_BASE}/api/<path>
 * with the Bearer token from ASPACE_API_TOKEN.
 *
 * Used by /host/[hostname]/page.tsx which mirrors HostEventDashboard.tsx.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const base = process.env.ASPACE_API_BASE;
  const token = process.env.ASPACE_API_TOKEN;
  if (!base || !token) {
    return new Response(
      JSON.stringify({ error: "ASPACE_API_BASE / ASPACE_API_TOKEN not configured" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const { path } = await context.params;
  const url = new URL(`${base.replace(/\/$/, "")}/api/${path.join("/")}`);
  // Forward query string
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // We don't proxy the browser's cookies — the token is sufficient.
      cache: "no-store",
    });

    // Stream body as-is (works for JSON and binary like MJPEG frames).
    const headers = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const sizeKB = upstream.headers.get("x-size-kb");
    if (sizeKB) headers.set("x-size-kb", sizeKB);
    headers.set("cache-control", "no-store");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "proxy failed", detail: String(error) }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
