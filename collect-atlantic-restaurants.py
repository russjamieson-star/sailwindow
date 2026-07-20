#!/usr/bin/env python3
"""
SailWindow — Atlantic edition Google Places restaurant collector

Mirrors the Gulf edition's collect-marina-restaurants.py, but:
  1. Targets the 45 Atlantic marinas (from dist-atlantic/marina_data.json).
  2. Requests places.websiteUri in the field mask (the Gulf collector script
     didn't request it, but dist-v6/marina_data.json — the actual live Gulf
     restaurant data — has a "website" field on every entry, so this adds it
     to close that gap for Atlantic).
  3. Writes output DIRECTLY in the marina_data.json shape the app consumes
     (see scripts/convert-sailwindow-restaurants.js's documented shape and
     getSwRestaurants() in engine.js), not the raw/trimmed Places shape —
     so this script's output can be merged straight into
     dist-atlantic/marina_data.json without an extra conversion step.

Every restaurant here is written with "partner": false and
"discount_offer": "" — this is bulk Google-sourced listing data only.
The partner/discount program (see restaurants/SailWindow Partner Program
Guide.pdf and the outreach email templates) is a separate manual
outreach process Russ runs himself; nothing here fabricates partner
deals.

Cost estimate: 45 marinas × $0.032/call ≈ $1.44 per full run.
The $200/month free credit covers ~1,785 calls, so this is not a
meaningful expense against pre-existing budget.

Usage:
  export GOOGLE_PLACES_KEY="your_key_here"
  python3 collect-atlantic-restaurants.py

Output (same directory):
  atlantic_marina_data.populated.json — ready to review, then copy over
  dist-atlantic/marina_data.json (or merge by hand).
"""

import json
import os
import sys
import time

import requests

# ── Config ────────────────────────────────────────────────────────────────────

API_KEY = os.environ.get("GOOGLE_PLACES_KEY", "")
RADIUS_METERS = 800
MAX_RESULTS = 20
RATE_LIMIT_DELAY = 0.15

PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.rating",
    "places.priceLevel",
    "places.nationalPhoneNumber",
    "places.shortFormattedAddress",
    "places.types",
    "places.location",
    "places.googleMapsUri",
    "places.websiteUri",
])

# ── Atlantic marina list (from dist-atlantic/marina_data.json) ────────────────

MARINAS = [
    {"id": "St. Marys Intracoastal Gateway Marina", "name": "St. Marys Intracoastal Gateway Marina", "lat": 30.721419, "lng": -81.546607},
    {"id": "Jekyll Island Marina", "name": "Jekyll Island Marina", "lat": 31.046448, "lng": -81.419912},
    {"id": "Kilkenny Marina", "name": "Kilkenny Marina", "lat": 31.93806, "lng": -81.31361},
    {"id": "Isle of Hope Marina", "name": "Isle of Hope Marina", "lat": 31.979949, "lng": -81.056947},
    {"id": "Harbour Town Yacht Basin", "name": "Harbour Town Yacht Basin", "lat": 32.139847, "lng": -80.810287},
    {"id": "Safe Harbor Beaufort", "name": "Safe Harbor Beaufort", "lat": 32.431139, "lng": -80.673105},
    {"id": "The Marina at Edisto Beach", "name": "The Marina at Edisto Beach", "lat": 32.49583, "lng": -80.31444},
    {"id": "Charleston City Marina", "name": "Charleston City Marina", "lat": 32.779482, "lng": -79.949977},
    {"id": "Isle of Palms Marina", "name": "Isle of Palms Marina", "lat": 32.803901, "lng": -79.760487},
    {"id": "Georgetown Landing Marina", "name": "Georgetown Landing Marina", "lat": 33.366791, "lng": -79.269448},
    {"id": "Osprey Marina", "name": "Osprey Marina", "lat": 33.677802, "lng": -79.03876},
    {"id": "Barefoot Marina", "name": "Barefoot Marina", "lat": 33.82778, "lng": -78.69028},
    {"id": "Southport Marina", "name": "Southport Marina", "lat": 33.919443, "lng": -78.025969},
    {"id": "Tidewater Yacht Marina", "name": "Tidewater Yacht Marina", "lat": 36.840054, "lng": -76.298661},
    {"id": "Cape Charles Yacht Center", "name": "Cape Charles Yacht Center", "lat": 37.2675, "lng": -76.01417},
    {"id": "Deltaville Marina", "name": "Deltaville Marina", "lat": 37.5528, "lng": -76.3355},
    {"id": "Chesapeake Boat Basin", "name": "Chesapeake Boat Basin", "lat": 37.700145, "lng": -76.351561},
    {"id": "Somers Cove Marina", "name": "Somers Cove Marina", "lat": 37.979706, "lng": -75.857454},
    {"id": "Zahniser's Yachting Center", "name": "Zahniser's Yachting Center", "lat": 38.328699, "lng": -76.459773},
    {"id": "Herrington Harbour South", "name": "Herrington Harbour South", "lat": 38.727227, "lng": -76.540289},
    {"id": "Annapolis City Dock", "name": "Annapolis City Dock", "lat": 38.976879, "lng": -76.484815},
    {"id": "Chesapeake Inn & Marina", "name": "Chesapeake Inn & Marina", "lat": 39.526455, "lng": -75.811688},
    {"id": "Delaware City Marina", "name": "Delaware City Marina", "lat": 39.573252, "lng": -75.590151},
    {"id": "Utsch's Marina", "name": "Utsch's Marina", "lat": 38.951038, "lng": -74.908296},
    {"id": "Golden Nugget Farley State Marina", "name": "Golden Nugget Farley State Marina", "lat": 39.379982, "lng": -74.424949},
    {"id": "Hoffman's Marina", "name": "Hoffman's Marina", "lat": 40.107966, "lng": -74.050519},
    {"id": "Liberty Landing Marina", "name": "Liberty Landing Marina", "lat": 40.709143, "lng": -74.044503},
    {"id": "Bayshore Waterfront Park Marina", "name": "Bayshore Waterfront Park Marina", "lat": 40.436673, "lng": -74.098641},
    {"id": "Manhasset Bay Marina", "name": "Manhasset Bay Marina", "lat": 40.836071, "lng": -73.706359},
    {"id": "Stamford Landing Marina", "name": "Stamford Landing Marina", "lat": 41.03736, "lng": -73.547471},
    {"id": "Safe Harbor Bridgeport", "name": "Safe Harbor Bridgeport", "lat": 41.175362, "lng": -73.181671},
    {"id": "Saybrook Point Marina", "name": "Saybrook Point Marina", "lat": 41.281188, "lng": -72.352138},
    {"id": "Mystic Shipyard", "name": "Mystic Shipyard", "lat": 41.343747, "lng": -71.975567},
    {"id": "Newport Yachting Center", "name": "Newport Yachting Center", "lat": 41.485105, "lng": -71.315241},
    {"id": "Point Judith Marina", "name": "Point Judith Marina", "lat": 41.3615, "lng": -71.4814},
    {"id": "Cuttyhunk Marina / Town Wharf", "name": "Cuttyhunk Marina / Town Wharf", "lat": 41.418, "lng": -70.9337},
    {"id": "MacDougalls' Cape Cod Marine", "name": "MacDougalls' Cape Cod Marine", "lat": 41.523815, "lng": -70.669343},
    {"id": "Plymouth Yacht Basin", "name": "Plymouth Yacht Basin", "lat": 41.95527, "lng": -70.661743},
    {"id": "Constitution Marina", "name": "Constitution Marina", "lat": 42.371773, "lng": -71.060126},
    {"id": "Hawthorne Cove Marina", "name": "Hawthorne Cove Marina", "lat": 42.522893, "lng": -70.883401},
    {"id": "Newburyport City Waterfront Docks", "name": "Newburyport City Waterfront Docks", "lat": 42.812077, "lng": -70.872894},
    {"id": "Safe Harbor Marinas Fore Points", "name": "Safe Harbor Marinas Fore Points", "lat": 43.662411, "lng": -70.245371},
    {"id": "Boothbay Harbor Marina", "name": "Boothbay Harbor Marina", "lat": 43.854486, "lng": -69.625128},
    {"id": "Rockland Public Landing", "name": "Rockland Public Landing", "lat": 44.125, "lng": -69.13167},
    {"id": "Dysart's Great Harbor Marina", "name": "Dysart's Great Harbor Marina", "lat": 44.27833, "lng": -68.32194}
]

BASE_MARINA_DATA_PATH = "dist-atlantic/marina_data.json"
OUT_PATH = "atlantic_marina_data.populated.json"


def fetch_places(marina):
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
                "center": {"latitude": marina["lat"], "longitude": marina["lng"]},
                "radius": float(RADIUS_METERS),
            }
        },
        "rankPreference": "DISTANCE",
    }
    resp = requests.post(PLACES_NEARBY_URL, headers=headers, json=body, timeout=15)
    resp.raise_for_status()
    return resp.json().get("places", [])


def to_marina_data_restaurant(place):
    """Convert one Places API result into the exact shape marina_data.json
    (and getSwRestaurants()/toggleAshore() in engine.js) expects."""
    name_obj = place.get("displayName", {})
    return {
        "name": name_obj.get("text", ""),
        "address": place.get("shortFormattedAddress", ""),
        "phone": place.get("nationalPhoneNumber", ""),
        "website": place.get("websiteUri", ""),
        "rating": place.get("rating", ""),
        "google_maps": place.get("googleMapsUri", ""),
        "partner": False,
        "discount_offer": "",
    }


def main():
    if not API_KEY:
        print("ERROR: Set GOOGLE_PLACES_KEY env var before running.", file=sys.stderr)
        print("  export GOOGLE_PLACES_KEY='AIza...'", file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_path = os.path.join(script_dir, BASE_MARINA_DATA_PATH)
    out_path = os.path.join(script_dir, OUT_PATH)

    base = {}
    if os.path.exists(base_path):
        with open(base_path) as f:
            base = json.load(f)

    output = {}
    errors = []
    total_places = 0

    print(f"Collecting restaurants for {len(MARINAS)} Atlantic marinas...")
    print(f"Radius: {RADIUS_METERS}m  |  Max per marina: {MAX_RESULTS}\n")

    for i, marina in enumerate(MARINAS, 1):
        label = f"[{i:02d}/{len(MARINAS)}] {marina['name']}"
        existing = base.get(marina["name"], {})
        try:
            places = fetch_places(marina)
            restaurants = [to_marina_data_restaurant(p) for p in places]
            output[marina["name"]] = {
                "lat": existing.get("lat", marina["lat"]),
                "lng": existing.get("lng", marina["lng"]),
                "restaurants": restaurants,
            }
            total_places += len(restaurants)
            print(f"  ✓ {label}: {len(restaurants)} restaurants")
        except requests.HTTPError as e:
            print(f"  ✗ {label}: HTTP {e.response.status_code} — {e.response.text[:120]}")
            errors.append({"marina": marina["name"], "error": str(e)})
            output[marina["name"]] = existing or {
                "lat": marina["lat"], "lng": marina["lng"], "restaurants": []
            }
        except Exception as e:
            print(f"  ✗ {label}: {e}")
            errors.append({"marina": marina["name"], "error": str(e)})
            output[marina["name"]] = existing or {
                "lat": marina["lat"], "lng": marina["lng"], "restaurants": []
            }

        time.sleep(RATE_LIMIT_DELAY)

    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
        f.write("\n")

    print(f"\nDone. {total_places} restaurants across {len(MARINAS)} marinas.")
    if errors:
        print(f"Errors ({len(errors)}): {[e['marina'] for e in errors]}")
    print(f"Output → {out_path}")
    print(f"\nEstimated cost: {len(MARINAS)} calls × $0.032 = ${len(MARINAS) * 0.032:.2f}")
    print("\nReview the output, then copy it over dist-atlantic/marina_data.json")
    print("(or tell Claude it's ready and it can do the merge/verify/write).")


if __name__ == "__main__":
    main()
