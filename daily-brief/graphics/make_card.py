"""Fill an Ask Captain Jim brief template (1254x1254) with one item's text.

Usage: python3 make_card.py cards.json
cards.json is a list of objects:
  {"template": "on-the-water", "out": "2026-10-07-fish-worlds.png",
   "tag": "PENSACOLA BAY", "headline": "...", "dateline": "Sat–Sun Oct 10–11",
   "what": "...", "why": "...", "todo": "...", "source": "Sail Florida"}
Text shrinks until it fits the content box. Templates live in templates/, output goes to out/.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "/System/Library/Fonts/Avenir Next.ttc"
BOLD, DEMI, MEDIUM, REGULAR = 0, 2, 5, 7
TEAL, ORANGE, WHITE, MUTED = (79, 179, 196), (242, 140, 56), (238, 242, 245), (170, 184, 194)
BOX = (56, 376, 1196, 1072)  # inside edge of the template's rounded content box
PAD = 46


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
    if line:
        lines.append(line)
    return lines


def layout(draw, card, scale, width):
    """Returns a list of (kind, payload) draw ops and the total height."""
    s = lambda n: max(12, round(n * scale))
    blocks = []
    if card.get("tag"):
        blocks.append(("text", card["tag"].upper(), font(DEMI, s(26)), ORANGE, s(14)))
    blocks.append(("text", card["headline"], font(BOLD, s(52)), WHITE, s(10)))
    if card.get("dateline"):
        blocks.append(("text", card["dateline"], font(DEMI, s(32)), TEAL, s(26)))
    if card.get("what"):
        blocks.append(("text", card["what"], font(MEDIUM, s(29)), WHITE, s(22)))
    for label, key in (("Why it matters", "why"), ("What to do", "todo")):
        if card.get(key):
            blocks.append(("label", label, font(BOLD, s(27)), ORANGE, s(4)))
            blocks.append(("text", card[key], font(MEDIUM, s(29)), WHITE, s(20)))
    if card.get("source"):
        blocks.append(("text", "Source: " + card["source"], font(REGULAR, s(22)), MUTED, 0))

    ops, y = [], 0
    for kind, text, f, color, gap in blocks:
        lh = round(f.size * 1.25)
        for line in wrap(draw, text, f, width):
            ops.append((y, line, f, color))
            y += lh
        y += gap
    return ops, y


def render(card):
    im = Image.open(os.path.join(HERE, "templates", card["template"] + ".webp")).convert("RGB")
    draw = ImageDraw.Draw(im)
    x0, y0, x1, y1 = BOX
    width, height = x1 - x0 - 2 * PAD, y1 - y0 - 2 * PAD
    scale = 1.0
    while True:
        ops, total = layout(draw, card, scale, width)
        if total <= height or scale < 0.55:
            break
        scale -= 0.04
    if total > height:
        raise SystemExit(f"{card['out']}: text too long to fit even at small size - shorten it")
    top = y0 + PAD + (height - total) // 2 if total < height * 0.8 else y0 + PAD
    for y, line, f, color in ops:
        draw.text((x0 + PAD, top + y), line, font=f, fill=color)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    path = os.path.join(HERE, "out", card["out"])
    im.save(path)
    return path, scale


if __name__ == "__main__":
    for card in json.load(open(sys.argv[1])):
        path, scale = render(card)
        print(f"{path}  (text scale {scale:.2f})")
