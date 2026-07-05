#!/usr/bin/env python3
"""
SailWindow — Google Places restaurant collector
Fetches up to 20 restaurants/bars/cafes within 800m of each SailWindow marina.
Stores results as marina_restaurants.json and a lightweight ashore_cache.json
(same TTL format as the app's sailwindow.ashore.v1 localStorage cache).

Cost estimate: 35 marinas × $0.032/call ≈ $1.12 per full run.
The $200/month free credit covers ~1,785 calls, so monthly refreshes cost $0.

Usage:
  export GOOGLE_PLACES_KEY="your_key_here"
  python3 collect-marina-restaurants.py

Output files (same directory):
  marina_restaurants_raw.json   — full Places API response per marina
  marina_restaurants_ashore.json — trimmed, ready to seed into app or KV store
"""

import json
import os
import sys
import time
from datetime import datetime, timezone

import requests

# ── Config ────────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("GOOGLE_PLACES_KEY", "")
RADIUS_METERS = 800          # ~0.5 miles walking distance
ONSITE_THRESHOLD_METERS = 120  # flag as "On-site" if this close to marina coords
MAX_RESULTS = 20
RATE_LIMIT_DELAY = 0.15      # seconds between calls (polite; well under quota)

PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.regularOpeningHours",
    "places.nationalPhoneNumber",
    "places.shortFormattedAddress",
    "places.primaryTypeDisplayName",
    "places.types",
    "places.location",
    "places.googleMapsUri",
])

# ── SailWindow marina list (from LOCATIONS + MARINA_META in V6) ───────────────
# Coords match LOCATIONS catalog exactly; address from MARINA_META.

MARINAS = [
    # Florida — Keys & Southwest
    {"id": "key-west",        "name": "Key West, FL",                  "lat": 24.5557, "lng": -81.8079},
    {"id": "naples",          "name": "Naples, FL",                    "lat": 26.1317, "lng": -81.8075},
    {"id": "fort-myers",      "name": "Fort Myers, FL",                "lat": 26.6478, "lng": -81.8711},
    # Florida — Tampa Bay
    {"id": "clearwater",      "name": "Clearwater Beach, FL",          "lat": 27.9783, "lng": -82.8317},
    {"id": "st-pete",         "name": "St. Petersburg, FL",            "lat": 27.7606, "lng": -82.6269},
    {"id": "tampa-hooker",    "name": "Tampa — Hooker Point",          "lat": 27.9060, "lng": -82.4167},
    {"id": "tampa-egmont",    "name": "Tampa — Egmont Key",            "lat": 27.6017, "lng": -82.7633},
    {"id": "tampa-gandy",     "name": "Tampa — Gandy Bridge",          "lat": 27.8867, "lng": -82.5100},
    # Florida — Gulf Coast
    {"id": "cedar-key",       "name": "Cedar Key, FL",                 "lat": 29.1350, "lng": -83.0317},
    {"id": "apalachicola",    "name": "Apalachicola, FL",              "lat": 29.7244, "lng": -84.9806},
    # Florida — Panhandle
    {"id": "panama-city",     "name": "Panama City, FL",               "lat": 30.1497, "lng": -85.6644},
    {"id": "rocky-bayou",     "name": "Niceville — Rocky Bayou",       "lat": 30.5070, "lng": -86.4470},
    {"id": "niceville",       "name": "Niceville — Valparaiso",        "lat": 30.5030, "lng": -86.4930},
    {"id": "destin",          "name": "Destin — East Pass",            "lat": 30.3950, "lng": -86.5130},
    {"id": "pensacola",       "name": "Pensacola, FL",                 "lat": 30.4033, "lng": -87.2117},
    {"id": "pensacola-beach", "name": "Pensacola Beach Pier",          "lat": 30.3317, "lng": -87.1550},
    # Alabama
    {"id": "dauphin-island",  "name": "Dauphin Island, AL",            "lat": 30.2500, "lng": -88.0750},
    {"id": "mobile",          "name": "Mobile State Docks, AL",        "lat": 30.7046, "lng": -88.0396},
    # Mississippi
    {"id": "pascagoula",      "name": "Pascagoula, MS",                "lat": 30.3678, "lng": -88.5631},
    {"id": "biloxi",          "name": "Biloxi, MS",                    "lat": 30.4117, "lng": -88.9033},
    {"id": "bay-waveland",    "name": "Bay Waveland, MS",              "lat": 30.3263, "lng": -89.3258},
    # Louisiana
    {"id": "sw-pass",         "name": "SW Pass, LA",                   "lat": 28.9322, "lng": -89.4075},
    {"id": "grand-isle",      "name": "Grand Isle, LA",                "lat": 29.2633, "lng": -89.9567},
    {"id": "port-fourchon",   "name": "Port Fourchon, LA",             "lat": 29.1142, "lng": -90.1993},
    {"id": "new-orleans",     "name": "New Orleans, LA",               "lat": 30.0272, "lng": -90.1133},
    {"id": "calcasieu-pass",  "name": "Calcasieu Pass, LA",            "lat": 29.7682, "lng": -93.3429},
    # Texas
    {"id": "sabine-pass",     "name": "Sabine Pass, TX",               "lat": 29.7284, "lng": -93.8701},
    {"id": "port-arthur",     "name": "Port Arthur, TX",               "lat": 29.8667, "lng": -93.9300},
    {"id": "galveston",       "name": "Galveston Pier 21, TX",         "lat": 29.3100, "lng": -94.7933},
    {"id": "freeport",        "name": "Freeport, TX",                  "lat": 28.9433, "lng": -95.3025},
    {"id": "matagorda",       "name": "Matagorda City, TX",            "lat": 28.7100, "lng": -95.9139},
    {"id": "rockport",        "name": "Rockport, TX",                  "lat": 28.0217, "lng": -97.0467},
    {"id": "aransas-pass",    "name": "Aransas Pass, TX",              "lat": 27.8366, "lng": -97.0391},
    {"id": "corpus-christi",  "name": "Corpus Christi, TX",            "lat": 27.5800, "lng": -97.2167},
    {"id": "port-isabel",     "name": "Port Isabel, TX",               "lat": 26.0612, "lng": -97.2155},
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def haversine_meters(lat1, lng1, lat2, lng2):
    """Straight-line distance in meters between two lat/lng points."""
    import math
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lng2 - lng1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def price_label(level):
    mapping = {
        "PRICE_LEVEL_FREE": "Free",
        "PRICE_LEVEL_INEXPENSIVE": "$",
        "PRICE_LEVEL_MODERATE": "$$",
        "PRICE_LEVEL_EXPENSIVE": "$$$",
        "PRICE_LEVEL_VERY_EXPENSIVE": "$$$$",
    }
    return mapping.get(level, "")


def today_hours(opening_hours):
    """Return today's opening period as a human string, or None."""
    if not opening_hours:
        return None
    desc = opening_hours.get("weekdayDescriptions", [])
    if not desc:
        return None
    # weekdayDescriptions is Mon–Sun; today's index = Python weekday (Mon=0)
    today_idx = datetime.now().weekday()
    return desc[today_idx] if today_idx < len(desc) else None


def trim_place(place, marina_lat, marina_lng):
    """Trim a raw Places API place to the fields the app actually uses."""
    loc = place.get("location", {})
    place_lat = loc.get("latitude")
    place_lng = loc.get("longitude")

    dist_m = None
    onsite = False
    if place_lat is not None and place_lng is not None:
        dist_m = round(haversine_meters(marina_lat, marina_lng, place_lat, place_lng))
        onsite = dist_m <= ONSITE_THRESHOLD_METERS

    name_obj = place.get("displayName", {})
    type_obj = place.get("primaryTypeDisplayName", {})

    return {
        "id":      place.get("id", ""),
        "name":    name_obj.get("text", ""),
        "type":    type_obj.get("text", ""),
        "rating":  place.get("rating"),
        "reviews": place.get("userRatingCount"),
        "price":   price_label(place.get("priceLevel", "")),
        "hours":   today_hours(place.get("regularOpeningHours")),
        "phone":   place.get("nationalPhoneNumber", ""),
        "address": place.get("shortFormattedAddress", ""),
        "mapsUrl": place.get("googleMapsUri", ""),
        "distM":   dist_m,
        "onsite":  onsite,
    }


def fetch_restaurants(marina):
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "includedTypes": ["restaurant", "bar", "cafe", "fast_food_restaurant"],
        "maxResultCount": MAX_RESULTS,
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": marina["lat"],
                    "longitude": marina["lng"],
                },
                "radius": float(RADIUS_METERS),
            }
        },
        "rankPreference": "DISTANCE",
    }
    resp = requests.post(PLACES_NEARBY_URL, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    return resp.json().get("places", [])


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not API_KEY:
        print("ERROR: Set GOOGLE_PLACES_KEY env var before running.", file=sys.stderr)
        print("  export GOOGLE_PLACES_KEY='AIza...'", file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path   = os.path.join(script_dir, "marina_restaurants_raw.json")
    ashore_path = os.path.join(script_dir, "marina_restaurants_ashore.json")

    raw_results   = {}
    ashore_cache  = {}
    errors        = []
    total_places  = 0

    collected_at = datetime.now(timezone.utc).isoformat()

    print(f"Collecting restaurants for {len(MARINAS)} marinas...")
    print(f"Radius: {RADIUS_METERS}m  |  Max per marina: {MAX_RESULTS}\n")

    for i, marina in enumerate(MARINAS, 1):
        label = f"[{i:02d}/{len(MARINAS)}] {marina['name']}"
        try:
            places = fetch_restaurants(marina)
            trimmed = [trim_place(p, marina["lat"], marina["lng"]) for p in places]

            raw_results[marina["id"]] = places
            ashore_cache[marina["id"]] = {
                "marina":      marina["name"],
                "lat":         marina["lat"],
                "lng":         marina["lng"],
                "collectedAt": collected_at,
                "places":      trimmed,
            }

            total_places += len(places)
            onsite_count = sum(1 for p in trimmed if p["onsite"])
            onsite_note  = f"  ({onsite_count} on-site)" if onsite_count else ""
            print(f"  ✓ {label}: {len(places)} places{onsite_note}")

        except requests.HTTPError as e:
            print(f"  ✗ {label}: HTTP {e.response.status_code} — {e.response.text[:120]}")
            errors.append({"marina": marina["id"], "error": str(e)})
        except Exception as e:
            print(f"  ✗ {label}: {e}")
            errors.append({"marina": marina["id"], "error": str(e)})

        time.sleep(RATE_LIMIT_DELAY)

    # Write outputs
    with open(raw_path, "w") as f:
        json.dump(raw_results, f, indent=2)
    with open(ashore_path, "w") as f:
        json.dump(ashore_cache, f, indent=2)

    print(f"\nDone.  {total_places} places across {len(MARINAS)} marinas.")
    if errors:
        print(f"Errors ({len(errors)}): {[e['marina'] for e in errors]}")
    print(f"Raw data  → {raw_path}")
    print(f"App cache → {ashore_path}")
    print(f"\nEstimated cost: {len(MARINAS)} calls × $0.032 = ${len(MARINAS) * 0.032:.2f}")


if __name__ == "__main__":
    main()
