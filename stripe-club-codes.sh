#!/usr/bin/env bash
# SailWindow — mint club referral + captain comp promotion codes.
#
# One-time setup (2 minutes):
#   1. Stripe Dashboard -> Developers -> API keys -> "+ Create restricted key"
#      Name: club-codes   Permission: Coupons = Write   (nothing else)
#   2. Save the key (starts with rk_live_) into:
#        ~/.config/sailwindow/stripe_restricted_key
#      then:  chmod 600 ~/.config/sailwindow/stripe_restricted_key
#   3. Run:  bash ~/Desktop/SailWindow/stripe-club-codes.sh
#
# Safe to re-run: codes that already exist are skipped.
# To add a club later, append a line at the bottom and re-run.

set -euo pipefail

KEY_FILE="$HOME/.config/sailwindow/stripe_restricted_key"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing $KEY_FILE — see setup steps at the top of this script." >&2
  exit 1
fi
KEY="$(tr -d '[:space:]' < "$KEY_FILE")"
API="https://api.stripe.com/v1/promotion_codes"
FAILED=0

create() { # create CODE COUPON [MAX_REDEMPTIONS]
  local code="$1" coupon="$2" max="${3:-}"

  local existing
  existing=$(curl -sS --max-time 30 -G "$API" -u "$KEY:" -d "code=$code" -d "limit=1" |
    python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"][0]["id"] if d.get("data") else "")')
  if [[ -n "$existing" ]]; then
    echo "SKIP  $code  (already exists: $existing)"
    return
  fi

  local args=(-d "promotion[type]=coupon" -d "promotion[coupon]=$coupon" -d "code=$code")
  [[ -n "$max" ]] && args+=(-d "max_redemptions=$max")

  local resp
  resp=$(curl -sS --max-time 30 "$API" -u "$KEY:" "${args[@]}")
  if echo "$resp" | python3 -c 'import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get("object")=="promotion_code" else 1)'; then
    echo "OK    $code  -> $coupon${max:+  (max $max use)}"
  else
    echo "FAIL  $code  -> $(echo "$resp" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("error",{}).get("message","unknown error"))')"
    FAILED=1
  fi
}

echo "== Club member codes (CLUB-MEMBER-20: 20% off forever, unlimited) =="
create NAVYYC20   CLUB-MEMBER-20   # Navy Yacht Club Pensacola
create PYC20      CLUB-MEMBER-20   # Pensacola Yacht Club
create GLYC20     CLUB-MEMBER-20   # Grand Lagoon Yacht Club
create PBYC20     CLUB-MEMBER-20   # Pensacola Beach Yacht Club
create PSC20      CLUB-MEMBER-20   # Pensacola Sailing Club / Academy
create SAILPENS20 CLUB-MEMBER-20   # Sail Pensacola

echo "== Captain comps (CLUB-CAPTAIN-100: 100% off forever, single-use) =="
create CAPT-NAVYYC   CLUB-CAPTAIN-100 1   # Frank Bean, Commodore
create CAPT-PYC      CLUB-CAPTAIN-100 1   # Cesar Travado, Sailing Director
create CAPT-GLYC     CLUB-CAPTAIN-100 1
create CAPT-PBYC     CLUB-CAPTAIN-100 1
create CAPT-PSC      CLUB-CAPTAIN-100 1
create CAPT-SAILPENS CLUB-CAPTAIN-100 1

echo "== Friends & crew comps (FRIENDS-100: 100% off forever) =="
create FRIEND-JIM      FRIENDS-100 1   # Jim (FL) — single-use
create FRIEND-MARJORIE FRIENDS-100 1   # Marjorie (FL) — single-use
create FRIENDS-DEMO    FRIENDS-100     # Unlimited demo code for testing
# (FRIEND-FL-1 / FRIEND-FL-2 retired 2026-06-12, deactivated in dashboard)

exit $FAILED
