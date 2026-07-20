// ─────────────────────────────────────────────────────────────────
// SailWindow shared engine — scoring, tide/weather fetch, marina cards,
// subscribe modal, trial/entitlement system, Stripe checkout.
//
// Extracted 2026-07-20 from dist/index.html (Gulf), after a full function-
// by-function diff of every function in Gulf vs. Atlantic confirmed 118
// were already byte-identical (a straight copy-paste fork) and 8 more
// (activateSubscription, buildMarinaCards, chooseFreeMode,
// handleStripeCheckout, marinaPhoto, nearestStationId, openSubscribeModal,
// resetPrefs) differed only in a handful of edition-specific literals —
// default marina, NOAA station count, partner-site messaging, the NOAA
// station list itself. Those 8 are parameterized here via the global
// EDITION_CONFIG object (see config.gulf.js / config.atlantic.js), which
// each edition's own file defines BEFORE this script loads.
//
// Deliberately NOT included (stays in each edition's own file/data):
//   - LOCATIONS, MARINA_META, MARINA_PHOTOS (the actual marina content)
//   - DRAWBRIDGES / BRIDGE_DATA / legForBridge / renderBridgeSchedules /
//     renderBridges / toggleBridges (bridges vs. locks vs. river gauges
//     differ enough per body of water that forcing them into this engine
//     now, before Great Lakes/Mississippi data is researched, would mean
//     guessing at an abstraction — see CLAUDE.md's Long-Range Roadmap)
//   - submitWaitlist (Gulf-only: it's Gulf's own page promoting the next
//     edition to Gulf visitors, not a per-edition mechanism)
//
// fetchTides/fetchTideHiLo (the NOAA CO-OPS calls) ARE included below,
// since they're identical between Gulf and Atlantic today — both are
// ocean/coastal tide editions. Great Lakes/Mississippi will need a
// genuinely different conditions provider (lake level / river stage, not
// ocean tide predictions) — that's new code alongside this engine later,
// not a change to it now.
// ─────────────────────────────────────────────────────────────────

const STORAGE_KEY       = "sailwindow.preferences.v1";
const ASHORE_CACHE_KEY  = "sailwindow.ashore.v1";
const SW_DB_CACHE_KEY   = "sailwindow.marinadb.v1";
const TRIAL_DAYS        = 7;
const TRIAL_KEY         = "sailwindow.trial.start";
const SUB_KEY           = "sailwindow.subscription";
const FEEDBACK_EMAIL    = "feedback@sailwindow.com";
const MARINA_CACHE_KEY  = "sailwindow.marina.v1";
const MARINA_CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 hours
const CRUISERS_LOG_URL  = "https://script.google.com/macros/s/AKfycbxRNxjqhSvUuYD49yHGYu9F4qiIPa8mR-uZx2CrzmpgJVt27UEB1RRKvwOrAovPO1SP/exec";
const SW_DB_VER      = EDITION_CONFIG.dbVersion;
const FREE_KEYS      = new Set(EDITION_CONFIG.freeKeys);
const STRIPE_MONTHLY = EDITION_CONFIG.stripeMonthly;
const STRIPE_ANNUAL  = EDITION_CONFIG.stripeAnnual;
const STRIPE_BUNDLE  = EDITION_CONFIG.stripeBundle;

function storageAvailable(){
  try{ const k="__sw_test__"; localStorage.setItem(k,"1"); localStorage.removeItem(k); return true; }
  catch(e){ return false; }
}

function savePrefsToStorage(){
  if(!storageAvailable()) return;
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); updateStorageBadge(true); }
  catch(e){ console.warn("Could not save preferences:", e); updateStorageBadge(false); }
}

function loadPrefsFromStorage(){
  if(!storageAvailable()){ updateStorageBadge(false); return; }
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){ updateStorageBadge(true, false); return; }
    prefs = { ...prefs, ...JSON.parse(raw) };
    updateStorageBadge(true, true);
  }catch(e){ console.warn("Could not load preferences:", e); updateStorageBadge(false); }
}

function clearSavedPrefs(){ if(storageAvailable()) localStorage.removeItem(STORAGE_KEY); }

function saveMarinaCacheLs(lat, lon, data){
  if(!storageAvailable()) return;
  try{
    localStorage.setItem(MARINA_CACHE_KEY, JSON.stringify({
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
      savedAt: Date.now(), data
    }));
  }catch(e){ /* quota exceeded — silently skip */ }
}

function loadMarinaCacheLs(lat, lon){
  if(!storageAvailable()) return null;
  try{
    const raw = localStorage.getItem(MARINA_CACHE_KEY);
    if(!raw) return null;
    const c = JSON.parse(raw);
    if(c.lat !== Math.round(lat * 100) / 100) return null; // different area
    if(c.lon !== Math.round(lon * 100) / 100) return null;
    if(Date.now() - c.savedAt > MARINA_CACHE_TTL) return null; // stale (>24h)
    return c.data;
  }catch(e){ return null; }
}

function updateStorageBadge(ok, hasSaved=true){
  const el = document.getElementById("pv-storage");
  if(!el) return;
  el.textContent = !ok ? "Unavailable" : hasSaved ? "Saved" : "Ready";
}

function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.transform = "translateX(-50%) translateY(0)";
  setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateX(-50%) translateY(10px)"; }, 2500);
}

function showBanner(msg, type="info"){ const b=document.getElementById("banner"); b.textContent=msg; b.className="banner "+type; }

function hideBanner(){ document.getElementById("banner").className="banner"; }

function setLoading(on){
  const s1=document.getElementById("mini-spin"), s2=document.getElementById("refresh-spin"), btn=document.getElementById("refresh-btn");
  if(on){ s1.classList.add("spinning"); s2.classList.add("spinning"); btn.disabled=true; }
  else  { s1.classList.remove("spinning"); s2.classList.remove("spinning"); btn.disabled=false; }
}

function fmtTime(isoStr){ return new Date(isoStr).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); }

function nowTimeStr(){ return new Date().toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}); }

function todayDateStr(){ const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return y+m+dd; }

function parseWindKts(s){ if(!s) return 0; const m=s.match(/(\d+)/); return m ? parseInt(m[1],10) : 0; }

function openModal(){
  const modal = document.getElementById("modal");
  updateLockState();
  document.getElementById("p-loc").value = prefs.locKey;
  document.getElementById("p-wmin").value = prefs.windMin;
  document.getElementById("p-wmax").value = prefs.windMax;
  document.getElementById("p-gust").value = prefs.gustMax;
  document.getElementById("p-dur").value  = prefs.durationHrs;
  document.getElementById("p-tide").value = prefs.tidePref;
  document.getElementById("p-cname").value   = prefs.custom?.name || "My Marina";
  document.getElementById("p-lat").value     = prefs.custom?.lat ?? 27.9060;
  document.getElementById("p-lon").value     = prefs.custom?.lon ?? -82.4167;
  document.getElementById("p-station").value = prefs.custom?.stationId || "8726667";
  toggleCustomFields();
  modal.style.cssText = "display:flex;opacity:1;pointer-events:all;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999";
  const sheet = modal.querySelector('.sheet');
  if(sheet) sheet.style.transform = 'translateY(0)';
}

function closeModal(){
  const modal = document.getElementById("modal");
  modal.style.opacity = "0";
  modal.style.pointerEvents = "none";
  modal.style.display = "none";
  const sheet = modal.querySelector('.sheet');
  if(sheet) sheet.style.transform = 'translateY(20px)';
}

function toggleCustomFields(){
  const v = document.getElementById("p-loc").value;
  const isCustom = v === "custom", isCurrent = v === "current";
  document.getElementById("custom-fields").style.display = (isCustom || isCurrent) ? "flex" : "none";
  ["p-cname","p-lat","p-lon","p-station"].forEach(id => {
    const el = document.getElementById(id); if(el) el.disabled = isCurrent;
  });
  const btn = document.querySelector('#custom-fields button');
  if(btn) btn.textContent = isCurrent ? "Using device GPS" : "Use Current GPS";
}

function syncPrefsUI(){
  document.getElementById("p-loc").value     = prefs.locKey;
  document.getElementById("p-wmin").value    = prefs.windMin;
  document.getElementById("p-wmax").value    = prefs.windMax;
  document.getElementById("p-gust").value    = prefs.gustMax;
  document.getElementById("p-dur").value     = prefs.durationHrs;
  document.getElementById("p-tide").value    = prefs.tidePref;
  document.getElementById("p-cname").value   = prefs.custom?.name || "My Marina";
  document.getElementById("p-lat").value     = prefs.custom?.lat ?? 27.9060;
  document.getElementById("p-lon").value     = prefs.custom?.lon ?? -82.4167;
  document.getElementById("p-station").value = prefs.custom?.stationId || "8726667";
  toggleCustomFields();
  document.getElementById("pv-wind").textContent = prefs.windMin + "–" + prefs.windMax + " kt";
  document.getElementById("pv-gust").textContent = prefs.gustMax + " kt";
  document.getElementById("pv-dur").textContent  = prefs.durationHrs + " hrs";
  const sel = document.getElementById("p-tide");
  document.getElementById("pv-tide").textContent = sel.options[sel.selectedIndex].text;
}

function savePrefs(){
  prefs.locKey      = document.getElementById("p-loc").value;
  prefs.windMin     = +document.getElementById("p-wmin").value;
  prefs.windMax     = +document.getElementById("p-wmax").value;
  prefs.gustMax     = +document.getElementById("p-gust").value;
  prefs.durationHrs = +document.getElementById("p-dur").value;
  prefs.tidePref    = document.getElementById("p-tide").value;
  if(prefs.locKey === "custom"){
    prefs.custom = {
      enabled:true,
      name: (document.getElementById("p-cname").value || "My Marina").trim(),
      lat:  parseFloat(document.getElementById("p-lat").value),
      lon:  parseFloat(document.getElementById("p-lon").value),
      stationId: (document.getElementById("p-station").value || "").trim()
    };
    if(isNaN(prefs.custom.lat) || isNaN(prefs.custom.lon) || !prefs.custom.stationId){
      toast("Enter valid custom GPS and NOAA station ID"); return;
    }
  } else if(prefs.locKey === "current"){
    if(prefs.current?.lat == null || !prefs.current?.stationId){
      toast("Tap Use Current GPS first"); return;
    }
  } else {
    prefs.custom = { ...prefs.custom, enabled:false };
  }
  syncPrefsUI();
  savePrefsToStorage();
  closeModal();
  loadAll();
}

function togglePrefs(){
  const b=document.getElementById("prefs-body"), a=document.getElementById("prefs-arr"), h=document.getElementById("prefs-toggle");
  const open = b.style.display === "none" || b.style.display === "";
  b.style.display = open ? "flex" : "none";
  a.classList.toggle("open", open);
  h.setAttribute("aria-expanded", open);
}

function fetchWithTimeout(url, opts={}, ms=8000){
  const ctrl = new AbortController();
  const tid = setTimeout(()=>ctrl.abort(), ms);
  return fetch(url, {...opts, signal:ctrl.signal}).finally(()=>clearTimeout(tid));
}

async function withRetry(fn, tries=2, delay=1500){
  for(let i=0; i<tries; i++){
    try{ return await fn(); }
    catch(e){ if(i===tries-1) throw e; await new Promise(r=>setTimeout(r,delay)); }
  }
}

async function fetchNWS(lat, lon){
  const UA = "(sailwindow.app, sailor@sailwindow.app)";
  return withRetry(async ()=>{
    const pRes = await fetchWithTimeout(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {headers:{"User-Agent":UA,"Accept":"application/geo+json"}});
    if(!pRes.ok) throw new Error(`NWS /points failed: ${pRes.status}`);
    const pJson = await pRes.json();
    const hourlyUrl = pJson.properties.forecastHourly;
    if(!hourlyUrl) throw new Error("NWS did not return forecastHourly URL");
    const hRes = await fetchWithTimeout(hourlyUrl, {headers:{"User-Agent":UA,"Accept":"application/geo+json"}});
    if(!hRes.ok) throw new Error(`NWS hourly failed: ${hRes.status}`);
    return (await hRes.json()).properties.periods;
  });
}

function degToCardinal(deg){
  if(deg==null) return '—';
  const d=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return d[Math.round(((deg%360)+360)%360/22.5)%16];
}

function wmoToForecast(code){
  if(code===0)  return 'Clear Sky';
  if(code<=3)   return 'Partly Cloudy';
  if(code<=48)  return 'Fog';
  if(code<=67)  return 'Rainy';
  if(code<=77)  return 'Snow';
  if(code<=82)  return 'Rain Showers';
  if(code<=99)  return 'Thunderstorm';
  return 'Overcast';
}

async function fetchOpenMeteo(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=windspeed_10m,windgusts_10m,winddirection_10m,precipitation_probability,weathercode&wind_speed_unit=kn&timezone=auto&forecast_days=7&models=ecmwf_ifs025`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`Open-Meteo ECMWF failed: ${res.status}`);
  const json = await res.json();
  if(json.error) throw new Error('Open-Meteo: '+json.error.reason);
  const h = json.hourly;
  return h.time.map((t,i)=>({
    startTime: t,
    windSpeed:    `${Math.round(h.windspeed_10m[i]??0)} kt`,
    windGust:     `${Math.round(h.windgusts_10m[i]??h.windspeed_10m[i]??0)} kt`,
    windDirection: degToCardinal(h.winddirection_10m[i]??0),
    probabilityOfPrecipitation:{ value: h.precipitation_probability[i]??0 },
    shortForecast: wmoToForecast(h.weathercode[i]??0)
  }));
}

async function fetchTides(stationId){
  const date = todayDateStr();
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=sailwindow&begin_date=${date}&end_date=${date}&datum=MLLW&station=${stationId}&time_zone=lst_ldt&units=english&interval=h&format=json`;
  const res = await fetch(url); if(!res.ok) throw new Error(`NOAA tides failed: ${res.status}`);
  const json = await res.json(); if(json.error) throw new Error("NOAA: " + json.error.message);
  return json.predictions;
}

async function fetchTideHiLo(stationId){
  const date = todayDateStr();
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=sailwindow&begin_date=${date}&end_date=${date}&datum=MLLW&station=${stationId}&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
  const res = await fetch(url); if(!res.ok) throw new Error(`NOAA hilo failed: ${res.status}`);
  const json = await res.json(); if(json.error) throw new Error("NOAA hilo: " + json.error.message);
  return json.predictions;
}

async function fetchNearbyMarinas(lat, lon, radiusMeters=48280){
  const query = `[out:json][timeout:25];(node["amenity"="marina"](around:${radiusMeters},${lat},${lon});way["amenity"="marina"](around:${radiusMeters},${lat},${lon});relation["amenity"="marina"](around:${radiusMeters},${lat},${lon}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:'data='+encodeURIComponent(query) });
  if(!res.ok) throw new Error('Overpass '+res.status);
  const data = await res.json();
  return (data.elements||[]).map(el=>({
    name: el.tags?.name || 'Unnamed Marina',
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    sub: el.tags?.operator || el.tags?.brand || 'OSM marina',
    tags: el.tags || {}
  })).filter(m => m.lat != null && m.lon != null);
}

function getSwRestaurants(lat, lon){
  if(!SW_MARINA_DB) return { partners:[], restaurants:[] };
  let best = null, bestDist = 999;
  for(const [name, data] of Object.entries(SW_MARINA_DB)){
    const d = distMiles(lat, lon, data.lat, data.lng);
    if(d < bestDist){ bestDist = d; best = data; }
  }
  if(!best || bestDist > 3) return { partners:[], restaurants:[] };
  const partners     = best.restaurants.filter(r => r.partner && r.discount_offer);
  const restaurants  = best.restaurants.filter(r => !r.partner || !r.discount_offer);
  return { partners, restaurants };
}

function findAshorePartners(){ return []; }

function loadAshoreCache(lat, lon){
  try{
    const all = JSON.parse(localStorage.getItem(ASHORE_CACHE_KEY) || "{}");
    const hit = all[lat.toFixed(4) + "," + lon.toFixed(4)];
    if(hit && (Date.now() - hit.at) < MARINA_CACHE_TTL) return hit.data;
  }catch(e){}
  return null;
}

function saveAshoreCache(lat, lon, data){
  try{
    let all = JSON.parse(localStorage.getItem(ASHORE_CACHE_KEY) || "{}");
    if(Object.keys(all).length > 30) all = {};
    all[lat.toFixed(4) + "," + lon.toFixed(4)] = { at: Date.now(), data };
    localStorage.setItem(ASHORE_CACHE_KEY, JSON.stringify(all));
  }catch(e){}
}

async function fetchAshore(lat, lon){
  const cached = loadAshoreCache(lat, lon);
  if(cached) return cached;
  const query = `[out:json][timeout:25];(nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub)$"](around:1200,${lat},${lon});nwr["waterway"="fuel"](around:1600,${lat},${lon});nwr["amenity"="fuel"](around:1600,${lat},${lon}););out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:'data='+encodeURIComponent(query) });
  if(!res.ok) throw new Error('Overpass '+res.status);
  const data = await res.json();
  const items = (data.elements||[]).map(el=>{
    const la = el.lat ?? el.center?.lat, lo = el.lon ?? el.center?.lon, t = el.tags || {};
    return {
      name: t.name || null, lat: la, lon: lo,
      kind: t.waterway === 'fuel' ? 'fuel-dock' : (t.amenity === 'fuel' ? 'fuel-road' : 'food'),
      cuisine: (t.cuisine || '').split(';')[0].replace(/_/g,' '),
      dist: (la != null && lo != null) ? distMiles(lat, lon, la, lo) : null
    };
  }).filter(x => x.dist != null).sort((a,b) => a.dist - b.dist);
  saveAshoreCache(lat, lon, items);
  return items;
}

function marinaHasFuelTag(tags){
  if(!tags) return false;
  return Object.keys(tags).some(k => (k === 'fuel' || k.indexOf('fuel:') === 0) && tags[k] !== 'no')
      || /fuel/i.test(tags['seamark:small_craft_facility:category'] || '');
}

function fmtAshoreDist(mi){ return mi < 0.1 ? Math.round(mi*5280) + ' ft' : mi.toFixed(1) + ' mi'; }

function scorePeriod(period, tideFt, prevTideFt){
  const wind=parseWindKts(period.windSpeed), gust=parseWindKts(period.windGust||"")||wind,
        precip=period.probabilityOfPrecipitation?.value ?? 0,
        fc=(period.shortForecast||"").toLowerCase(),
        isThunder=/thunder|severe|tropical/i.test(fc);
  if(wind < 4 || wind > 26 || gust > prefs.gustMax || precip >= 70 || isThunder) return 0;
  let s = 10;
  if(wind < prefs.windMin) s -= (prefs.windMin - wind) * .5;
  else if(wind > prefs.windMax) s -= (wind - prefs.windMax) * .6;
  const gustSpread = gust - wind;
  if(gustSpread > 7) s -= Math.min(2.5, (gustSpread - 7) * .4);
  if(gust > prefs.gustMax - 3) s -= 1.5;
  s -= Math.min(3, precip / 25);
  if(prefs.tidePref !== "any" && prevTideFt !== null && tideFt !== null){
    const rising = tideFt > prevTideFt;
    if((prefs.tidePref==="incoming"&&rising)||(prefs.tidePref==="outgoing"&&!rising)) s += .5;
    else s -= .3;
  }
  return Math.max(0, Math.min(10, s));
}

function buildTideMap(nwsPeriods, tideArr){
  return nwsPeriods.map(p => {
    const target = new Date(p.startTime).getTime();
    let best = null, bestDiff = Infinity;
    for(const t of tideArr){ const ts=new Date(t.t).getTime(), d=Math.abs(ts-target); if(d<bestDiff){bestDiff=d; best=parseFloat(t.v);} }
    return best;
  });
}

function findBestWindow(hourlyData, tideMap){
  const DUR = Math.max(1, Math.ceil(prefs.durationHrs));
  const NO_WINDOW = { score:0, slice:[], startTime:null, endTime:null, startHour:null, endHour:null };
  const candidates = hourlyData.filter(p => { const h=new Date(p.startTime).getHours(); return h>=7 && h<=18; });
  if(!candidates.length || candidates.length < DUR) return NO_WINDOW;
  let best = -1, bestStart = -1;
  for(let i=0; i<=candidates.length-DUR; i++){
    const slice = candidates.slice(i, i+DUR);
    // the 24-h forecast can jump from this evening to tomorrow morning — only contiguous hours form a real window
    let contiguous = true;
    for(let j=1; j<slice.length; j++){
      if(new Date(slice[j].startTime) - new Date(slice[j-1].startTime) !== 3600000){ contiguous = false; break; }
    }
    if(!contiguous) continue;
    const scores = slice.map((p,j)=>scorePeriod(p, tideMap[i+j]??null, tideMap[i+j-1]??null));
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length, min = Math.min(...scores), ws = .7*avg + .3*min;
    if(ws > best){ best=ws; bestStart=i; }
  }
  if(bestStart < 0) return NO_WINDOW;
  const bestSlice = candidates.slice(bestStart, bestStart+DUR);
  const startDate = new Date(bestSlice[0].startTime);
  const endDate   = new Date(startDate.getTime() + prefs.durationHrs*3600000);
  return { score:best, slice:bestSlice, startTime:bestSlice[0].startTime, endTime:endDate.toISOString(),
           startHour:startDate.getHours(), endHour:startDate.getHours() + prefs.durationHrs };
}

function qualityLabel(score){
  if(score>=9) return {lbl:"Excellent",cls:"q-excellent",emoji:"🟢",stripe:["var(--success)","var(--primary)"]};
  if(score>=7) return {lbl:"Good",cls:"q-good",emoji:"✦",stripe:["var(--primary)","var(--primary)"]};
  if(score>=5) return {lbl:"Marginal",cls:"q-marginal",emoji:"🟡",stripe:["var(--gold)","var(--warn)"]};
  return {lbl:"No-Go",cls:"q-nogo",emoji:"🔴",stripe:["var(--error)","var(--error)"]};
}

function updateScoreCard(score, win){
  const q = qualityLabel(score);
  document.getElementById("score-num").innerHTML = score.toFixed(1) + `<span class="denom">/10</span>`;
  const badge = document.getElementById("q-badge");
  badge.className = "quality-badge " + q.cls;
  document.getElementById("q-emoji").textContent = q.emoji;
  document.getElementById("q-lbl").textContent   = q.lbl;
  document.getElementById("upd-time").textContent  = nowTimeStr();
  document.getElementById("win-depart").textContent = win.startTime ? fmtTime(win.startTime) : "—";
  document.getElementById("win-return").textContent = win.endTime ? fmtTime(win.endTime) : "—";
  document.getElementById("win-dur").textContent    = prefs.durationHrs + " hr";
  const card = document.getElementById("score-card");
  card.style.setProperty("--stripe-a", q.stripe[0]);
  card.style.setProperty("--stripe-b", q.stripe[1]);
}

function buildReasons(slice){
  const winds=slice.map(p=>parseWindKts(p.windSpeed)), gusts=slice.map(p=>parseWindKts(p.windGust||"0")||parseWindKts(p.windSpeed)),
        precips=slice.map(p=>p.probabilityOfPrecipitation?.value??0), fc=slice.map(p=>(p.shortForecast||"").toLowerCase());
  const minW=Math.min(...winds), maxW=Math.max(...winds), maxG=Math.max(...gusts), avgP=Math.round(precips.reduce((a,b)=>a+b,0)/precips.length);
  const reasons = [];
  if(maxW<=prefs.windMax && minW>=prefs.windMin) reasons.push(`Wind ${minW}–${maxW} kt in your range ✓`);
  else if(minW<prefs.windMin) reasons.push(`Wind a bit light (${minW}–${maxW} kt)`);
  else reasons.push(`Wind above preferred range (${minW}–${maxW} kt)`);
  if(maxG<=prefs.gustMax) reasons.push(`Gusts ${maxG} kt — below your ${prefs.gustMax} kt limit ✓`);
  else reasons.push(`Gusts ${maxG} kt — near your ${prefs.gustMax} kt limit ⚠`);
  if(avgP<=20) reasons.push(`Rain chance ${avgP}% — very low ✓`);
  else if(avgP<=40) reasons.push(`Rain chance ${avgP}% — light`);
  else reasons.push(`Rain chance ${avgP}% — elevated ⚠`);
  if(fc.some(f=>/thunder|severe/.test(f))) reasons.push("Storm risk present ⚠");
  else reasons.push("No storms or severe weather forecast ✓");
  const dirs=[...new Set(slice.map(p=>p.windDirection))].join(", ");
  if(dirs) reasons.push(`Wind from ${dirs}`);
  document.getElementById("reasons").innerHTML = reasons.map(r=>`<span class="rtag">${r}</span>`).join("");
}

function updateConditions(slice, tideArr, wIdx, wEndIdx){
  const winds=slice.map(p=>parseWindKts(p.windSpeed)), gusts=slice.map(p=>parseWindKts(p.windGust||"")||parseWindKts(p.windSpeed)),
        precips=slice.map(p=>p.probabilityOfPrecipitation?.value??0), dirs=[...new Set(slice.map(p=>p.windDirection||""))].filter(Boolean).join("/"),
        minW=Math.min(...winds), maxW=Math.max(...winds), maxG=Math.max(...gusts),
        avgP=Math.round(precips.reduce((a,b)=>a+b,0)/precips.length),
        fcs=slice.map(p=>(p.shortForecast||"").toLowerCase()), thunder=fcs.some(f=>/thunder|severe/.test(f));
  document.getElementById("c-wind").textContent = `${minW}–${maxW} kt ${dirs}`;
  const windOk = maxW<=prefs.windMax && minW>=prefs.windMin;
  document.getElementById("cs-wind").textContent = windOk ? "✔ Ideal" : "~ Off range";
  document.getElementById("cs-wind").className   = "cstatus " + (windOk ? "s-ideal" : "s-moderate");
  document.getElementById("c-gust").textContent  = `${maxG} kt peak`;
  const gustOk = maxG <= prefs.gustMax - 2;
  document.getElementById("cs-gust").textContent = gustOk ? "✔ Below limit" : maxG>prefs.gustMax ? "✖ Exceeds limit" : "~ Near limit";
  document.getElementById("cs-gust").className   = "cstatus " + (gustOk ? "s-ideal" : maxG>prefs.gustMax ? "s-high" : "s-moderate");
  if(tideArr && tideArr.length > 1){
    const tStart=parseFloat(tideArr[Math.max(0,wIdx)]?.v||0), tEnd=parseFloat(tideArr[Math.min(tideArr.length-1,wEndIdx)]?.v||0),
          tideDir=tEnd>tStart?"Incoming ↑":"Outgoing ↓", pref=prefs.tidePref,
          fav=pref==="any"||(pref==="incoming"&&tEnd>tStart)||(pref==="outgoing"&&tEnd<=tStart);
    document.getElementById("c-tide").textContent  = tideDir;
    document.getElementById("cs-tide").textContent = fav ? "✔ Favorable" : "~ Less ideal";
    document.getElementById("cs-tide").className   = "cstatus " + (fav ? "s-fav" : "s-moderate");
  }
  document.getElementById("c-storm").textContent  = thunder ? "⚠ Storm risk" : `Rain ${avgP}%`;
  document.getElementById("cs-storm").textContent = thunder ? "✖ High" : avgP<30 ? "✔ Low" : "~ Moderate";
  document.getElementById("cs-storm").className   = "cstatus " + (thunder ? "s-high" : avgP<30 ? "s-low" : "s-moderate");
}

function updateTideTable(hiloArr){
  const tbody = document.getElementById("tide-tbody");
  if(!hiloArr || !hiloArr.length){
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--muted);padding:var(--sp4)">No tide event data.</td></tr>'; return;
  }
  tbody.innerHTML = hiloArr.map(ev => {
    const timeStr = new Date(ev.t).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
    const isH = ev.type==="H", cls = isH?"t-high":"t-low";
    const badge = isH ? '<span class="cstatus s-fav">↑ High</span>' : '<span class="cstatus s-neutral">↓ Low</span>';
    return `<tr><td class="${cls}">${timeStr}</td><td class="${cls}">${parseFloat(ev.v).toFixed(1)} ft</td><td>${badge}</td></tr>`;
  }).join("");
}

function getColors(){
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    text:dark?"#cdccca":"#28251d", muted:dark?"#797876":"#7a7974",
    grid:dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)",
    primary:dark?"#4f98a3":"#01696f", warn:dark?"#bb653b":"#964219",
    success:dark?"#6daa45":"#437a22", tide:dark?"#4f98a3":"#01696f",
    surface:dark?"#1c1b19":"#f9f8f5", window:dark?"rgba(109,170,69,0.13)":"rgba(67,122,34,0.10)"
  };
}

function buildWindowPlugin(xStart, xEnd){
  return { id:"winShade", beforeDraw(chart){
    if(xStart==null || xEnd==null) return;
    const {ctx,chartArea:{left,right,top,bottom},scales:{x}} = chart;
    if(!x) return;
    const c = getColors();
    const xs = x.getPixelForValue(Math.max(0,xStart)), xe = x.getPixelForValue(Math.min(23,xEnd));
    ctx.save(); ctx.fillStyle=c.window; ctx.fillRect(xs,top,xe-xs,bottom-top); ctx.restore();
  }};
}

function buildWindChart(periods, win){
  const el = document.getElementById("wind-canvas");
  if(windChart){ windChart.destroy(); windChart=null; }
  const c = getColors();
  const shown = periods.slice(0,24);
  const pretty = shown.map(p=>{ const h=new Date(p.startTime).getHours(); return h===0?"12A":h<12?h+"A":h===12?"12P":(h-12)+"P"; });
  const winds = shown.map(p=>parseWindKts(p.windSpeed));
  const gusts = shown.map(p=>parseWindKts(p.windGust||"")||parseWindKts(p.windSpeed));
  // this chart is indexed from the current hour, not midnight — locate the window by timestamp
  const wIdx = win.startTime ? shown.findIndex(p=>p.startTime===win.startTime) : -1;
  const wp = wIdx < 0 ? buildWindowPlugin(null, null)
                      : buildWindowPlugin(wIdx, wIdx + (win.endHour - win.startHour));
  windChart = new Chart(el, { type:"line", plugins:[wp], data:{ labels:shown.map((p,i)=>String(i)),
    datasets:[
      {label:"Gusts",data:gusts,borderColor:c.warn,backgroundColor:"transparent",borderWidth:1.5,borderDash:[4,3],pointRadius:0,pointHoverRadius:4,tension:.4,order:2},
      {label:"Sustained",data:winds,borderColor:c.primary,backgroundColor:(ctx)=>{ const g=ctx.chart.ctx.createLinearGradient(0,0,0,180); g.addColorStop(0,c.primary+"30"); g.addColorStop(1,c.primary+"00"); return g; },borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:true,tension:.4,order:1}
    ]},
    options:{ responsive:true, animation:{duration:700,easing:"easeInOutQuart"}, interaction:{mode:"index",intersect:false},
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:c.surface,borderColor:c.grid,borderWidth:1,titleColor:c.text,bodyColor:c.muted,padding:10,
        callbacks:{ title:(items)=>pretty[items[0].dataIndex], label:item=>` ${item.dataset.label}: ${item.parsed.y} kt` } } },
      scales:{ x:{ grid:{color:c.grid}, ticks:{color:c.muted,font:{family:"DM Sans",size:11},callback:(v,idx)=>pretty[idx],maxTicksLimit:12}, border:{color:c.grid} },
               y:{ min:0,max:Math.max(35,Math.max(...gusts)+5), grid:{color:c.grid}, ticks:{color:c.muted,font:{family:"DM Sans",size:11},callback:v=>v+"kt",stepSize:5}, border:{color:c.grid} } } }
  });
}

function buildTideChart(tideArr, win){
  const el = document.getElementById("tide-canvas");
  if(tideChart){ tideChart.destroy(); tideChart=null; }
  const c = getColors();
  const pretty = tideArr.map(t=>{ const h=new Date(t.t).getHours(); return h===0?"12A":h<12?h+"A":h===12?"12P":(h-12)+"P"; });
  const vals = tideArr.map(t=>parseFloat(t.v));
  // tide curve covers today only — skip the band when the best window falls on another day
  const sameDay = win.startTime && tideArr.length && new Date(win.startTime).toDateString() === new Date(tideArr[0].t).toDateString();
  const tp = sameDay ? buildWindowPlugin(win.startHour, win.endHour) : buildWindowPlugin(null, null);
  tideChart = new Chart(el, { type:"line", plugins:[tp], data:{ labels:tideArr.map((_,i)=>String(i)),
    datasets:[{ label:"Tide (ft)",data:vals,borderColor:c.tide,backgroundColor:(ctx)=>{ const g=ctx.chart.ctx.createLinearGradient(0,0,0,160); g.addColorStop(0,c.tide+"40"); g.addColorStop(1,c.tide+"00"); return g; },borderWidth:2,pointRadius:0,pointHoverRadius:4,fill:true,tension:.5 }]},
    options:{ responsive:true, animation:{duration:700,easing:"easeInOutQuart"}, interaction:{mode:"index",intersect:false},
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:c.surface,borderColor:c.grid,borderWidth:1,titleColor:c.text,bodyColor:c.muted,padding:10,
        callbacks:{ title:(items)=>pretty[items[0].dataIndex], label:item=>` Tide: ${item.parsed.y.toFixed(1)} ft` } } },
      scales:{ x:{ grid:{color:c.grid}, ticks:{color:c.muted,font:{family:"DM Sans",size:11},callback:(v,idx)=>pretty[idx],maxTicksLimit:8}, border:{color:c.grid} },
               y:{ grid:{color:c.grid}, ticks:{color:c.muted,font:{family:"DM Sans",size:11},callback:v=>v+" ft",stepSize:1}, border:{color:c.grid} } } }
  });
}

function rebuildCharts(){
  if(!lastHourlyData.length || !lastTideData.length) return;
  const w = findBestWindow(lastHourlyData.slice(0,24), buildTideMap(lastHourlyData.slice(0,24), lastTideData));
  buildWindChart(lastHourlyData.slice(0,24), w);
  buildTideChart(lastTideData, w);
}

async function loadAll(){
  // only show paywall if: (1) locked AND (2) NOT first visit (we have last data)
  // this prevents paywall from appearing if connectivity failed on first try
  if(prefs.locKey && isLocked(prefs.locKey) && lastHourlyData.length > 0){
    openSubscribeModal('locked'); return;
  }
  setLoading(true); hideBanner(); showBanner("Fetching live NWS + NOAA data…", "info");
  const slowTimer = setTimeout(() => showBanner("📶 Slow connection — if you're at a marina or have Starlink aboard, hop on the Wi-Fi for fresher data…", "info"), 8000);
  let loc;
  if(prefs.locKey === "custom"){
    loc = { name:prefs.custom?.name||"My Marina", sub:"NOAA "+(prefs.custom?.stationId||"—"), lat:Number(prefs.custom?.lat), lon:Number(prefs.custom?.lon), stationId:String(prefs.custom?.stationId||"") };
  } else if(prefs.locKey === "current"){
    loc = { name:prefs.current?.name||"Current Location", sub:prefs.current?.lat!=null?`GPS ${prefs.current.lat.toFixed(4)}, ${prefs.current.lon.toFixed(4)} · NOAA ${prefs.current.stationId||"—"}`:"GPS pending", lat:Number(prefs.current?.lat), lon:Number(prefs.current?.lon), stationId:String(prefs.current?.stationId||"") };
  } else {
    loc = LOCATIONS[prefs.locKey];
  }
  document.getElementById("loc-name").textContent = loc.name;
  document.getElementById("loc-sub").textContent  = loc.sub + " · loading…";
  try{
    if(prefs.locKey === "current" && !loc.stationId){
      const nearest = nearestStationId(loc.lat, loc.lon);
      loc.stationId = nearest.id;
      prefs.current.stationId = nearest.id;
      prefs.current.stationName = nearest.name;
      savePrefsToStorage();
    }
    const [nwsPeriods, tideArr, hiloArr] = await Promise.all([
      fetchNWS(loc.lat, loc.lon).catch(async e=>{
        console.warn('NWS failed, using Open-Meteo backup:', e.message);
        toast('⚡ NWS slow — using backup forecast'); return fetchOpenMeteo(loc.lat, loc.lon);
      }),
      fetchTides(loc.stationId),
      fetchTideHiLo(loc.stationId)
    ]);
    clearTimeout(slowTimer);
    lastHourlyData = nwsPeriods; lastTideData = tideArr;
    const tideMap = buildTideMap(nwsPeriods.slice(0,24), tideArr);
    const win = findBestWindow(nwsPeriods.slice(0,24), tideMap);
    const scoreRounded = Math.round(win.score * 10) / 10;
    document.getElementById("loc-sub").textContent = loc.sub + " · updated " + nowTimeStr();
    updateScoreCard(scoreRounded, win);
    if(win.slice.length) buildReasons(win.slice);
    else document.getElementById("reasons").innerHTML = '<span class="rtag">No daylight sailing window in the next 24 hrs</span>';
    const stationLabelEl = document.getElementById("loc-station-lbl");
    const stationNameEl  = document.getElementById("loc-station-name");
    if(prefs.locKey === "current" && prefs.current?.stationName){
      stationNameEl.textContent = prefs.current.stationName;
      stationLabelEl.style.display = "block";
    } else {
      stationLabelEl.style.display = "none";
    }
    if(win.slice.length){
      const wStartIdx = tideArr.findIndex(t=>new Date(t.t).getHours()===win.startHour);
      const wEndIdx   = tideArr.findIndex(t=>new Date(t.t).getHours()===Math.min(23,Math.round(win.endHour)));
      updateConditions(win.slice, tideArr, wStartIdx, wEndIdx);
    }
    buildWindChart(nwsPeriods.slice(0,24), win);
    buildTideChart(tideArr, win);
    const noteTxt = win.startTime ? `Best window shaded: ${fmtTime(win.startTime)} – ${fmtTime(win.endTime)}` : "No daylight sailing window in the next 24 hrs";
    document.getElementById("wind-note-txt").textContent = noteTxt;
    document.getElementById("tide-note-txt").textContent = noteTxt;
    updateTideTable(hiloArr);
    syncPrefsUI();
    hideBanner();
    toast("✦ Live data loaded — " + loc.name);
  }catch(err){
    clearTimeout(slowTimer);
    console.error(err);
    showBanner(navigator.onLine === false
      ? "📶 You're offline — showing last loaded data. Marina Wi-Fi or your boat's Starlink will get you fresh forecasts; tap Refresh once connected."
      : "⚠ " + err.message + " — weak signal? Marina Wi-Fi or onboard Starlink usually loads faster. Tap Refresh to retry.", "warn");
    if(!lastHourlyData.length){
      document.getElementById("score-num").innerHTML = '—<span class="denom">/10</span>';
      document.getElementById("q-lbl").textContent   = "Data unavailable";
      document.getElementById("reasons").innerHTML   = '<span class="rtag">Could not load live data. Check your connection and try again.</span>';
    }
  }
  setLoading(false);
}

function saveHomeDock(){
  let key = prefs.locKey, name;
  if(key==='custom') name = prefs.custom?.name||'My Marina';
  else if(key==='current') name = prefs.current?.name||'Current Location';
  else { const l = LOCATIONS[key]; if(!l){ toast('No active location to save'); return; } name = l.name; }
  prefs.homeDock = {key, name};
  savePrefsToStorage();
  updateHomeDockUI();
  toast('🏠 Home Dock saved: '+name);
}

function useHomeDock(){
  const hd = prefs.homeDock;
  if(!hd?.key){ toast('No Home Dock saved yet'); return; }
  if(hd.key==='current'){ closeChooser(); useCurrentLocationForMarina(); return; }
  prefs.locKey = hd.key;
  prefs.custom = {...prefs.custom, enabled:false};
  savePrefsToStorage(); syncPrefsUI(); closeChooser(); loadAll();
  toast('🏠 '+hd.name);
}

function updateHomeDockUI(){
  const row = document.getElementById('home-dock-row');
  const lbl = document.getElementById('home-dock-label');
  if(!row||!lbl) return;
  const hd = prefs.homeDock;
  if(hd?.key){ lbl.textContent = hd.name; row.style.display='block'; }
  else row.style.display='none';
}

function openChooser(){
  const el = document.getElementById('choose-location');
  el.style.display = 'flex';
  const sel = document.getElementById('chooser-marina-select');
  if(sel) sel.value = LOCATIONS[prefs.locKey] ? prefs.locKey : '';
  updateHomeDockUI();
}

function closeChooser(){
  document.getElementById('choose-location').style.display = 'none';
}

function setMarinaFromChooser(){
  const val = document.getElementById('chooser-marina-select').value;
  if(!val){ toast('Pick a marina first'); return; }
  const loc = LOCATIONS[val];
  if(!loc){ toast('Unknown marina'); return; }
  prefs.locKey = val;
  prefs.custom = { ...prefs.custom, enabled:false };
  savePrefsToStorage();
  syncPrefsUI();
  closeChooser();
  loadAll();
  toast('Marina selected: ' + loc.name);
}

function useGpsFromChooser(){
  closeChooser();
  useCurrentLocationForMarina();
}

async function useCurrentLocation(){
  if(!('geolocation' in navigator)){ toast('Geolocation not available'); return; }
  toast('Requesting current GPS…');
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
    const nearest = nearestStationId(lat, lon);
    prefs.locKey = 'current';
    prefs.current = { enabled:true, name:'Current Location', lat, lon, stationId:nearest.id, stationName:nearest.name };
    prefs.custom = { ...prefs.custom, enabled:false };
    savePrefsToStorage(); syncPrefsUI();
    document.getElementById('p-loc').value     = 'current';
    document.getElementById('p-cname').value   = 'Current Location';
    document.getElementById('p-lat').value     = lat;
    document.getElementById('p-lon').value     = lon;
    document.getElementById('p-station').value = nearest.id;
    toggleCustomFields();
    toast(`GPS saved: ${lat}, ${lon} · ${nearest.name}`);
  }, err => { toast(`GPS failed: ${err.message}`); }, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
}

function distMiles(lat1, lon1, lat2, lon2){
  const R=3958.8, toRad=d=>d*Math.PI/180, dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

function activeSearchCenter(){
  if(prefs.locKey && LOCATIONS[prefs.locKey]) return { lat:LOCATIONS[prefs.locKey].lat, lon:LOCATIONS[prefs.locKey].lon };
  if(prefs.custom?.lat != null) return { lat:Number(prefs.custom.lat), lon:Number(prefs.custom.lon) };
  if(prefs.current?.lat != null) return { lat:Number(prefs.current.lat), lon:Number(prefs.current.lon) };
  return { lat:27.9, lon:-82.5 };
}

function openMarinaView(){
  const view = document.getElementById("marina-view");
  view.style.display = "flex";
  // Always open on the list on mobile
  document.querySelector('.marina-view-row').classList.remove('show-map');
  _setMarinaToggleIcon(false);
  updateMarinaSelectedBar();
  if(!marinaMap){ setTimeout(initMarinaMap, 100); }
  else { setTimeout(()=>marinaMap.invalidateSize(), 100); }
  setTimeout(buildMarinaCards, 150);
}

function toggleMarinaPanel(){
  const row = document.querySelector('.marina-view-row');
  const showMap = !row.classList.contains('show-map');
  row.classList.toggle('show-map', showMap);
  _setMarinaToggleIcon(showMap);
  if(showMap && marinaMap) setTimeout(()=>marinaMap.invalidateSize(), 50);
}

function _setMarinaToggleIcon(showingMap){
  const ic = document.getElementById('marina-toggle-icon');
  if(!ic) return;
  // Showing map → icon is "list" (switch back to list). Showing list → icon is "map" (switch to map).
  ic.innerHTML = showingMap
    ? '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'
    : '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>';
}

function closeMarinaView(){
  document.getElementById("marina-view").style.display = "none";
}

function toggleAdvisory(){
  const body = document.getElementById("advisory-body");
  const arrow = document.getElementById("advisory-arrow");
  const open = body.style.display === "none";
  body.style.display = open ? "block" : "none";
  arrow.style.transform = open ? "rotate(180deg)" : "";
}

function updateMarinaSelectedBar(){
  const bar  = document.getElementById("marina-selected-bar");
  const name = document.getElementById("marina-selected-name");
  let activeName = "";
  if(prefs.locKey === "custom" && prefs.custom?.name) activeName = prefs.custom.name;
  else if(prefs.locKey === "current") activeName = prefs.current?.name || "Current Location";
  else if(LOCATIONS[prefs.locKey]) activeName = LOCATIONS[prefs.locKey].name;
  if(activeName){ name.textContent = activeName; bar.classList.add("visible"); }
  else { bar.classList.remove("visible"); }
}

function focusMarina(lat, lon){
  if(!marinaMap || lat == null || lon == null) return;
  marinaMap.setView([lat, lon], 14);
  // On mobile, auto-switch to map panel so the user sees it
  if(window.innerWidth < 600){
    document.querySelector('.marina-view-row').classList.add('show-map');
    _setMarinaToggleIcon(true);
    setTimeout(()=>marinaMap.invalidateSize(), 50);
  }
}

function selectMarinaFromCard(id, liveData){
  const saved = id && LOCATIONS[id] ? LOCATIONS[id] : null;
  const dbEntry = (!saved && id && marinaDbMap[id]) ? marinaDbMap[id] : null;
  const live = (!saved && !dbEntry && liveData && typeof liveData === 'object') ? liveData : null;
  const loc = saved || dbEntry || live;
  if(!loc){ toast('Unknown marina'); return; }

  if(dbEntry || live){
    prefs.locKey = 'custom';
    prefs.custom = { enabled:true, name:loc.name, lat:loc.lat, lon:loc.lon, stationId:'' };
    toast('Live marina set — add a NOAA station ID in preferences for tide data');
  } else {
    prefs.locKey = id;
    prefs.custom = { ...prefs.custom, enabled:false };
    toast('Selected: ' + loc.name);
  }
  savePrefsToStorage();
  syncPrefsUI();
  updateMarinaSelectedBar();
  document.getElementById('loc-name').textContent = loc.name;
  document.getElementById('loc-sub').textContent  = (saved?.sub || loc.sub || '') + ' · loading…';
  if(marinaMap) focusMarina(loc.lat, loc.lon);
  buildMarinaCards(); // refresh to show active highlight
  loadAll();
}

function initMarinaMap(){
  const mapEl = document.getElementById("marina-map");
  if(marinaMap){ marinaMap.invalidateSize(); return; }
  marinaMap = L.map(mapEl);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains:'abcd' }).addTo(marinaMap);
  marinaCluster = L.markerClusterGroup({ spiderfyOnMaxZoom:true, showCoverageOnHover:true, zoomToBoundsOnClick:true });
  marinaMap.addLayer(marinaCluster);
  loadMarinaMarkers();
  setTimeout(() => {
    const layers = marinaCluster.getLayers();
    if(layers.length > 0){
      const group = L.featureGroup(layers);
      marinaMap.fitBounds(group.getBounds(), { padding:[50,50] });
    } else {
      marinaMap.setView([27.9, -82.5], 9);
    }
    marinaMap.invalidateSize();
  }, 200);
}

function loadMarinaMarkers(){
  if(!marinaCluster) return;
  marinaCluster.clearLayers();
  const marinas = [];
  for(const [key, loc] of Object.entries(LOCATIONS)){
    marinas.push({ id:key, name:loc.name, lat:loc.lat, lon:loc.lon, stationId:loc.stationId, type:"saved" });
  }
  if(prefs.custom?.enabled && prefs.custom?.lat != null){
    marinas.push({ id:"custom", name:prefs.custom.name, lat:prefs.custom.lat, lon:prefs.custom.lon, stationId:prefs.custom.stationId, type:"custom" });
  }
  if(prefs.current?.enabled && prefs.current?.lat != null){
    marinas.push({ id:"current", name:prefs.current.name||"Current Location", lat:prefs.current.lat, lon:prefs.current.lon, stationId:prefs.current.stationId, type:"boat" });
  }
  const boatLat = prefs.current?.lat ?? null;
  const boatLon = prefs.current?.lon ?? null;
  for(const m of marinas){
    const marker = L.marker([m.lat, m.lon]);
    marker._marinaName = m.name;
    const meta = MARINA_META[m.id] || {};
    const phoneHref = meta.phone ? String(meta.phone).replace(/[^0-9+]/g,'') : '';
    const mapsQuery = encodeURIComponent(meta.address || m.name);
    let distLine = '';
    if(boatLat != null && boatLon != null){
      const distM = marinaMap.distance([boatLat, boatLon], [m.lat, m.lon]);
      distLine = `<div style="color:#888;font-size:12px;margin-bottom:6px">${distM < 1000 ? distM.toFixed(0)+' m' : (distM/1000).toFixed(2)+' km'} from boat</div>`;
    }
    const popup = `
      <div style="min-width:200px;font-family:sans-serif;line-height:1.5">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px">${m.name}</div>
        ${distLine}
        ${meta.address ? `<div style="font-size:12px;margin-bottom:4px"><a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener" style="color:#4f98a3;text-decoration:none">📍 ${meta.address}</a></div>` : ''}
        ${meta.phone
          ? `<div style="font-size:13px;margin-bottom:4px"><a href="tel:${phoneHref}" style="color:#4f98a3;font-weight:600;text-decoration:none">📞 ${meta.phone}</a></div>`
          : m.type !== "boat" ? `<div style="font-size:12px;margin-bottom:4px"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meta.area||m.name)}" target="_blank" rel="noopener" style="color:#4f98a3;text-decoration:none">🔍 Find marinas nearby</a></div>` : ''}
        ${meta.hours ? `<div style="font-size:11px;color:#888;margin-bottom:6px">🕐 ${meta.hours}</div>` : ''}
        ${m.type === "boat" ? '<div style="font-style:italic;font-size:12px;color:#888">Your current location</div>' : `<button onclick="selectMarinaFromCard('${m.id}',null)" style="margin-top:4px;background:#4f98a3;color:#fff;border:none;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px">Set Active</button>`}
      </div>`;
    marker.bindPopup(popup, { maxWidth: 260 });
    marker.on("click", () => marker.openPopup());
    marinaCluster.addLayer(marker);
  }
}

function useCurrentLocationForMarina(){
  if(!("geolocation" in navigator)){ toast("Geolocation not available"); return; }
  toast("Requesting current GPS…");
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = +pos.coords.latitude.toFixed(4), lon = +pos.coords.longitude.toFixed(4);
    const nearest = nearestStationId(lat, lon);
    prefs.locKey = "current";
    prefs.current = { enabled:true, name:"Current Location", lat, lon, stationId:nearest.id, stationName:nearest.name };
    savePrefsToStorage(); syncPrefsUI();
    document.getElementById("p-loc").value = "current"; toggleCustomFields();
    toast(`GPS: ${lat}, ${lon} · ${nearest.name}`);
    if(marinaMap){ loadMarinaMarkers(); marinaMap.setView([lat, lon], 12); }
    updateMarinaSelectedBar();
  }, err => { toast(`GPS failed: ${err.message}`); }, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
}

async function fetch7DayTides(stationId){
  const today = new Date();
  const end = new Date(today); end.setDate(end.getDate()+6);
  const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=sailwindow&begin_date=${fmt(today)}&end_date=${fmt(end)}&datum=MLLW&station=${stationId}&time_zone=lst_ldt&units=english&interval=h&format=json`;
  const res = await fetch(url); if(!res.ok) throw new Error(`NOAA 7-day failed: ${res.status}`);
  const json = await res.json(); if(json.error) throw new Error('NOAA 7-day: '+json.error.message);
  return json.predictions;
}

function groupPeriodsByDay(periods){
  const groups = {};
  for(const p of periods){
    const d = new Date(p.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(!groups[key]) groups[key] = { key, date:new Date(d.getFullYear(),d.getMonth(),d.getDate()), periods:[] };
    groups[key].periods.push(p);
  }
  return Object.values(groups).sort((a,b)=>a.date-b.date);
}

function groupTidesByDay(tideArr){
  const groups = {};
  for(const t of tideArr){
    const d = new Date(t.t);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(!groups[key]) groups[key]=[];
    groups[key].push(t);
  }
  return groups;
}

function score7Days(dayGroups, tidesByDay){
  const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MON_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const td = new Date();
  const todayKey = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
  return dayGroups.slice(0,7).map((dayData,i)=>{
    const { key, date, periods } = dayData;
    const tideArr = tidesByDay[key] || [];
    const tideMap = buildTideMap(periods, tideArr);
    const win = findBestWindow(periods, tideMap);
    const score = Math.max(0, Math.round(win.score*10)/10);
    const isToday = key===todayKey;
    const dayLabel = isToday ? 'TODAY' : i===1 ? 'TOMORROW' : DAY_NAMES[date.getDay()].toUpperCase();
    const dateLabel = `${DAY_NAMES[date.getDay()]} · ${MON_NAMES[date.getMonth()]} ${date.getDate()}`;
    return { date, key, dayLabel, dateLabel, score, win, tideArr };
  });
}

function dayConditionTags(slice){
  if(!slice||!slice.length) return [];
  const winds  = slice.map(p=>parseWindKts(p.windSpeed));
  const gusts  = slice.map(p=>parseWindKts(p.windGust||'')||parseWindKts(p.windSpeed));
  const precips= slice.map(p=>p.probabilityOfPrecipitation?.value??0);
  const dirs   = [...new Set(slice.map(p=>p.windDirection||'').filter(Boolean))].slice(0,2).join('/');
  const minW=Math.min(...winds), maxW=Math.max(...winds), maxG=Math.max(...gusts);
  const avgP=Math.round(precips.reduce((a,b)=>a+b,0)/precips.length);
  const thunder=slice.some(p=>/thunder|severe/i.test(p.shortForecast||''));
  return [
    `💨 ${minW}–${maxW} kt${dirs?' '+dirs:''}`,
    `⚡ ${maxG} kt`,
    thunder ? '⛈ Storm risk' : `⛈ Rain ${avgP}%`
  ];
}

function open7DayView(){
  if(trialStatus().state === 'expired'){ openSubscribeModal('locked'); return; }
  const view = document.getElementById('sevenday-view');
  view.style.display = 'flex';
  // update active nav
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-7day').classList.add('active');
  load7Day();
}

function close7DayView(){
  document.getElementById('sevenday-view').style.display = 'none';
  document.getElementById('feedback-view').style.display = 'none';
  const _lv = document.getElementById('log-view'); if(_lv) _lv.style.display = 'none';
  const _bv = document.getElementById('bridges-view'); if(_bv) _bv.style.display = 'none';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelector('.nav-item[data-tab="today"]').classList.add('active');
}

async function load7Day(){
  const body = document.getElementById('sevenday-body');
  const locEl = document.getElementById('sevenday-loc');
  body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Fetching 7-day data…</div>';
  try{
    let loc;
    if(prefs.locKey==='custom')      loc={name:prefs.custom?.name||'My Marina',sub:'NOAA '+(prefs.custom?.stationId||'—'),lat:+prefs.custom?.lat,lon:+prefs.custom?.lon,stationId:String(prefs.custom?.stationId||'')};
    else if(prefs.locKey==='current') loc={name:prefs.current?.name||'Current Location',sub:'GPS',lat:+prefs.current?.lat,lon:+prefs.current?.lon,stationId:String(prefs.current?.stationId||'')};
    else                              loc=LOCATIONS[prefs.locKey];
    locEl.textContent = loc.name+' · '+loc.sub+' · Preferences: '+prefs.windMin+'–'+prefs.windMax+' kt, max gust '+prefs.gustMax+' kt';
    const nwsData  = lastHourlyData.length>0 ? lastHourlyData : await fetchNWS(loc.lat, loc.lon).catch(()=>fetchOpenMeteo(loc.lat, loc.lon));
    const tideArr  = await fetch7DayTides(loc.stationId);
    const days     = score7Days(groupPeriodsByDay(nwsData), groupTidesByDay(tideArr));
    build7DayCards(days);
  }catch(err){
    body.innerHTML = `<div style="padding:1.5rem;color:var(--warn);font-size:var(--sm)">⚠ ${err.message}<br><br>Check your connection and try again.</div>`;
    locEl.textContent = 'Could not load data';
  }
}

function build7DayCards(days){
  const body = document.getElementById('sevenday-body');
  body.innerHTML = '';
  for(const day of days){
    const q = qualityLabel(day.score);
    const noWin = !day.win.startTime;
    const tags  = day.win.slice?.length ? dayConditionTags(day.win.slice) : [];
    const card  = document.createElement('div');
    card.className = 'day-card';
    card.style.setProperty('--stripe-a', q.stripe[0]);
    card.style.setProperty('--stripe-b', q.stripe[1]);
    card.innerHTML = `
      <div class="day-inner">
        <div class="day-top">
          <div>
            <div class="day-label">${day.dayLabel}</div>
            <div class="day-date">${day.dateLabel}</div>
          </div>
          <div class="day-score-block">
            <div class="day-score-num">${day.score.toFixed(1)}<span>/10</span></div>
            <div class="quality-badge ${q.cls}" style="margin-top:var(--sp2)">${q.emoji} ${q.lbl}</div>
          </div>
        </div>
        ${noWin
          ? `<div style="font-size:var(--sm);color:var(--error);font-weight:500">No suitable sailing window today</div>`
          : `<div class="day-window">
               <span style="font-size:var(--sm);font-weight:500">${fmtTime(day.win.startTime)} → ${fmtTime(day.win.endTime)}</span>
               <span class="win-dur">${prefs.durationHrs} hr</span>
             </div>`}
        <div class="reasons">${tags.map(t=>`<span class="rtag">${t}</span>`).join('')}</div>
      </div>`;
    body.appendChild(card);
  }
}

function openHelp(){
  const v = document.getElementById('help-view');
  v.style.display = 'flex';
  const b = document.getElementById('help-body');
  if(b) b.scrollTop = 0;
}

function closeHelp(){
  document.getElementById('help-view').style.display = 'none';
}

function trialStatus(){
  // subscribed always wins
  if(storageAvailable() && localStorage.getItem(SUB_KEY) === "active")
    return { state:"subscribed", daysLeft:null };

  let raw = storageAvailable() ? localStorage.getItem(TRIAL_KEY) : null;

  // first visit or storage lost: start trial now
  if(!raw){
    raw = String(Date.now());
    try{
      if(storageAvailable()) localStorage.setItem(TRIAL_KEY, raw);
    }catch(e){
      console.warn("Could not save trial key:", e);
      // if storage fails, still grant trial — assume this is a new visit
    }
  }

  const startTime = parseInt(raw, 10);
  if(isNaN(startTime)){
    // corrupted key, reset
    raw = String(Date.now());
    try{
      if(storageAvailable()) localStorage.setItem(TRIAL_KEY, raw);
    }catch(e){ /* storage unavailable */ }
    return { state:"trial", daysLeft:TRIAL_DAYS };
  }

  const daysLeft = Math.ceil(TRIAL_DAYS - (Date.now() - startTime) / 86400000);
  if(daysLeft > 0) return { state:"trial", daysLeft };
  return { state:"expired", daysLeft:0 };
}

function isLocked(locKey){
  const s = trialStatus();
  if(s.state === "subscribed" || s.state === "trial") return false;
  return !FREE_KEYS.has(locKey);
}

function logTrialStatus(){
  const s = trialStatus();
  console.log(`[Trial] state=${s.state}, daysLeft=${s.daysLeft}, locked(current)=${isLocked(prefs.locKey)}`);
}

function updateTrialBanner(){
  const s   = trialStatus();
  const wrap = document.getElementById("trial-banner");
  const bar  = document.getElementById("trial-bar-inner");
  const txt  = document.getElementById("trial-days-text");
  if(!wrap) return;
  if(s.state !== "trial"){ wrap.style.display = "none"; return; }
  const d = s.daysLeft;
  wrap.style.display = "block";
  bar.className = "trial-bar " + (d <= 2 ? "trial-bar-e" : d <= 4 ? "trial-bar-w" : "trial-bar-p");
  txt.textContent = d === 1 ? "1 day" : d + " days";
}

function checkTrialGate(){
  if(trialStatus().state === "expired") showExpiredOverlay();
}

function showExpiredOverlay(){
  document.getElementById("sub-headline").textContent = "Your 7-day free trial has ended";
  document.getElementById("sub-free-option").style.display = "block";
  document.getElementById("sub-dismiss").style.display    = "none";
  document.getElementById("subscribe-overlay").style.display = "flex";
  updateLockState();
}

function closeSubscribeModal(){
  document.getElementById("subscribe-overlay").style.display = "none";
}

function handleOverlayClick(e){
  if(e.target === document.getElementById("subscribe-overlay")){
    const s = trialStatus();
    if(s.state !== "expired") closeSubscribeModal();
  }
}

function selectPlan(plan){
  _selectedPlan = plan;
  document.getElementById("price-monthly").className = "price-card" + (plan === "monthly" ? " selected" : "");
  document.getElementById("price-annual").className  = "price-card" + (plan === "annual"  ? " selected" : "");
  document.getElementById("price-bundle").className  = "price-card" + (plan === "bundle"   ? " selected" : "");
}

function updateLockState(){
  const expired = trialStatus().state === "expired";
  ["p-loc","chooser-marina-select"].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.querySelectorAll("option").forEach(opt => {
      if(!opt.value) return;
      const locked = expired && !FREE_KEYS.has(opt.value);
      opt.disabled = locked;
      if(!opt.dataset.orig) opt.dataset.orig = opt.textContent;
      opt.textContent = locked ? "🔒 " + opt.dataset.orig : opt.dataset.orig;
    });
  });
}

function openFeedbackView(){
  if(trialStatus().state === 'expired'){ openSubscribeModal('locked'); return; }
  document.getElementById('feedback-view').style.display = 'flex';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-feedback').classList.add('active');
  resetFeedbackForm();
}

function closeFeedbackView(){
  document.getElementById('feedback-view').style.display = 'none';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelector('.nav-item[data-tab="today"]').classList.add('active');
}

function selectFbCat(btn){
  document.querySelectorAll('.fb-cat').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  _fbCat = btn.dataset.cat;
  document.getElementById('fb-marina-row').style.display = _fbCat === 'app' ? 'none' : '';
  const placeholders = {
    back:   "e.g. Fuel dock is back open as of this week — called ahead and confirmed.",
    closed: "e.g. Seawall still damaged, no transient slips as of June 2026.",
    info:   "e.g. Phone number shown is wrong; correct number is (850) 555-0100.",
    app:    "Feature idea, bug report, or anything else on your mind."
  };
  document.getElementById('fb-details').placeholder = placeholders[_fbCat];
}

function submitFeedback(e){
  e.preventDefault();
  const marina  = document.getElementById('fb-marina').value.trim();
  const details = document.getElementById('fb-details').value.trim();
  const email   = document.getElementById('fb-email').value.trim();
  if(!details){ toast("Please add some details before sending."); return; }
  const labels  = { back:"Marina Back Online", closed:"Marina Closed/Damaged", info:"Wrong Info", app:"App Feedback" };
  const subject = encodeURIComponent(`[SailWindow] ${labels[_fbCat]}${marina ? ' — '+marina : ''}`);
  const body    = encodeURIComponent(`Type: ${labels[_fbCat]}\n${marina?'Marina: '+marina+'\n':''}Details: ${details}\n${email?'Contact: '+email+'\n':''}\n— Sent from SailWindow`);
  window.open(`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  document.getElementById('feedback-form').style.display = 'none';
  document.getElementById('fb-confirm').style.display = '';
}

function resetFeedbackForm(){
  _fbCat = 'back';
  document.querySelectorAll('.fb-cat').forEach(b=>b.classList.remove('active'));
  document.querySelector('.fb-cat[data-cat="back"]').classList.add('active');
  document.getElementById('fb-marina-row').style.display = '';
  document.getElementById('fb-marina').value  = '';
  document.getElementById('fb-details').value = '';
  document.getElementById('fb-email').value   = '';
  document.getElementById('fb-details').placeholder = "e.g. Fuel dock is back open as of this week — called ahead and confirmed.";
  document.getElementById('feedback-form').style.display = '';
  document.getElementById('fb-confirm').style.display    = 'none';
}

function openLogView(){
  if(trialStatus().state === 'expired'){ openSubscribeModal('locked'); return; }
  document.getElementById('log-view').style.display = 'flex';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-log').classList.add('active');
  initLogStars();
  loadCommunityFeed();
}

function closeLogView(){
  document.getElementById('log-view').style.display = 'none';
  const _bv = document.getElementById('bridges-view'); if(_bv) _bv.style.display = 'none';
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.querySelector('.nav-item[data-tab="today"]').classList.add('active');
}

function initLogStars(){
  const container = document.getElementById('log-star-container');
  if(container.dataset.init) return;
  container.dataset.init = '1';
  const stars = container.querySelectorAll('.log-star');
  stars.forEach(s => {
    s.addEventListener('click', () => {
      const val = +s.dataset.val;
      document.getElementById('log-marina-rating').value = val;
      stars.forEach(x => x.classList.toggle('lit', +x.dataset.val <= val));
    });
    s.addEventListener('mouseover', () => {
      const val = +s.dataset.val;
      stars.forEach(x => x.classList.toggle('lit', +x.dataset.val <= val));
    });
    s.addEventListener('mouseout', () => {
      const cur = +document.getElementById('log-marina-rating').value;
      stars.forEach(x => x.classList.toggle('lit', +x.dataset.val <= cur));
    });
  });
  // bridge chips toggle
  document.querySelectorAll('#log-bridges .log-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  // category checkboxes (visual state)
  document.querySelectorAll('#log-categories input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.log-cat-check').classList.toggle('checked', cb.checked);
    });
  });
  // sentiment toggle (single-select, click again to clear)
  document.querySelectorAll('#log-sentiment .log-sentiment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wasSelected = btn.classList.contains('selected');
      document.querySelectorAll('#log-sentiment .log-sentiment-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById('log-sentiment-value').value = wasSelected ? '' : btn.dataset.val;
      if(!wasSelected) btn.classList.add('selected');
    });
  });
  // default date = today
  const dateEl = document.getElementById('log-trip-date');
  if(!dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
}

async function submitLog(){
  const btn     = document.getElementById('log-submit-btn');
  const success = document.getElementById('log-success');
  const error   = document.getElementById('log-error');
  success.style.display = 'none';
  error.style.display   = 'none';

  const bridges = [...document.querySelectorAll('#log-bridges .log-chip.selected')]
    .map(c => c.dataset.val);
  const categories = [...document.querySelectorAll('#log-categories input[type=checkbox]:checked')]
    .map(c => c.value);

  const payload = {
    trip_date:           document.getElementById('log-trip-date').value,
    boat_name:           document.getElementById('log-boat-name').value.trim(),
    departure_marina:    document.getElementById('log-departure').value,
    destination_marina:  document.getElementById('log-destination').value,
    bridges_passed:      bridges,
    bridge_wait:         document.getElementById('log-bridge-wait').value,
    marina_rating:       +document.getElementById('log-marina-rating').value,
    categories:          categories,
    sentiment:           document.getElementById('log-sentiment-value').value,
    trip_notes:          document.getElementById('log-trip-notes').value.trim()
  };

  btn.disabled    = true;
  btn.textContent = 'Submitting…';
  try {
    const res  = await fetch(CRUISERS_LOG_URL, { method:'POST', body:JSON.stringify(payload) });
    const data = await res.json();
    if(data.success){
      success.style.display = 'block';
      document.getElementById('cruisers-log-form').reset();
      document.getElementById('log-marina-rating').value = '0';
      document.querySelectorAll('#log-star-container .log-star').forEach(s=>s.classList.remove('lit'));
      document.querySelectorAll('#log-bridges .log-chip').forEach(c=>c.classList.remove('selected'));
      document.querySelectorAll('#log-categories input[type=checkbox]').forEach(c=>{
        c.checked = false;
        c.closest('.log-cat-check').classList.remove('checked');
      });
      document.querySelectorAll('#log-sentiment .log-sentiment-btn').forEach(b=>b.classList.remove('selected'));
      document.getElementById('log-sentiment-value').value = '';
      document.getElementById('log-trip-date').value = new Date().toISOString().split('T')[0];
    } else {
      error.style.display = 'block';
    }
  } catch(e){
    error.style.display = 'block';
  }
  btn.disabled    = false;
  btn.textContent = 'Log This Trip →';
}

function renderLogEntry(e){
  const stars = e.marina_rating
    ? '★'.repeat(+e.marina_rating) + '☆'.repeat(5 - +e.marina_rating)
    : '';
  const route = (e.departure_marina && e.destination_marina)
    ? e.departure_marina + ' → ' + e.destination_marina
    : (e.departure_marina || e.destination_marina || '');
  const rawDate = e.trip_date ? new Date(e.trip_date) : null;
  const date = rawDate
    ? rawDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})
    : '';
  const badges = [];
  if(e.bridge_wait && e.bridge_wait !== 'No wait') badges.push('⏱ ' + e.bridge_wait);
  if(e.bridges_passed){
    const bList = String(e.bridges_passed).split(', ').filter(Boolean);
    if(bList.length) badges.push('🌉 ' + bList.length + ' bridge' + (bList.length > 1 ? 's' : ''));
  }
  const sentimentTag = e.sentiment === 'good'
    ? '<div class="log-entry-sentiment good">👍 Good Stuff</div>'
    : e.sentiment === 'bad'
      ? '<div class="log-entry-sentiment bad">👎 Bad Stuff</div>'
      : '';
  return '<div class="log-entry">'
    + '<div class="log-entry-header">'
    +   '<span class="log-entry-boat">' + (e.boat_name || 'Anonymous') + '</span>'
    +   '<span class="log-entry-date">' + date + '</span>'
    + '</div>'
    + (route ? '<div class="log-entry-route">' + route + '</div>' : '')
    + sentimentTag
    + (stars  ? '<div style="color:#f5a623;font-size:.9rem;margin-bottom:var(--sp1)">' + stars + '</div>' : '')
    + (e.trip_notes ? '<div class="log-entry-notes">' + e.trip_notes + '</div>' : '')
    + (badges.length
        ? '<div class="log-entry-meta">' + badges.map(b=>'<span class="log-entry-badge">'+b+'</span>').join('') + '</div>'
        : '')
    + '</div>';
}

async function loadCommunityFeed(){
  const feed = document.getElementById('log-community-feed');
  feed.innerHTML = '<div class="log-empty">Loading recent logs…</div>';
  try {
    const res  = await fetch(CRUISERS_LOG_URL);
    const data = await res.json();
    if(!data.success || !data.entries || !data.entries.length){
      feed.innerHTML = '<div class="log-empty">No logs yet — be the first to share a trip!</div>';
      return;
    }

    // Newest trips first
    const sorted = [...data.entries].sort((a, b) => {
      const ta = a.trip_date ? new Date(a.trip_date).getTime() : 0;
      const tb = b.trip_date ? new Date(b.trip_date).getTime() : 0;
      return tb - ta;
    });

    // Group by the marina the entry is about (destination, falling back to departure)
    const marinaGroups = new Map();
    sorted.forEach(e => {
      const marina = e.destination_marina || e.departure_marina || 'Other / Unspecified';
      if(!marinaGroups.has(marina)) marinaGroups.set(marina, []);
      marinaGroups.get(marina).push(e);
    });
    const marinaNames = [...marinaGroups.keys()].sort((a, b) => a.localeCompare(b));

    feed.innerHTML = marinaNames.map(marina => {
      const entries = marinaGroups.get(marina);

      // Sub-group each marina's entries by category checkbox(es); an entry with
      // multiple categories checked appears once under each. Uncategorized entries
      // fall back into General.
      const buckets = {};
      LOG_CATEGORY_DEFS.forEach(c => buckets[c.key] = []);
      entries.forEach(e => {
        const cats = e.categories ? String(e.categories).split(', ').filter(Boolean) : [];
        (cats.length ? cats : ['general']).forEach(c => { if(buckets[c]) buckets[c].push(e); });
      });

      const catHTML = LOG_CATEGORY_DEFS.map(c => {
        const list = buckets[c.key];
        if(!list.length) return '';
        return '<div class="log-cat-group">'
          + '<div class="log-cat-group-title">' + c.label + ' · ' + list.length + '</div>'
          + list.map(renderLogEntry).join('')
          + '</div>';
      }).join('');

      return '<div class="log-marina-group">'
        + '<div class="log-marina-group-title">⚓ ' + marina + '</div>'
        + catHTML
        + '</div>';
    }).join('');
  } catch(err){
    feed.innerHTML = '<div class="log-empty">Couldn\'t load recent logs. Try again later.</div>';
  }
}

function openBridgesView(){
  document.getElementById('bridges-view').style.display = 'flex';
  document.getElementById('bridge-search').value = '';
  document.querySelectorAll('.bridge-filter').forEach(f=>f.classList.toggle('active', f.dataset.ww==='all'));
  renderBridgeSchedules();
}

function closeBridgesView(){
  document.getElementById('bridges-view').style.display = 'none';
}

function setBridgeFilter(el){
  document.querySelectorAll('.bridge-filter').forEach(f=>f.classList.remove('active'));
  el.classList.add('active');
  renderBridgeSchedules();
}

function toggleBridgeCard(id){
  const card = document.getElementById('bcard-'+id);
  if(!card) return;
  const isOpen = card.classList.toggle('open');
  card.querySelector('.bridge-toggle').textContent = isOpen ? '▲ Hide schedule' : '▼ Show schedule';
}

function showPartnerModal(p){
  const modal = document.getElementById('partner-modal');
  document.getElementById('pm-name').textContent    = p.name || '';
  document.getElementById('pm-offer').textContent   = p.discount_offer || '';
  const ratingEl = document.getElementById('pm-rating');
  ratingEl.textContent = p.rating ? `★ ${p.rating}  ·  ${p.address || ''}` : (p.address || '');
  // Phone
  const phoneEl = document.getElementById('pm-phone');
  if(p.phone){ phoneEl.href = 'tel:' + p.phone.replace(/[^0-9+]/g,''); phoneEl.style.display='flex'; }
  else { phoneEl.style.display='none'; }
  // Directions
  const dirEl = document.getElementById('pm-directions');
  const addr  = p.address || p.name || '';
  dirEl.href  = `https://maps.apple.com/?q=${encodeURIComponent(addr)}`;
  // Open
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function initHeroCheck(){
  // Bypass hero for anyone who already has a trial or subscription
  if(storageAvailable()){
    const hasTrial = !!localStorage.getItem('sailwindow.trial.start');
    const hasSub   = localStorage.getItem('sailwindow.subscription') === 'active';
    if(hasTrial || hasSub) return false;
  }
  // New visitor: show hero, prevent body scroll
  const overlay = document.getElementById('sw-hero-overlay');
  if(overlay) overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  return true;
}

function hideHero(){
  const overlay = document.getElementById('sw-hero-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function _heroInitApp(){
  // Runs normal app startup sequence after hero is dismissed
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  checkTrialGate();
  loadAll();
}

function heroStartTrial(){
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  _heroInitApp();
}

function heroSubscribe(){
  // Start trial clock so app is usable, then open subscribe modal
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  loadAll();
  setTimeout(() => openSubscribeModal('upgrade'), 600);
}

function heroRestoreAccess(){
  // User already paid via Stripe; set trial start, show activate button in modal
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  loadAll();
  setTimeout(() => openSubscribeModal('restore'), 600);
}

function closePartnerModal(){
  document.getElementById('partner-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function escHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function toggleAshore(btn, lat, lon, marinaFuel){
  const card = btn.closest('.marina-card');
  if(!card) return;
  let sec = card.querySelector('.ashore-section');
  if(sec){ sec.remove(); btn.textContent = '⛽🍴 Ashore'; return; }
  sec = document.createElement('div');
  sec.className = 'ashore-section';
  sec.innerHTML = '<span style="color:var(--muted)">Checking what\'s ashore…</span>';
  card.querySelector('.marina-main').appendChild(sec);
  btn.textContent = 'Hide';
  let items = [];
  try{ items = await fetchAshore(lat, lon); }
  catch(e){ sec.innerHTML = '<span style="color:var(--warn)">Couldn\'t reach OpenStreetMap — try again in a minute.</span>'; return; }
  const fuelDocks = items.filter(i => i.kind === 'fuel-dock');
  const fuelRoad  = items.filter(i => i.kind === 'fuel-road');
  let html = '';

  // ── Fuel ──
  if(marinaFuel)            html += `<div>⛽ <strong>Fuel at this marina</strong></div>`;
  else if(fuelDocks.length) html += `<div>⛽ Fuel dock: <strong>${escHtml(fuelDocks[0].name || 'unnamed')}</strong> · ${fmtAshoreDist(fuelDocks[0].dist)}</div>`;
  else if(fuelRoad.length)  html += `<div>⛽ Nearest fuel is a road station: ${escHtml(fuelRoad[0].name || 'unnamed')} · ${fmtAshoreDist(fuelRoad[0].dist)}</div>`;
  else                      html += `<div>⛽ No fuel mapped nearby — call ahead.</div>`;

  // ── Restaurants from SailWindow Google database ──
  const swData = getSwRestaurants(lat, lon);

  // Partner restaurants (agreed discount) — featured at top
  for(const p of swData.partners){
    const pd = JSON.stringify(p).replace(/'/g,"&#39;").replace(/"/g,"&quot;");
    html += `<div class="ashore-partner" onclick="event.stopPropagation();showPartnerModal(${pd})">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:13px">🏷️</span>
        <strong style="font-size:13px">${escHtml(p.name)}</strong>
        <span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--primary);background:var(--primary-hl);padding:1px 7px;border-radius:999px;border:1px solid var(--primary);margin-left:2px">PARTNER</span>
        ${p.rating ? `<span style="font-size:11px;color:var(--muted);margin-left:auto">★ ${p.rating}</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--primary);margin-top:4px;font-weight:600">${escHtml(p.discount_offer)}</div>
      <div class="ashore-partner-tap">Tap to show your server →</div>
    </div>`;
  }

  // All other Google-sourced restaurants near this marina
  if(swData.restaurants.length){
    html += `<div style="margin-top:6px;font-weight:600;font-size:12px">🍴 Nearby restaurants</div>`;
    html += swData.restaurants.slice(0, 8).map(r => {
      const stars   = r.rating ? `★ ${r.rating}` : '';
      const siteBtn = r.website ? ` · <a href="${escHtml(r.website)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:11px" onclick="event.stopPropagation()">menu/site</a>` : '';
      const phoneBtn= r.phone   ? ` · <a href="tel:${r.phone.replace(/[^0-9+]/g,'')}" style="color:var(--primary);font-size:11px" onclick="event.stopPropagation()">${escHtml(r.phone)}</a>` : '';
      return `<div style="padding:5px 0;border-bottom:1px solid var(--divider)"><strong style="font-size:13px">${escHtml(r.name)}</strong>${stars ? ` <span style="color:var(--muted);font-size:12px">${stars}</span>` : ''}<br><span style="font-size:11px;color:var(--muted)">${escHtml(r.address)}</span>${phoneBtn}${siteBtn}</div>`;
    }).join('');
    if(swData.restaurants.length > 8) html += `<div style="font-size:11px;color:var(--muted);padding-top:4px">+ ${swData.restaurants.length - 8} more nearby</div>`;
    if(!swData.partners.length){
      html += `<div style="margin-top:6px;font-size:10.5px;color:var(--muted)">Restaurant owner? List your discount for SailWindow crews: <a href="mailto:marketing@sailwindow.com" style="color:var(--primary)">marketing@sailwindow.com</a></div>`;
    }
  } else {
    // Fall back to OpenStreetMap food if our DB has nothing for this area
    const food = items.filter(i => i.kind === 'food');
    if(food.length){
      html += `<div style="margin-top:4px">🍴 Eat ashore:</div>`;
      html += food.slice(0,5).map(f => `<div style="padding-left:14px">• ${escHtml(f.name || 'unnamed')}${f.cuisine ? ` <span style="color:var(--muted)">(${escHtml(f.cuisine)})</span>` : ''} · ${fmtAshoreDist(f.dist)}</div>`).join('');
    } else {
      html += `<div style="margin-top:4px">🍴 Nothing mapped within walking distance.</div>`;
    }
  }

  html += `<div style="margin-top:5px;font-size:10.5px;color:var(--muted)">Google Places data · distances approximate · always call ahead</div>`;
  sec.innerHTML = html;
}

// ── Functions parameterized by EDITION_CONFIG (differ only in a few literals) ──

function nearestStationId(lat, lon){
  const stations = EDITION_CONFIG.noaaStations;
  let best = stations[0], bestD = Infinity;
  for(const s of stations){ const d=Math.hypot(lat-s.lat,lon-s.lon); if(d<bestD){bestD=d; best=s;} }
  return best;
}

function marinaPhoto(id){ return MARINA_PHOTOS[id] || EDITION_CONFIG.defaultMarinaPhotoFallback; }

function resetPrefs(){
  prefs = { locKey:EDITION_CONFIG.defaultLocKey, windMin:8, windMax:18, gustMax:22, durationHrs:4, tidePref:"any", theme:null,
    custom:{ enabled:false, name:"My Marina", lat:EDITION_CONFIG.defaultCustomMarina.lat, lon:EDITION_CONFIG.defaultCustomMarina.lon, stationId:EDITION_CONFIG.defaultCustomMarina.stationId },
    current:{ enabled:false, name:"Current Location", lat:null, lon:null, stationId:"" }
  };
  clearSavedPrefs();
  syncPrefsUI();
  applySavedTheme();
  toast("Preferences reset");
  loadAll();
}

function chooseFreeMode(){
  closeSubscribeModal();
  if(isLocked(prefs.locKey)){
    prefs.locKey = EDITION_CONFIG.defaultLocKey;
    savePrefsToStorage();
    syncPrefsUI();
    loadAll();
  }
  updateLockState();
  toast(EDITION_CONFIG.freeModeMessage);
}

function openSubscribeModal(mode){
  const isUpgrade = mode === "upgrade";
  const isRestore = mode === "restore";
  document.getElementById("sub-headline").textContent = isRestore
    ? "Restore your SailWindow subscription"
    : isUpgrade
      ? "Upgrade for full " + EDITION_CONFIG.regionLabel + " access"
      : "Your 7-day free trial has ended";
  document.getElementById("sub-free-option").style.display = isRestore ? "none" : "block";
  document.getElementById("sub-dismiss").style.display    = (isUpgrade || isRestore) ? "block" : "none";
  document.getElementById("sub-activate").style.display   = isRestore ? "block" : "none";
  document.getElementById("subscribe-overlay").style.display = "flex";
}

function handleStripeCheckout(){
  const url = _selectedPlan === "annual" ? STRIPE_ANNUAL : _selectedPlan === "bundle" ? STRIPE_BUNDLE : STRIPE_MONTHLY;
  if(url === "#"){
    toast("Stripe not yet configured — set STRIPE_MONTHLY / STRIPE_ANNUAL / STRIPE_BUNDLE URLs in the code");
    return;
  }
  // keep the app open in this tab so the user can activate after paying
  window.open(url, "_blank", "noopener");
  document.getElementById("sub-activate").style.display = "block";
  document.getElementById("sub-activate-note").textContent = _selectedPlan === "bundle"
    ? EDITION_CONFIG.bundleActivateMessage
    : "Checkout opened in a new tab. Once your payment is complete, come back and tap below.";
}

function activateSubscription(){
  if(storageAvailable()) localStorage.setItem(SUB_KEY, "active");
  closeSubscribeModal();
  updateTrialBanner();
  updateLockState();
  if(_selectedPlan === "bundle"){
    toast("✦ Subscription active — all " + EDITION_CONFIG.stationCount + " stations unlocked. Visit " + EDITION_CONFIG.partnerDomain + " and activate there too.");
  } else {
    toast("✦ Subscription active — all " + EDITION_CONFIG.stationCount + " stations unlocked");
  }
  loadAll();
}

async function buildMarinaCards(){
  const wrap = document.getElementById('marina-results');
  if(!wrap) return;
  wrap.innerHTML = '<div style="padding:14px;color:var(--muted)">Loading marinas…</div>';
  const center = activeSearchCenter();
  renderBridges(center);
  const q = (document.getElementById('marina-search-input')?.value || '').toLowerCase().trim();

  // Build base entries from LOCATIONS
  const base = Object.entries(LOCATIONS).map(([id, loc]) => ({
    id, ...loc, source:'saved',
    meta: MARINA_META[id] || {},
    dist: Math.round(distMiles(center.lat, center.lon, loc.lat, loc.lon))
  }));

  // Fetch live nearby marinas (localStorage 24h → in-memory 2min fallback)
  let live = [];
  try{
    if(!marinaLiveAt || (Date.now()-marinaLiveAt) > 120000 || !marinaLiveCache.length){
      const lsCached = loadMarinaCacheLs(center.lat, center.lon);
      if(lsCached){
        marinaLiveCache = lsCached;
      } else {
        marinaLiveCache = await fetchNearbyMarinas(center.lat, center.lon, 48280);
        saveMarinaCacheLs(center.lat, center.lon, marinaLiveCache);
      }
      marinaLiveAt = Date.now();
    }
    live = marinaLiveCache.map((m,i) => ({
      id:'live-'+i, ...m, source:'live',
      meta:{ rating:'', reviews:'', hours:'', area:'', phone:m.tags.phone||m.tags['contact:phone']||'' },
      dist:Math.round(distMiles(center.lat, center.lon, m.lat, m.lon))
    }));
  }catch(e){ console.warn('Nearby marina fetch failed', e); }

  // Add marina_data.json entries (real marina names — searchable by name)
  marinaDbMap = {};
  const dbEntries = [];
  if(SW_MARINA_DB){
    for(const [mname, mdata] of Object.entries(SW_MARINA_DB)){
      const lon = mdata.lng ?? mdata.lon;
      if(mdata.lat == null || lon == null) continue;
      const eid = 'db-' + mname.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const entry = {
        id: eid, name: mname, lat: mdata.lat, lon: lon, source: 'db',
        meta: { area:'', rating:'', reviews:'', phone:'', hours:'' },
        dist: Math.round(distMiles(center.lat, center.lon, mdata.lat, lon))
      };
      marinaDbMap[eid] = entry;
      dbEntries.push(entry);
    }
  }

  // Deduplicate and sort by distance
  const seen = new Set();
  const entries = [...base, ...live, ...dbEntries].filter(m=>{
    const key = (m.name+'|'+m.lat.toFixed(5)+'|'+m.lon.toFixed(5)).toLowerCase();
    if(seen.has(key)) return false; seen.add(key); return true;
  }).sort((a,b)=>(a.dist??99999)-(b.dist??99999));

  wrap.innerHTML = '';
  for(const m of entries){
    const hay = `${m.name} ${m.sub||''} ${m.id} ${m.meta?.area||''} ${m.meta?.hours||''}`.toLowerCase();
    if(q && !hay.includes(q)) continue;
    const isLive = m.source === 'live';
    const isActive = prefs.locKey === m.id;
    const div = document.createElement('div');
    div.className = 'marina-card' + (isActive ? ' marina-active' : '');
    div.onclick = () => selectMarinaFromCard(m.id, m);
    const phoneHref = m.meta?.phone ? String(m.meta.phone).replace(/[^0-9+]/g,'') : '';
    const mapsQuery = encodeURIComponent(m.meta?.address || m.name);
    div.innerHTML = `
      <img class="marina-thumb" src="${marinaPhoto(isLive ? EDITION_CONFIG.defaultLocKey : m.id)}" alt="${m.name}" loading="lazy">
      <div class="marina-main">
        <div class="marina-title">${m.name}${m.meta?.warn ? ' <span style="font-size:11px;font-weight:700;color:var(--warn);background:var(--warn-hl);padding:1px 6px;border-radius:99px;vertical-align:middle">⚠ Advisory</span>' : ''}</div>
        <div class="marina-meta">
          ${isLive ? '<span>Nearby marina</span>' : (m.meta.rating ? `<span>★ ${m.meta.rating}${m.meta.reviews ? ' ('+m.meta.reviews+')' : ''}</span>` : '<span>Saved station</span>')}
          ${m.dist != null ? `<span>• ${m.dist} mi</span>` : ''}
        </div>
        ${m.meta?.address ? `<div class="marina-meta" style="margin-top:2px"><a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:none;font-size:12px" onclick="event.stopPropagation()">📍 ${m.meta.address}</a></div>` : ''}
        ${m.meta?.phone
          ? `<div class="marina-meta" style="margin-top:2px"><a href="tel:${phoneHref}" style="color:var(--primary);text-decoration:none;font-weight:600;font-size:13px" onclick="event.stopPropagation()">📞 ${m.meta.phone}</a></div>`
          : !isLive ? `<div class="marina-meta" style="margin-top:2px"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.meta?.area||m.name)}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;font-size:12px" onclick="event.stopPropagation()">🔍 Find marinas nearby</a></div>` : ''}
        ${m.meta?.hours ? `<div class="marina-meta" style="margin-top:2px;font-size:11px;${m.meta?.warn ? 'color:var(--warn);font-weight:600;opacity:1' : 'opacity:.75'}">${m.meta?.warn ? '' : '🕐 '}${m.meta.hours}</div>` : ''}
        <div class="marina-actions">
          <button class="marina-mini" onclick="event.stopPropagation();selectMarinaFromCard('${m.id}',null)">Set Active</button>
          <button class="marina-mini secondary" onclick="event.stopPropagation();toggleAshore(this,${m.lat},${m.lon},${marinaHasFuelTag(m.tags)})">⛽🍴 Ashore</button>
          <button class="marina-mini secondary" onclick="event.stopPropagation();focusMarina(${m.lat},${m.lon})">Focus Map</button>
        </div>
      </div>`;
    wrap.appendChild(div);
  }
  if(!wrap.children.length){
    wrap.innerHTML = '<div style="padding:14px;color:var(--muted)">No marinas found.</div>';
  }
}
