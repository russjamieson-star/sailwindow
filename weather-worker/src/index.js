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

export default {
  async fetch(request, env, ctx){
    const origin = request.headers.get("Origin");
    if(request.method === "OPTIONS"){
      return new Response(null, { status: 204, headers: {
        ...corsHeaders(origin), "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    }
    if(request.method !== "GET") return json(405, { error: true, reason: "GET only" }, origin);

    const url = new URL(request.url);
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
