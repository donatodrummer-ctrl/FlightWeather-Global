export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowed = new Set([
      "https://donatodrummer-ctrl.github.io",
      "http://localhost:8787"
    ]);
    const corsOrigin = allowed.has(origin) ? origin : "https://donatodrummer-ctrl.github.io";
    const headers = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers });

    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const dist = Math.round(Number(url.searchParams.get("dist") || 100));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || !Number.isFinite(dist) || dist < 1 || dist > 250) {
      return new Response(JSON.stringify({ error: "Parametri lat/lon/dist non validi" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" }
      });
    }

    const upstream = `https://api.adsb.lol/v2/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`;
    try {
      const response = await fetch(upstream, {
        headers: { "Accept": "application/json", "User-Agent": "FlightWeather-Global/1.0" },
        cf: { cacheTtl: 2, cacheEverything: true }
      });
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: { ...headers, "Content-Type": response.headers.get("Content-Type") || "application/json", "Cache-Control": "public, max-age=2" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Fonte adsb.lol non raggiungibile" }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json" }
      });
    }
  }
};
