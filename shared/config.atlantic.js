// ─────────────────────────────────────────────────────────────────
// Atlantic edition config — loaded BEFORE engine.js, which reads EDITION_CONFIG.
// Values here are the exact ones already live in dist-atlantic/index.html;
// this file doesn't change any Atlantic behavior, it just names the values
// that used to be hardcoded inline so the same engine.js can serve every
// edition.
// ─────────────────────────────────────────────────────────────────
const EDITION_CONFIG = {
  edition: "atlantic",
  dbVersion: "2026-07-19-atlantic-v1",   // bump whenever marina_data.json is redeployed
  freeKeys: ["annapolis","newport"],     // placeholder, unconfirmed by Russ — see TODO.md
  stripeMonthly: "https://buy.stripe.com/28E8wJbSQ5Yce6G2wg7Re02",
  stripeAnnual:  "https://buy.stripe.com/00wdR36ywfyM0fQ5Is7Re03",
  stripeBundle:  "https://buy.stripe.com/28E14he0Yaes0fQ3Ak7Re04",

  regionLabel: "Atlantic Coast",         // used in "Upgrade for full ___ access"
  stationCount: 21,                      // used in the "all N stations unlocked" toast
  partnerDomain: "sailwindow.com",
  bundleActivateMessage: "Checkout opened in a new tab. Once your payment is complete, come back and tap below — then visit sailwindow.com (the Gulf edition) and tap \"Already a subscriber? Restore access\" to activate there too (each edition is a separate site, so it needs to be unlocked once on each).",

  defaultLocKey: "annapolis",
  defaultCustomMarina: { lat: 38.983883, lon: -76.480034, stationId: "8575512" },
  freeModeMessage: "Free access: Annapolis & Newport stations",
  // Atlantic never had a real per-marina fallback photo (the Gulf edition looks
  // up MARINA_PHOTOS["tampa-hooker"]); it used this hardcoded stock photo URL
  // instead — preserved as-is rather than silently "fixed" during extraction.
  defaultMarinaPhotoFallback: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=60",

  noaaStations: [
    // Georgia to North Carolina
    { id:"8670870", name:"Fort Pulaski, GA",              lat:32.034695, lon:-80.90303 },
    { id:"8665530", name:"Charleston (Cooper River Entrance), SC", lat:32.780834, lon:-79.923615 },
    { id:"8658120", name:"Wilmington, NC",                lat:34.2267, lon:-77.9533 },
    // Mid-Atlantic & Chesapeake
    { id:"8638610", name:"Sewells Point (Norfolk), VA",   lat:36.94278, lon:-76.32861 },
    { id:"8575512", name:"Annapolis, MD",                 lat:38.983883, lon:-76.480034 },
    { id:"8574680", name:"Baltimore (Fort McHenry), MD",  lat:39.266693, lon:-76.57831 },
    // C&D Canal & New Jersey
    { id:"8551910", name:"Reedy Point, DE",               lat:39.558334, lon:-75.571945 },
    { id:"8536110", name:"Cape May, NJ",                  lat:38.9683, lon:-74.96 },
    { id:"8534720", name:"Atlantic City, NJ",             lat:39.356667, lon:-74.41805 },
    // NY Harbor & Long Island Sound
    { id:"8518750", name:"The Battery (NY Harbor), NY",   lat:40.700554, lon:-74.01417 },
    { id:"8516945", name:"Kings Point, NY",               lat:40.8103, lon:-73.7649 },
    { id:"8467150", name:"Bridgeport, CT",                lat:41.17582, lon:-73.18397 },
    { id:"8461490", name:"New London, CT",                lat:41.371666, lon:-72.09556 },
    // Rhode Island to Massachusetts
    { id:"8452660", name:"Newport, RI",                   lat:41.504333, lon:-71.32614 },
    { id:"8454000", name:"Providence, RI",                lat:41.807167, lon:-71.400665 },
    { id:"8447930", name:"Woods Hole, MA",                lat:41.523613, lon:-70.67111 },
    { id:"8443970", name:"Boston, MA",                    lat:42.35389, lon:-71.05028 },
    { id:"8449130", name:"Nantucket Island, MA",           lat:41.285, lon:-70.0967 },
    // Maine Coastline
    { id:"8418150", name:"Portland, ME",                  lat:43.658054, lon:-70.24416 },
    { id:"8413320", name:"Bar Harbor, ME",                lat:44.392193, lon:-68.20428 },
    { id:"8410140", name:"Eastport, ME",                  lat:44.90461, lon:-66.98289 }
  ]
};
