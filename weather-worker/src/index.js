// Ask Captain Jim weather proxy (Cloudflare Worker).
//
// Why this exists:
//  1. Keeps the commercial Open-Meteo API key off the public site. The key lives
//     in the Worker secret OPEN_METEO_KEY (set with `npx wrangler secret put
//     OPEN_METEO_KEY`) and is never sent to browsers.
//  2. Shares forecasts between subscribers. Responses are cached at Cloudflare's
//     edge for CACHE_SECONDS, so a hundred people panning the wind map cost about
//     the same Open-Meteo usage as one.
//
// Routes (query strings are passed through to Open-Meteo after validation):
//   GET /forecast?latitude=..&longitude=..&hourly=..   -> customer-api.open-meteo.com/v1/forecast
//   GET /marine?latitude=..&longitude=..&hourly=..     -> customer-marine-api.open-meteo.com/v1/marine
//   GET /places/nearby, /places/search                -> Google Places marinas (see below)

const UPSTREAM = {
  "/forecast": "https://customer-api.open-meteo.com/v1/forecast",
  "/marine":   "https://customer-marine-api.open-meteo.com/v1/marine",
};

const CACHE_SECONDS = 30 * 60;   // models update hourly at best; 30 min keeps "Now" fresh
const MAX_LOCATIONS = 300;       // the wind map asks for <=260 grid points per view
const MAX_FORECAST_DAYS = 16;

// Only parameters the app actually uses, so the proxy can't be repurposed as a
// general-purpose Open-Meteo gateway on Russ's key.
const ALLOWED_PARAMS = new Set([
  "latitude", "longitude", "hourly", "daily", "current", "models",
  "wind_speed_unit", "length_unit", "temperature_unit", "precipitation_unit",
  "timezone", "timeformat", "forecast_days", "forecast_hours", "past_days", "cell_selection",
]);

// Browsers on these origins may call the proxy. (Origin checks stop casual
// hot-linking from other sites; they are not a security boundary.)
const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?askcaptainjim\.com$/,
  /^https:\/\/([a-z0-9-]+\.)*sailwindow\.com$/,          // Atlantic edition still lives here
  /^https:\/\/[a-z0-9-]+\.sailwindow(-atlantic|-8l3)?\.pages\.dev$/,   // Cloudflare preview deploys
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,           // local testing
];

function corsHeaders(origin){
  const ok = origin && ALLOWED_ORIGINS.some(re => re.test(origin));
  return ok ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : { "Vary": "Origin" };
}

function json(status, body, origin){
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function validate(params){
  for(const key of params.keys()){
    if(!ALLOWED_PARAMS.has(key)) return `Parameter not allowed: ${key}`;
  }
  const lat = (params.get("latitude") || "").split(",").filter(Boolean);
  const lon = (params.get("longitude") || "").split(",").filter(Boolean);
  if(!lat.length || lat.length !== lon.length) return "latitude and longitude lists are required and must be the same length";
  if(lat.length > MAX_LOCATIONS) return `At most ${MAX_LOCATIONS} locations per request`;
  if(+(params.get("forecast_days") || 0) > MAX_FORECAST_DAYS) return `forecast_days must be ${MAX_FORECAST_DAYS} or less`;
  return null;
}

// ---- Marinas from Google Places (API "New") ----
//   GET /places/nearby?lat=..&lon=..   -> up to 20 marinas within ~25 mi, nearest first
//   GET /places/search?q=..&lat=..&lon=.. -> text search ("Pier One"), marinas ranked first, biased to lat/lon
// The key lives in the Worker secret GOOGLE_PLACES_KEY. Results are NOT cached here: Google's
// terms don't allow storing Places content (names, phones, ratings), unlike weather data.
const PLACES_FIELDS = [
  "places.id", "places.displayName", "places.location", "places.formattedAddress",
  "places.nationalPhoneNumber", "places.rating", "places.userRatingCount",
  "places.websiteUri", "places.googleMapsUri", "places.types", "places.primaryType",
].join(",");
const NEARBY_RADIUS_M = 40000;

function coord(v, lo, hi){
  if(v == null || String(v).trim() === '') return null;   // Number('') would be 0
  const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

async function places(url, env, origin){
  if(!env.GOOGLE_PLACES_KEY) return json(500, { error: true, reason: "GOOGLE_PLACES_KEY secret is not set" }, origin);
  const lat = coord(url.searchParams.get("lat"), -90, 90), lon = coord(url.searchParams.get("lon"), -180, 180);
  if(lat === null || lon === null) return json(400, { error: true, reason: "lat and lon are required" }, origin);
  const center = { latitude: lat, longitude: lon };

  let endpoint, body;
  if(url.pathname === "/places/nearby"){
    endpoint = "https://places.googleapis.com/v1/places:searchNearby";
    body = { includedTypes: ["marina"], maxResultCount: 20, rankPreference: "DISTANCE",
             locationRestriction: { circle: { center, radius: NEARBY_RADIUS_M } } };
  } else if(url.pathname === "/places/search"){
    const q = (url.searchParams.get("q") || "").trim();
    if(q.length < 2 || q.length > 80) return json(400, { error: true, reason: "q must be 2–80 characters" }, origin);
    endpoint = "https://places.googleapis.com/v1/places:searchText";
    body = { textQuery: q, includedType: "marina", maxResultCount: 10,
             locationBias: { circle: { center, radius: 50000 } } };
  } else {
    return json(404, { error: true, reason: "Use /places/nearby or /places/search" }, origin);
  }

  const up = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.GOOGLE_PLACES_KEY, "X-Goog-FieldMask": PLACES_FIELDS },
    body: JSON.stringify(body),
  });
  const data = await up.json().catch(() => ({}));
  if(!up.ok) return json(up.status, { error: true, reason: data.error?.message || `Places ${up.status}` }, origin);

  const out = (data.places || []).map(p => ({
    id: p.id,
    name: p.displayName?.text || "Marina",
    lat: p.location?.latitude, lon: p.location?.longitude,
    address: p.formattedAddress || "",
    phone: p.nationalPhoneNumber || "",
    rating: p.rating ?? null, reviews: p.userRatingCount ?? null,
    website: p.websiteUri || "", mapsUrl: p.googleMapsUri || "",
    isMarina: (p.types || []).includes("marina"),
    primaryType: p.primaryType || "",
  })).filter(p => p.lat != null && p.lon != null)
     // Google also tags charters, sailing schools, repair shops and rentals as "marina"; for the
     // nearby list keep only places whose MAIN type is marina. Name searches keep everything.
     .filter(p => url.pathname !== "/places/nearby" || p.primaryType === "marina");
  return new Response(JSON.stringify(out), {
    status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(origin) } });
}

export default {
  async fetch(request, env, ctx){
    const origin = request.headers.get("Origin");
    if(request.method === "OPTIONS"){
      return new Response(null, { status: 204, headers: {
        ...corsHeaders(origin), "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    }
    if(request.method !== "GET") return json(405, { error: true, reason: "GET only" }, origin);

    const url = new URL(request.url);
    if(url.pathname.startsWith("/places/")) return places(url, env, origin);
    const upstream = UPSTREAM[url.pathname];
    if(!upstream) return json(404, { error: true, reason: "Use /forecast or /marine" }, origin);
    if(!env.OPEN_METEO_KEY) return json(500, { error: true, reason: "OPEN_METEO_KEY secret is not set" }, origin);

    const problem = validate(url.searchParams);
    if(problem) return json(400, { error: true, reason: problem }, origin);

    // Cache on the sorted query (without the key) so identical requests share an entry.
    url.searchParams.sort();
    const cacheKey = new Request(`https://cache.askcaptainjim.internal${url.pathname}?${url.searchParams}`);
    const cache = caches.default;
    let res = await cache.match(cacheKey);

    if(!res){
      const target = new URL(upstream);
      url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
      target.searchParams.set("apikey", env.OPEN_METEO_KEY);
      const up = await fetch(target.toString(), { headers: { "Accept": "application/json" } });
      const body = await up.text();
      res = new Response(body, { status: up.status, headers: { "Content-Type": "application/json" } });
      // Only cache successes; errors (bad key, quota) should retry on the next request.
      if(up.ok){
        res.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
        ctx.waitUntil(cache.put(cacheKey, res.clone()));
      }
    }

    // Copy so CORS headers can vary per caller without polluting the cached entry.
    const out = new Response(res.body, res);
    for(const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
    out.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
    return out;
  },
};
