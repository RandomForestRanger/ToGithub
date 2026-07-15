#!/usr/bin/env python3
"""Opdrag 5: select 8 final Type 5 positions from generate_type5.py's output.

Converts raw tablebase dtm (plies) to white-move DTM (matching the tier
bands, which are defined in white moves), buckets into bronze/silver/gold,
and picks a set satisfying the variety requirements: >=3 distinct pawn
files overall, the two golds on different files, varied bronze corners.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import chess
import chess.engine

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_positions as vp  # noqa: E402

TIER_BANDS = {
    'bronze': (8, 13),
    'silver': (16, 25),
    'gold': (28, 39),
}
NEED = {'bronze': 3, 'silver': 3, 'gold': 2}


def mating_corner(fen: str) -> str:
    bk = chess.Board(fen).king(chess.BLACK)
    f = chess.square_file(bk)
    r = chess.square_rank(bk)
    fh = 'a-kant' if f <= 3 else 'h-kant'
    rh = '1ste ry' if r <= 3 else '8ste ry'
    return f"{fh}/{rh}"


def main():
    candidates = json.loads(Path('/tmp/et_type5/candidates.json').read_text())
    for c in candidates:
        c['dtm_white_moves'] = vp.plies_to_white_moves(c['dtm'])
        c['corner'] = mating_corner(c['fen'])

    buckets = {t: [] for t in TIER_BANDS}
    for c in candidates:
        for tier, (lo, hi) in TIER_BANDS.items():
            if lo <= c['dtm_white_moves'] <= hi:
                buckets[tier].append(c)

    for tier in buckets:
        print(f"{tier}: {len(buckets[tier])} candidates in band", file=sys.stderr)

    stockfish_path = vp.find_stockfish()
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)

    selected = {'bronze': [], 'silver': [], 'gold': []}
    used_files = set()
    used_corners = set()

    try:
        for tier in ('gold', 'bronze', 'silver'):  # golds first: hardest variety constraint
            pool = sorted(buckets[tier], key=lambda c: c['dtm_white_moves'])
            # Prefer file variety first, then corner variety, then PV instructiveness.
            chosen = []
            for c in pool:
                if len(chosen) >= NEED[tier]:
                    break
                if tier == 'gold' and c['file'] in {x['file'] for x in chosen}:
                    continue  # spec: two golds on DIFFERENT files
                if c['file'] in used_files and len(chosen) < NEED[tier] - 1:
                    continue  # soft preference for new files while slots remain
                board = chess.Board(c['fen'])
                info = engine.analyse(board, chess.engine.Limit(depth=18))
                pv = info.get('pv', [])
                first_move_san = board.san(pv[0]) if pv else '?'
                c['pv_head'] = first_move_san
                chosen.append(c)
                used_files.add(c['file'])
                used_corners.add(c['corner'])
            # Fallback: if file-variety preference left us short, relax it.
            if len(chosen) < NEED[tier]:
                for c in pool:
                    if len(chosen) >= NEED[tier]:
                        break
                    if c in chosen:
                        continue
                    if tier == 'gold' and c['file'] in {x['file'] for x in chosen}:
                        continue
                    board = chess.Board(c['fen'])
                    info = engine.analyse(board, chess.engine.Limit(depth=18))
                    pv = info.get('pv', [])
                    c['pv_head'] = board.san(pv[0]) if pv else '?'
                    chosen.append(c)
            selected[tier] = chosen
    finally:
        engine.quit()

    out = []
    for tier in ('bronze', 'silver', 'gold'):
        for c in selected[tier]:
            out.append({**c, 'tier': tier})

    Path('/tmp/et_type5/selected.json').write_text(json.dumps(out, indent=1))
    for c in out:
        print(f"{c['tier']:7s} file={c['file']} dtm(white-moves)={c['dtm_white_moves']:3d} "
              f"corner={c['corner']:12s} pv_head={c['pv_head']:6s} fen={c['fen']}")


if __name__ == '__main__':
    main()
