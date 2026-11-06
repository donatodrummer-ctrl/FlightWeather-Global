export async function onRequest({ request }) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const dist = Math.min(250, Math.max(1, Number(url.searchParams.get("dist")) || 100));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Coordinate non valide" }, { status: 400 });
  }
  const upstream = `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`;
  try {
    const response = await fetch(upstream, {
      headers: { "Accept": "application/json", "User-Agent": "FlightWeather-Global/1.0" },
      cf: { cacheTtl: 5, cacheEverything: true }
    });
    if (!response.ok) {
      return Response.json({ error: "Fonte ADS-B momentaneamente non disponibile", upstreamStatus: response.status }, {
        status: response.status,
        headers: { "Cache-Control": "no-store" }
      });
    }
    const data = await response.json();
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=5, s-maxage=5", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return Response.json({ error: "Errore nel collegamento alla fonte ADS-B" }, { status: 502 });
  }
}
