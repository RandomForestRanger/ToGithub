"""Extract the FAK Krieketterme dictionary (English -> Afrikaans) from the PDF.

    python3 extract_krieketterme.py

Writes krieketterme.csv (one row per Afrikaans sense) and krieketterme.json
(a dict keyed by English headword). Needs pdfplumber.

How it works: the dictionary pages use a fixed four-column grid. Within a
column, English headwords are set in Gotham-Bold and Afrikaans translations in
Gotham-Book (usage notes in Gotham-BookItalic), so font weight alone tells the
two languages apart. Photo captions (Gotham-Light/Medium) and letter banners
(Gotham-Black) are skipped. Entries are read page -> column -> top to bottom,
so a headword or translation that wraps into the next column is joined up.
"""
import csv
import json
import re
from pathlib import Path

import pdfplumber

HERE = Path(__file__).parent
PDF = HERE / "Krieketterme-E-publikasie-finaal.pdf"
FIRST_PAGE, LAST_PAGE = 4, 47
COLS = [43, 174, 305, 436]
FONTS = {"Gotham-Bold": "B", "Gotham-BoldItalic": "BI", "Gotham-Book": "R", "Gotham-BookItalic": "I"}

# The hidden text layer differs from the printed page here (broken "fi" ligature, I for l).
TEXT_FIXES = {
    "affliate i": "affiliate",
    "affliated i club": "affiliated club",
    "“VerIore bal” roep": "“Verlore bal” roep",
    "“FoutbaI” roep": "“Foutbal” roep",
}
# Typos in the printed document itself.
SOURCE_FIXES = {"by an inning sand ... runs": "by an innings and ... runs"}

# Afrikaans words broken across lines at a hyphen. The hyphen is kept (bo-arm, top-orde,
# bal-vir-bal, ...) unless the pair is listed here: these are typesetting breaks inside a
# word, or compounds the dictionary writes solid elsewhere (wegkantdryfhou, relegasiewedstryd)
# or solid in the rest of its own series (eerstepaaltjievennootskap, ...).
SOLID_BREAKS = {
    ("vennoot", "skap"), ("vyfde", "paaltjievennootskap"), ("vierde", "paaltjievennootskap"),
    ("negendepaaltjie", "vennoot"), ("sewendepaaltjie", "vennoot"), ("wegkant", "dryfhou"),
    ("relegasie", "wedstryd"), ("draaiboul", "ers"), ("paaltjiewagtershand", "skoene"),
}


def read_lines():
    """Yield typed lines ("E" English / "A" Afrikaans) in reading order."""
    with pdfplumber.open(PDF) as pdf:
        for pno in range(FIRST_PAGE, LAST_PAGE + 1):
            cols = {}
            for w in pdf.pages[pno - 1].extract_words(extra_attrs=["fontname", "size"]):
                font = w["fontname"].split("+")[-1]
                if font not in FONTS or abs(w["size"] - 10) > 0.6:
                    continue
                w["f"] = FONTS[font]
                col = max(i for i, x in enumerate(COLS) if w["x0"] >= x - 3 or i == 0)
                cols.setdefault(col, []).append(w)
            for col in sorted(cols):
                groups = []
                for w in sorted(cols[col], key=lambda w: (round(w["top"]), w["x0"])):
                    if groups and abs(groups[-1][0]["top"] - w["top"]) < 2:
                        groups[-1].append(w)
                    else:
                        groups.append([w])
                for g in groups:
                    g.sort(key=lambda w: w["x0"])
                    text = " ".join(w["text"] for w in g)
                    if text == "KRIEKETTERME" and g[0]["top"] > 800:  # running footer
                        continue
                    bold = sum(len(w["text"]) for w in g if w["f"] in ("B", "BI"))
                    yield {"page": pno, "col": col, "top": g[0]["top"], "text": text,
                           "kind": "E" if bold * 2 > len(text.replace(" ", "")) else "A"}


def read_entries():
    entries, cur, prev = [], None, None
    for line in read_lines():
        text = TEXT_FIXES.get(line["text"], line["text"])
        fixed = text in SOURCE_FIXES
        text = SOURCE_FIXES.get(text, text)
        same_col = prev is not None and (prev["page"], prev["col"]) == (line["page"], line["col"])
        if line["kind"] == "E":
            # A headword that wraps continues the current entry until its translation starts.
            wraps = cur is not None and not cur["af"] and (not same_col or line["top"] - prev["top"] < 15)
            if not wraps:
                cur = {"en": [], "af": [], "page": line["page"], "flags": []}
                entries.append(cur)
            cur["en"].append(text)
        else:
            cur["af"].append(text)
        if fixed:
            cur["flags"].append("source typo corrected")
        prev = line
    return entries


WORD = r"[\wëêôûï]+"


def join(parts):
    out = ""
    for p in parts:
        if out.endswith("-") and re.match(r"[a-zëêôûï]", p):
            left = re.search(WORD + r"-$", out)
            right = re.match(WORD, p).group()
            if left and (left.group()[:-1], right) in SOLID_BREAKS:
                out = out[:-1] + p
            else:
                out += p  # a real hyphen that happened to fall at the line end
        else:
            out = f"{out} {p}" if out else p
    out = re.sub(r"vennoot ?-skap", "vennootskap", out)  # hyphenation frozen into the source text
    out = re.sub(r"\s*-\(", " (", out)
    out = re.sub(r"\(\s+", "(", out)
    out = re.sub(r"\s+\)", ")", out)
    out = re.sub(r"\s+([,;:])", r"\1", out)
    return re.sub(r"\s+", " ", out).strip()


def split_top_level(s, sep=","):
    parts, depth, buf = [], 0, ""
    for ch in s:
        depth += (ch == "(") - (ch == ")")
        if ch == sep and depth == 0:
            parts.append(buf.strip())
            buf = ""
        else:
            buf += ch
    return [p for p in parts + [buf.strip()] if p]


POS = r"(?:n|v|adv|adj)\."


def build_rows(entries):
    rows = []
    for e in entries:
        en = join(e["en"]).rstrip(" :")
        af = join(e["af"])
        flags = list(dict.fromkeys(e["flags"])) + ([] if af else ["no translation"])
        pos = ""
        m = re.search(rf"\s({POS}(?:\s*&\s*{POS})?)(?=\s|$)", en)
        if m:
            pos = re.sub(r"\s+", " ", m.group(1))
            en = (en[:m.start()] + en[m.end():]).strip()
        alternatives = [a.strip() for a in re.findall(r"\(([^()]*)\)", en)]
        head = re.sub(r"\s*\([^()]*\)", "", en).strip()
        homograph = ""
        m = re.match(r"^(.*\S)\s+(\d)$", head)
        if m:
            head, homograph = m.groups()
        senses = [s.strip() for s in re.split(r"(?:^|\s)\d\.\s", af) if s.strip()] if re.match(r"^1\.\s", af) else [af]
        for i, sense in enumerate(senses, 1):
            notes = re.findall(r"\s\(([^()]*)\)", sense)  # "uitgee (kolwer)" -> note "kolwer"
            terms = split_top_level(re.sub(r"\s\([^()]*\)", "", sense))  # keeps "gang(etjie)"
            rows.append({
                "english": head,
                "pos": pos,
                "homograph": homograph,
                "english_alternatives": "; ".join(alternatives),
                "sense": str(i) if len(senses) > 1 else "",
                "afrikaans": sense,
                "afrikaans_terms": "; ".join(terms),
                "afrikaans_notes": "; ".join(n.strip() for n in notes),
                "page": e["page"],
                "flags": "; ".join(flags),
            })
    return rows


def main():
    entries = read_entries()
    rows = build_rows(entries)
    with open(HERE / "krieketterme.csv", "w", newline="", encoding="utf-8-sig") as f:  # BOM so Excel reads ë/ê
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    lookup = {}
    for r in rows:
        key = " ".join(x for x in (r["english"], r["pos"], r["homograph"]) if x)
        lookup.setdefault(key, []).append(r["afrikaans"])
    with open(HERE / "krieketterme.json", "w", encoding="utf-8") as f:
        json.dump(lookup, f, ensure_ascii=False, indent=1)
    print(f"{len(entries)} entries, {len(rows)} rows, {len(lookup)} dict keys")


if __name__ == "__main__":
    main()
