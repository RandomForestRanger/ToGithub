#!/usr/bin/env python3
"""Opdrag 8b: candidate generator + selector for Type 25 (K+N+P vs K+N), promote.

Curated (not full-offset-sweep) construction: central pawn file (d/e) at an
advanced rank, white knight tried on a handful of plausible shielding squares,
black king and the DEFENDING knight swept across a curated near/far set (the
brons="far"/goud="close" contract from the spec). Kept a smaller combinatorial
space than generate_type22/23/24 on purpose -- this type needs a specific
defensive relationship (knight actually contests the pawn), which a blind
64-square sweep mostly wastes queries on (positions where the "defending"
knight isn't anywhere near the action).
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import chess
import chess.engine

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_positions as vp  # noqa: E402

OUT_DIR = Path('/tmp/et_type25')
NEED = {'bronze': 3, 'silver': 2, 'gold': 2}
TIER_MOVE_LIMIT = {'bronze': 12, 'silver': 24, 'gold': 36}
TIER_BUDGET_FRAC = {'bronze': 0.60, 'silver': 0.75, 'gold': 0.85}

PAWN_SQUARES = ['d5', 'd6', 'e5', 'e6']
WK_SQUARES = {  # per pawn square: a few plausible supporting king squares
    'd5': ['c4', 'd4', 'e4', 'c5', 'e5', 'c6'],
    'd6': ['c5', 'd5', 'e5', 'c6', 'e6', 'c7'],
    'e5': ['d4', 'e4', 'f4', 'd5', 'f5', 'd6'],
    'e6': ['d5', 'e5', 'f5', 'd6', 'f6', 'd7'],
}
WN_SQUARES = {  # shielding knight -- squares covering approach/outpost squares
    'd5': ['b4', 'c3', 'e3', 'f4', 'b6', 'f6', 'c7', 'e7'],
    'd6': ['b5', 'c4', 'e4', 'f5', 'b7', 'f7', 'c8', 'e8'],
    'e5': ['c4', 'd3', 'f3', 'g4', 'c6', 'g6', 'd7', 'f7'],
    'e6': ['c5', 'd4', 'f4', 'g5', 'c7', 'g7', 'd8', 'f8'],
}
# Black king: near the pawn (contests it) vs far corners (bronze-ish)
BK_SQUARES = ['e8', 'f8', 'd8', 'c8', 'g8', 'e7', 'f7', 'a8', 'h8', 'a5', 'h5']
# Defending knight: NEAR set (close, harder -- gold) and FAR set (bronze)
BN_NEAR = ['c6', 'e6', 'f6', 'c7', 'g6', 'b6', 'g7', 'f7']
BN_FAR = ['a8', 'h8', 'a1', 'h1', 'b8', 'h4', 'a4']


def local_ok(board: chess.Board) -> bool:
    if not board.is_valid():
        return False
    wk, bk = board.king(chess.WHITE), board.king(chess.BLACK)
    if chess.square_distance(wk, bk) < 2:
        return False
    if board.is_stalemate() or board.is_checkmate():
        return False
    for m in board.legal_moves:
        board.push(m)
        sm = board.is_stalemate()
        board.pop()
        if sm:
            return False  # 1-ply clean (matches harness C4's OK bar), for speed
    return True


def candidates():
    for pawn_sq_name in PAWN_SQUARES:
        pawn_sq = chess.parse_square(pawn_sq_name)
        for wk_name in WK_SQUARES[pawn_sq_name]:
            wk_sq = chess.parse_square(wk_name)
            if wk_sq == pawn_sq:
                continue
            for wn_name in WN_SQUARES[pawn_sq_name]:
                wn_sq = chess.parse_square(wn_name)
                if wn_sq in (pawn_sq, wk_sq):
                    continue
                for bk_name in BK_SQUARES:
                    bk_sq = chess.parse_square(bk_name)
                    if bk_sq in (pawn_sq, wk_sq, wn_sq):
                        continue
                    for label, bn_set in (('far', BN_FAR), ('near', BN_NEAR)):
                        for bn_name in bn_set:
                            bn_sq = chess.parse_square(bn_name)
                            if bn_sq in (pawn_sq, wk_sq, wn_sq, bk_sq):
                                continue
                            board = chess.Board(None)
                            board.set_piece_at(pawn_sq, chess.Piece(chess.PAWN, chess.WHITE))
                            board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                            board.set_piece_at(wn_sq, chess.Piece(chess.KNIGHT, chess.WHITE))
                            board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                            board.set_piece_at(bn_sq, chess.Piece(chess.KNIGHT, chess.BLACK))
                            board.turn = chess.WHITE
                            yield label, board


SAMPLE_CAP_PER_LABEL = 90  # keeps total tablebase queries in the low hundreds


def main():
    random.seed(25)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tb = vp.TablebaseClient(vp.TB_CACHE_PATH, enabled=True)

    seen: set[str] = set()
    local_pass_by_label: dict[str, list[str]] = {'far': [], 'near': []}
    for label, board in candidates():
        fen = board.fen()
        key = vp.TablebaseClient._key(fen)
        if key in seen:
            continue
        seen.add(key)
        if local_ok(board):
            local_pass_by_label[label].append(fen)

    total_local = sum(len(v) for v in local_pass_by_label.values())
    print(f"Local-filter-passing: {total_local} (of {len(seen)} unique)", file=sys.stderr)

    local_pass: list[tuple[str, str]] = []
    for label, fens in local_pass_by_label.items():
        sample = fens if len(fens) <= SAMPLE_CAP_PER_LABEL else random.sample(fens, SAMPLE_CAP_PER_LABEL)
        local_pass.extend((label, fen) for fen in sample)
    print(f"Sampled for tablebase: {len(local_pass)}", file=sys.stderr)

    results = []
    queried = 0
    try:
        for label, fen in local_pass:
            entry = tb.query(fen)
            queried += 1
            if entry is None or entry.get('category') != 'win':
                continue
            dtm = entry.get('dtm')
            if dtm is None or dtm <= 0:
                continue
            results.append({'label': label, 'fen': fen, 'dtm': dtm,
                             'dtm_white_moves': vp.plies_to_white_moves(dtm),
                             'source': entry['source']})
    finally:
        tb.save()

    print(f"Tablebase queries: {queried}; win-candidates: {len(results)}", file=sys.stderr)
    (OUT_DIR / 'candidates.json').write_text(json.dumps(results, indent=1))

    stockfish_path = vp.find_stockfish()
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    selected = {'bronze': [], 'silver': [], 'gold': []}
    try:
        # bronze: 'far' defender, cheap dtm.  gold: 'near' defender, harder dtm.
        # silver: either, mid dtm.
        pools = {
            'bronze': sorted([c for c in results if c['label'] == 'far'
                               and c['dtm_white_moves'] <= TIER_BUDGET_FRAC['bronze'] * TIER_MOVE_LIMIT['bronze']],
                              key=lambda c: c['dtm_white_moves']),
            'gold': sorted([c for c in results if c['label'] == 'near'
                             and c['dtm_white_moves'] <= TIER_BUDGET_FRAC['gold'] * TIER_MOVE_LIMIT['gold']],
                            key=lambda c: -c['dtm_white_moves']),  # hardest-first
            # Prefer 'near' (genuine defensive resistance) over 'far' (which
            # is really just a slower bronze) so silver reads as a real step
            # up in difficulty, not a coin-flip duplicate of bronze.
            'silver': sorted([c for c in results
                               if c['dtm_white_moves'] <= TIER_BUDGET_FRAC['silver'] * TIER_MOVE_LIMIT['silver']],
                              key=lambda c: (c['label'] != 'near', c['dtm_white_moves'])),
        }
        used_fens: set[str] = set()
        for tier in ('gold', 'bronze', 'silver'):
            chosen = []
            for c in pools[tier]:
                if len(chosen) >= NEED[tier]:
                    break
                if c['fen'] in used_fens:
                    continue
                board = chess.Board(c['fen'])
                info = engine.analyse(board, chess.engine.Limit(depth=18))
                pv = info.get('pv', [])
                c['pv_head'] = board.san(pv[0]) if pv else '?'
                chosen.append(c)
                used_fens.add(c['fen'])
            selected[tier] = chosen
    finally:
        engine.quit()

    out = []
    for tier in ('bronze', 'silver', 'gold'):
        for c in selected[tier]:
            out.append({**c, 'tier': tier})
    (OUT_DIR / 'selected.json').write_text(json.dumps(out, indent=1))
    for c in out:
        print(f"{c['tier']:7s} label={c['label']:4s} dtm(wm)={c['dtm_white_moves']:3d} "
              f"pv_head={c['pv_head']:6s} fen={c['fen']}")
    for tier in NEED:
        if len(selected[tier]) < NEED[tier]:
            print(f"SHORTFALL: {tier} has {len(selected[tier])}/{NEED[tier]}", file=sys.stderr)


if __name__ == '__main__':
    main()
