// ─────────────────────────────────────────────────────────────────
// Gulf edition config — loaded BEFORE engine.js, which reads EDITION_CONFIG.
// Values here are the exact ones already live in dist/index.html; this file
// doesn't change any Gulf behavior, it just names the values that used to
// be hardcoded inline so the same engine.js can serve every edition.
// ─────────────────────────────────────────────────────────────────
const EDITION_CONFIG = {
  edition: "gulf",
  dbVersion: "2026-06-29",              // bump whenever marina_data.json is redeployed
  freeKeys: ["tampa-hooker","tampa-egmont","tampa-gandy","pensacola","pensacola-beach"],
  stripeMonthly: "https://buy.stripe.com/28EeV73mk86kaUuc6Q7Re00",
  stripeAnnual:  "https://buy.stripe.com/4gM8wJf521HW8MmeeY7Re01",
  stripeBundle:  "https://buy.stripe.com/28E14he0Yaes0fQ3Ak7Re04",

  regionLabel: "Gulf Coast",             // used in "Upgrade for full ___ access"
  stationCount: 32,                      // used in the "all N stations unlocked" toast
  partnerDomain: "atlantic.sailwindow.com",
  bundleActivateMessage: "Checkout opened in a new tab. Once your payment is complete, come back and tap below — then visit atlantic.sailwindow.com and tap \"Already a subscriber? Restore access\" to activate there too (each edition is a separate site, so it needs to be unlocked once on each).",

  defaultLocKey: "tampa-hooker",
  defaultCustomMarina: { lat: 27.9060, lon: -82.4167, stationId: "8726667" },
  freeModeMessage: "Free access: Tampa Bay & Pensacola stations",
  // MARINA_PHOTOS must already be defined (it's in this edition's own data file,
  // loaded before this config) — referenced here, not duplicated.
  get defaultMarinaPhotoFallback(){ return MARINA_PHOTOS["tampa-hooker"]; },

  noaaStations: [
    // Florida — Keys & Southwest
    { id:"8724580", name:"Key West, FL",              lat:24.5557, lon:-81.8079 },
    { id:"8725110", name:"Naples, FL",                lat:26.1317, lon:-81.8075 },
    { id:"8725520", name:"Fort Myers, FL",            lat:26.6478, lon:-81.8711 },
    // Florida — Tampa Bay
    { id:"8726724", name:"Clearwater Beach, FL",      lat:27.9783, lon:-82.8317 },
    { id:"8726520", name:"St. Petersburg, FL",        lat:27.7606, lon:-82.6269 },
    { id:"8726667", name:"Tampa — Hooker Point",      lat:27.9060, lon:-82.4167 },
    { id:"8726347", name:"Tampa — Egmont Key",        lat:27.6017, lon:-82.7633 },
    { id:"8726607", name:"Tampa — Gandy Bridge",      lat:27.8867, lon:-82.5100 },
    // Florida — Gulf Coast
    { id:"8727520", name:"Cedar Key, FL",             lat:29.1350, lon:-83.0317 },
    { id:"8728690", name:"Apalachicola, FL",          lat:29.7244, lon:-84.9806 },
    // Florida — Panhandle
    { id:"8729108", name:"Panama City, FL",           lat:30.1497, lon:-85.6644 },
    { id:"8729479", name:"Niceville — Rocky Bayou",   lat:30.5070, lon:-86.4470 },
    { id:"8729501", name:"Niceville — Valparaiso",    lat:30.5030, lon:-86.4930 },
    { id:"8729511", name:"Destin — East Pass",        lat:30.3950, lon:-86.5130 },
    { id:"8729840", name:"Pensacola, FL",             lat:30.4033, lon:-87.2117 },
    { id:"8729807", name:"Pensacola Beach Pier",      lat:30.3317, lon:-87.1550 },
    // Alabama
    { id:"8735180", name:"Dauphin Island, AL",        lat:30.2500, lon:-88.0750 },
    { id:"8737048", name:"Mobile State Docks, AL",    lat:30.7046, lon:-88.0396 },
    // Mississippi
    { id:"8741533", name:"Pascagoula, MS",            lat:30.3678, lon:-88.5631 },
    { id:"8744117", name:"Biloxi, MS",                lat:30.4117, lon:-88.9033 },
    { id:"8747437", name:"Bay Waveland, MS",          lat:30.3263, lon:-89.3258 },
    // Louisiana
    { id:"8760922", name:"SW Pass, LA",               lat:28.9322, lon:-89.4075 },
    { id:"8761724", name:"Grand Isle, LA",            lat:29.2633, lon:-89.9567 },
    { id:"8762075", name:"Port Fourchon, LA",         lat:29.1142, lon:-90.1993 },
    { id:"8761927", name:"New Orleans, LA",           lat:30.0272, lon:-90.1133 },
    { id:"8768094", name:"Calcasieu Pass, LA",        lat:29.7682, lon:-93.3429 },
    // Texas
    { id:"8770570", name:"Sabine Pass, TX",           lat:29.7284, lon:-93.8701 },
    { id:"8770475", name:"Port Arthur, TX",           lat:29.8667, lon:-93.9300 },
    { id:"8771450", name:"Galveston Pier 21, TX",     lat:29.3100, lon:-94.7933 },
    { id:"8772447", name:"Freeport, TX",              lat:28.9433, lon:-95.3025 },
    { id:"8773146", name:"Matagorda City, TX",        lat:28.7100, lon:-95.9139 },
    { id:"8774770", name:"Rockport, TX",              lat:28.0217, lon:-97.0467 },
    { id:"8775241", name:"Aransas Pass, TX",          lat:27.8366, lon:-97.0391 },
    { id:"8775870", name:"Corpus Christi, TX",        lat:27.5800, lon:-97.2167 },
    { id:"8779770", name:"Port Isabel, TX",           lat:26.0612, lon:-97.2155 }
  ]
};
