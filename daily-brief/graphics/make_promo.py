"""Add a short message + askcaptainjim.com to an Ask Captain Jim promo image.

Usage: python3 make_promo.py promos.json
promos.json is a list of objects:
  {"image": "sailor-coffee", "out": "coffee-window.png",
   "headline": "Coffee first.", "subline": "Then check your sailing window."}
Images live in promos/ (any size); output goes to out/ (the folder served at https://askcaptainjim-cards.russjamieson.workers.dev).
The text sits on a dark fade across the bottom, so the picture stays clear above it.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "/System/Library/Fonts/Avenir Next.ttc"
BOLD, DEMI, HEAVY = 0, 2, 8
TEAL, ORANGE, WHITE, NAVY = (79, 179, 196), (242, 106, 61), (255, 255, 255), (11, 18, 28)
SITE = "askcaptainjim.com"


def font(style, size):
    return ImageFont.truetype(FONT, size, index=style)


def wrap(draw, text, f, width):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=f) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line] if line else lines


def render(p):
    src = next(os.path.join(HERE, "promos", p["image"] + ext) for ext in (".webp", ".png", ".jpg")
               if os.path.exists(os.path.join(HERE, "promos", p["image"] + ext)))
    im = Image.open(src).convert("RGBA")
    W, H = im.size
    u = W / 1024  # scale everything to the image width

    # Dark fade over the bottom 46% so white text reads on any picture.
    fade_h = int(H * 0.46)
    fade = Image.new("RGBA", (W, fade_h))
    fd = ImageDraw.Draw(fade)
    for y in range(fade_h):
        a = int(240 * min(1, (y / fade_h) * 2.2))
        fd.line([(0, y), (W, y)], fill=NAVY + (a,))
    im.alpha_composite(fade, (0, H - fade_h))

    d = ImageDraw.Draw(im)
    margin = int(56 * u)
    width = W - 2 * margin
    hf, sf = font(HEAVY, int(76 * u)), font(DEMI, int(40 * u))
    head = wrap(d, p["headline"], hf, width)
    sub = wrap(d, p.get("subline", ""), sf, width) if p.get("subline") else []

    # Website pill, bottom centre, in the brand's sailing orange.
    pf = font(BOLD, int(44 * u))
    tw = d.textlength(SITE, font=pf)
    pw, ph = int(tw + 64 * u), int(84 * u)
    px, py = (W - pw) // 2, H - margin - ph
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=ph // 2, fill=ORANGE)
    d.text((W / 2, py + ph / 2), SITE, font=pf, fill=WHITE, anchor="mm")

    # Headline + subline stacked above the pill, centred.
    lh_h, lh_s = int(hf.size * 1.12), int(sf.size * 1.3)
    y = py - int(40 * u) - len(sub) * lh_s - len(head) * lh_h
    for line in head:
        d.text((W / 2, y), line, font=hf, fill=WHITE, anchor="ma")
        y += lh_h
    for line in sub:
        d.text((W / 2, y), line, font=sf, fill=TEAL, anchor="ma")
        y += lh_s

    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    path = os.path.join(HERE, "out", p["out"])
    im.convert("RGB").save(path)
    return path


if __name__ == "__main__":
    for p in json.load(open(sys.argv[1])):
        print(render(p))
