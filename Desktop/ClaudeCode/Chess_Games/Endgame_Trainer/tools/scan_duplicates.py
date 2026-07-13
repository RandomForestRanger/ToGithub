#!/usr/bin/env python3
"""Standalone dedup tool for positions.js (Opdrag 6 §2/§4).

Two passes, both engine-free:
  1. Exact duplicate scan (piece-placement + side-to-move key) -- the
     Opdrag-1 check, reused here standalone rather than re-implemented.
  2. Translation-aware near-duplicate scan (the Opdrag-1 nice-to-have,
     built now): flags any two ACTIVE positions whose piece placement is
     identical under a uniform file and/or rank shift of every piece (same
     piece types/colours, same relative geometry -- e.g. Type 5's gold-twin
     scare from Opdrag 5's close-out, or T9/T8's historically-noted
     "T9 B1 and T8 B2 are the same position shifted one file").

Reports:
  - ACTIVE x ACTIVE collisions (exact or translated): ERROR-level, must be
    zero for Opdrag 6 to close.
  - RETIRED-vs-ACTIVE shadows: INFO only, per spec (retired positions are
    audit trail, not being served, so a shadow isn't itself a defect -- but
    worth knowing about).

Usage: python3 tools/scan_duplicates.py [--type N]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import chess

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_positions as vp


def piece_map_key(board: chess.Board) -> frozenset:
    return frozenset((sq, p.piece_type, p.color) for sq, p in board.piece_map().items())


def translated(pm: frozenset, df: int, dr: int) -> frozenset | None:
    out = []
    for sq, ptype, color in pm:
        f, r = chess.square_file(sq), chess.square_rank(sq)
        nf, nr = f + df, r + dr
        if not (0 <= nf <= 7 and 0 <= nr <= 7):
            return None
        out.append((chess.square(nf, nr), ptype, color))
    return frozenset(out)


def find_translation(pm_a: frozenset, pm_b: frozenset) -> tuple[int, int] | None:
    """Return (df, dr) such that translating pm_a by it equals pm_b, or None.
    (0, 0) is excluded -- that's an exact duplicate, handled separately."""
    for df in range(-7, 8):
        for dr in range(-7, 8):
            if df == 0 and dr == 0:
                continue
            t = translated(pm_a, df, dr)
            if t is not None and t == pm_b:
                return (df, dr)
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", type=int, default=None)
    args = parser.parse_args()

    raw = vp.extract_raw_data(vp.POSITIONS_JS)
    positions = vp.flatten_positions(raw, args.type)

    boards = []
    for p in positions:
        try:
            board = chess.Board(p.fen)
        except ValueError:
            continue
        boards.append((p, board, piece_map_key(board)))

    exact_dupes = []
    translated_dupes = []
    retired_shadows = []

    seen_exact: dict[str, object] = {}
    for p, board, pm in boards:
        key = vp.TablebaseClient._key(p.fen)
        if key in seen_exact:
            exact_dupes.append((seen_exact[key], p))
        else:
            seen_exact[key] = p

    active = [(p, b, pm) for p, b, pm in boards if not p.retired]
    retired = [(p, b, pm) for p, b, pm in boards if p.retired]

    for i in range(len(active)):
        for j in range(i + 1, len(active)):
            p1, _, pm1 = active[i]
            p2, _, pm2 = active[j]
            if pm1 == pm2:
                continue  # already caught by exact scan
            t = find_translation(pm1, pm2)
            if t is not None:
                translated_dupes.append((p1, p2, t))

    for pa, _, pma in active:
        for pr, _, pmr in retired:
            if pma == pmr:
                retired_shadows.append((pa, pr, (0, 0)))
                continue
            t = find_translation(pma, pmr)
            if t is not None:
                retired_shadows.append((pa, pr, t))

    print(f"Posisies geskandeer: {len(boards)} ({len(active)} aktief, {len(retired)} afgetree)")
    print()
    print(f"=== EKSAKTE DUPLIKATE (aktief+afgetree gesamentlik): {len(exact_dupes)} ===")
    for a, b in exact_dupes:
        print(f"  ERROR: {a.tag} == {b.tag}  ({a.fen})")

    print()
    print(f"=== VERTALING-BEWUSTE NABY-DUPLIKATE, AKTIEF x AKTIEF: {len(translated_dupes)} ===")
    for a, b, (df, dr) in translated_dupes:
        print(f"  ERROR: {a.tag} en {b.tag} is identies onder lêer-skuif {df:+d}, ry-skuif {dr:+d}")
        print(f"         {a.tag}: {a.fen}")
        print(f"         {b.tag}: {b.fen}")

    print()
    print(f"=== AFGETREE-vs-AKTIEF SKADUWEES (INFO, nie 'n fout nie): {len(retired_shadows)} ===")
    for a, r, (df, dr) in retired_shadows:
        shift_desc = "eksak dieselfde" if (df, dr) == (0, 0) else f"lêer-skuif {df:+d}, ry-skuif {dr:+d}"
        print(f"  INFO: {a.tag} (aktief) skadu van {r.tag} (afgetree) — {shift_desc}")

    n_errors = len(exact_dupes) + len(translated_dupes)
    print()
    print(f"Totaal foute (aktief-teenoor-aktief botsings): {n_errors}")
    return 1 if n_errors else 0


if __name__ == "__main__":
    sys.exit(main())
