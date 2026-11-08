/**
 * FlightWeather Global — Cloudflare Worker ADS-B proxy
 * Upstream: adsb.lol public API (ODbL 1.0)
 * Deploy this file as the Worker entry point in Cloudflare.
 */
const ALLOWED_ORIGIN = "https://donatodrummer-ctrl.github.io";
const UPSTREAM = "https://api.adsb.lol/v2/point";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    if (origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const dist = Number(url.searchParams.get("dist") || 100);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180 ||
        !Number.isFinite(dist) || dist < 1 || dist > 250) {
      return new Response(JSON.stringify({ error: "Invalid lat, lon or dist (1–250 NM)" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const upstreamUrl = `${UPSTREAM}/${lat}/${lon}/${dist}`;
    try {
      const upstream = await fetch(upstreamUrl, {
        headers: { "Accept": "application/json", "User-Agent": "FlightWeatherGlobal/1.0" },
        cf: { cacheTtl: 5, cacheEverything: true }
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...cors,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=5"
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "ADS-B upstream unavailable" }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" }
      });
    }
  }
};
