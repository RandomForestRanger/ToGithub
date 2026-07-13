#!/usr/bin/env python3
"""check_bronze.py — verifies each bronze FEN has a forced mate in ≤12 moves.
Usage: python3 check_bronze.py
Requires: stockfish in PATH, python-chess (pip3 install chess)
"""

import re
import sys
import chess
import chess.engine
from pathlib import Path

POSITIONS_JS = Path(__file__).parent / "positions.js"
MATE_LIMIT   = 12   # full moves (white + black = 1 full move)
SEARCH_TIME  = 15   # seconds per position
WIN_CP       = 200  # centipawns threshold for "clearly winning" (Types 6-20)

# Types 1-5: pure material — must have forced mate ≤ MATE_LIMIT
# Types 6-20: thematic — check for strong winning advantage, mate optional
MATERIAL_TYPES = {1, 2, 3, 4, 5}

TYPE_NAMES = {
    1:  "K+Q vs K",
    2:  "K+R vs K",
    3:  "K+BB vs K",
    4:  "K+BN vs K",
    5:  "K+NN vs K",
    6:  "K+P vs K",
    7:  "Verbygeraakte Pion Wedren",
    8:  "Opposisie & Koningaktiwiteit",
    9:  "Zugzwang",
    10: "Driehoeksbeweging",
    11: "Piondeurbraak",
    12: "Buitenste Verbygeraakte Pion",
    13: "Lucena-posisie",
    14: "Philidor-posisie",
    15: "Toring Agter Verbygeraakte Pion",
    16: "Aktiewe vs Passiewe Toring",
    17: "Goeie Loper vs Slegte Loper",
    18: "Loper teen Ruiter",
    19: "Verkeerde Kleur Loper",
    20: "Koningin teen Pion op 7de Ry",
}


def parse_positions(path):
    src = path.read_text()
    positions = {}
    type_block_re = re.compile(r'^\s{2}(\d+):\s*\{(.*?)\n  \}', re.MULTILINE | re.DOTALL)
    for m in type_block_re.finditer(src):
        type_id = int(m.group(1))
        block = m.group(2)
        positions[type_id] = {}
        tier_re = re.compile(r'(bronze|silver|gold)\s*:\s*\[(.*?)\]', re.DOTALL)
        for tm in tier_re.finditer(block):
            tier = tm.group(1)
            fen_re = re.compile(r'''fen\s*:\s*['"]([^'"]+)['"]''')
            positions[type_id][tier] = fen_re.findall(tm.group(2))
    return positions


def check_fen_material(engine, fen):
    """Types 1-5: check for forced mate within MATE_LIMIT full moves.
    Returns (status, value) where status is 'ok', 'over', or 'none'.
    """
    board = chess.Board(fen)
    try:
        # Search broadly (mate=MATE_LIMIT*2 to handle ply vs move ambiguity)
        info = engine.analyse(
            board,
            chess.engine.Limit(mate=MATE_LIMIT * 2, time=SEARCH_TIME),
        )
        score = info.get("score")
        if score is None:
            return "none", None
        w = score.white()
        if w.is_mate():
            m = w.mate()
            if m is not None and m > 0:
                return ("ok" if m <= MATE_LIMIT else "over"), m
        return "none", None
    except Exception:
        return "none", None


def check_fen_thematic(engine, fen):
    """Types 6-20: check for strong winning advantage.
    Returns (status, value) where status is 'win', 'draw', or 'loss'.
    """
    board = chess.Board(fen)
    try:
        info = engine.analyse(
            board,
            chess.engine.Limit(depth=22, time=SEARCH_TIME),
        )
        score = info.get("score")
        if score is None:
            return "unknown", None
        w = score.white()
        if w.is_mate():
            m = w.mate()
            if m is not None and m > 0:
                return "win", f"mate in {m}"
            else:
                return "loss", f"mated in {abs(m) if m else '?'}"
        cp = w.score()
        if cp is None:
            return "unknown", None
        if cp >= WIN_CP:
            return "win", f"+{cp}cp"
        elif cp <= -WIN_CP:
            return "loss", f"{cp}cp"
        else:
            return "draw", f"{cp:+}cp"
    except Exception:
        return "unknown", None


def main():
    positions = parse_positions(POSITIONS_JS)
    if not positions:
        print("ERROR: Could not parse positions.js", file=sys.stderr)
        sys.exit(1)

    engine = chess.engine.SimpleEngine.popen_uci("stockfish")

    results = []
    print(f"\nChecking bronze positions for forced mate in ≤{MATE_LIMIT} moves...\n")
    print("─" * 72)

    for type_id in sorted(positions.keys()):
        name = TYPE_NAMES.get(type_id, f"Type {type_id}")
        bronze = positions[type_id].get("bronze", [])
        if not bronze:
            print(f"Type {type_id:2}: no bronze positions\n")
            continue

        print(f"Type {type_id:2} — {name}")
        for i, fen in enumerate(bronze):
            print(f"  B{i+1}: {fen:<48} → ", end="", flush=True)
            if type_id in MATERIAL_TYPES:
                status, val = check_fen_material(engine, fen)
                if status == "ok":
                    print(f"✅ mate in {val}")
                elif status == "over":
                    print(f"⚠️  mate in {val}  ← OVER LIMIT")
                else:
                    print("❌  no forced mate found")
            else:
                status, val = check_fen_thematic(engine, fen)
                if status == "win":
                    print(f"✅ winning ({val})")
                elif status == "draw":
                    print(f"⚠️  not clearly winning ({val})")
                elif status == "loss":
                    print(f"❌  losing ({val})")
                else:
                    print("❓  unknown")
            results.append(dict(type_id=type_id, name=name, idx=i+1, fen=fen,
                                status=status, val=val))
        print()

    engine.quit()

    # ── Summary ──────────────────────────────────────────────────────────────
    print("═" * 72)
    print("SUMMARY\n")
    ok_l      = [r for r in results if r["status"] in ("ok", "win")]
    warn_l    = [r for r in results if r["status"] in ("over", "draw")]
    bad_l     = [r for r in results if r["status"] in ("none", "loss")]
    unknown_l = [r for r in results if r["status"] == "unknown"]

    print(f"✅  Pass (mate/winning):    {len(ok_l)}")
    print(f"⚠️   Warning (marginal):    {len(warn_l)}")
    print(f"❌  Fail (no mate/losing):  {len(bad_l)}")
    print(f"❓  Unknown:                {len(unknown_l)}")
    print(f"    Total checked:          {len(results)}")

    problems = warn_l + bad_l + unknown_l
    if problems:
        print("\nPositions to review:")
        for r in problems:
            print(f"  Type {r['type_id']:2} B{r['idx']} [{r['status']}: {r['val']}]")
            print(f"         {r['fen']}")
    else:
        print("\nAll bronze positions pass! 🎉")


if __name__ == "__main__":
    main()
