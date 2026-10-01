#!/usr/bin/env python3
"""Convert one of our Markdown notes into a Word (.docx) file.

Usage:  python3 scripts/md2docx.py path/to/file.md [output.docx]

Handles what our notes use: # headings, **bold**, *italic*, `code`, links,
numbered and bulleted lists, | tables |, and --- dividers (skipped).
Needs:  pip3 install markdown python-docx   (installed 2026-10-01)

Pandoc would do this too, but Homebrew stopped shipping ready-made builds for
Intel Macs in Sept 2026 and wants to compile it (and the Haskell compiler) from
source — see TODO.md.
"""
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_COLOR_INDEX  # noqa: F401  (kept for future styling)
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

INLINE = re.compile(r'(\*\*.+?\*\*|`[^`]+`|\*[^*]+\*|https?://[^\s)]+)')


def add_hyperlink(paragraph, url):
    part = paragraph.part
    r_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), r_id)
    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    color = OxmlElement("w:color"); color.set(qn("w:val"), "0563C1"); props.append(color)
    underline = OxmlElement("w:u"); underline.set(qn("w:val"), "single"); props.append(underline)
    run.append(props)
    text = OxmlElement("w:t"); text.text = url; run.append(text)
    link.append(run)
    paragraph._p.append(link)


def add_inline(paragraph, text):
    """Add text to a paragraph, honouring **bold**, *italic*, `code` and bare URLs."""
    for piece in INLINE.split(text):
        if not piece:
            continue
        if piece.startswith("**") and piece.endswith("**"):
            add_inline_run(paragraph, piece[2:-2], bold=True)
        elif piece.startswith("`") and piece.endswith("`"):
            run = paragraph.add_run(piece[1:-1]); run.font.name = "Courier New"
        elif piece.startswith("*") and piece.endswith("*") and len(piece) > 2:
            paragraph.add_run(piece[1:-1]).italic = True
        elif piece.startswith("http"):
            add_hyperlink(paragraph, piece)
        else:
            paragraph.add_run(piece)


def add_inline_run(paragraph, text, bold=False):
    # bold text can itself contain a link; keep it simple and bold the plain parts
    for piece in re.split(r'(https?://[^\s)]+)', text):
        if not piece:
            continue
        if piece.startswith("http"):
            add_hyperlink(paragraph, piece)
        else:
            paragraph.add_run(piece).bold = bold


def restart_numbering(doc, paragraph):
    """Start a new numbered list at 1 for this 'List Number' paragraph.
    Each list gets its own copy of the numbering definition (not just a "restart"
    override, which macOS Quick Look and some other viewers ignore)."""
    import copy
    numbering = doc.part.numbering_part.numbering_definitions._numbering
    style_numpr = doc.styles["List Number"].element.pPr.numPr
    abstract_id = numbering.num_having_numId(style_numpr.numId.val).abstractNumId.val
    abstracts = numbering.findall(qn("w:abstractNum"))
    source = next(a for a in abstracts if a.get(qn("w:abstractNumId")) == str(abstract_id))
    new_abstract = copy.deepcopy(source)
    new_id = max(int(a.get(qn("w:abstractNumId"))) for a in abstracts) + 1
    new_abstract.set(qn("w:abstractNumId"), str(new_id))
    nsid = new_abstract.find(qn("w:nsid"))
    if nsid is not None:
        nsid.set(qn("w:val"), f"{0x1A2B0000 + new_id:08X}")   # unique list identity
    abstracts[-1].addnext(new_abstract)                          # abstractNums must precede nums
    num = numbering.add_num(new_id)
    numpr = paragraph._p.get_or_add_pPr().get_or_add_numPr()
    numpr.get_or_add_ilvl().val = 0
    numpr.get_or_add_numId().val = num.numId
    return num.numId


def convert(src: Path, dst: Path):
    doc = Document()
    style = doc.styles["Normal"]; style.font.name = "Arial"; style.font.size = Pt(11)
    lines = src.read_text().split("\n")
    i = 0
    current_num = None
    while i < len(lines):
        line = lines[i]
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            table = doc.add_table(rows=len(rows), cols=len(rows[0]))
            table.style = "Table Grid"
            for r, cells in enumerate(rows):
                for c, value in enumerate(cells):
                    para = table.cell(r, c).paragraphs[0]
                    add_inline(para, f"**{value}**" if r == 0 else value)
            continue
        heading = re.match(r"^(#{1,3}) (.*)", line)
        if heading:
            doc.add_heading(heading.group(2).replace("**", ""), level=len(heading.group(1)))
        elif line.strip() == "---":
            pass
        elif re.match(r"^\d+\. ", line):
            para = doc.add_paragraph(style="List Number")
            if line.startswith("1. "):          # first item of a new list: restart at 1
                current_num = restart_numbering(doc, para)
            elif current_num is not None:
                numpr = para._p.get_or_add_pPr().get_or_add_numPr()
                numpr.get_or_add_ilvl().val = 0
                numpr.get_or_add_numId().val = current_num
            add_inline(para, re.sub(r"^\d+\. ", "", line))
        elif line.startswith("- "):
            add_inline(doc.add_paragraph(style="List Bullet"), line[2:])
        elif line.strip():
            add_inline(doc.add_paragraph(), line)
        i += 1
    doc.save(dst)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix(".docx")
    convert(src, dst)
    print(f"Wrote {dst}")
