#!/usr/bin/env python3
"""Opdrag 8b: candidate generator + selector for Type 26 (K+B+P vs K+B, same colour), promote.

Same shape as generate_type25.py, bishops instead of knights, PLUS the one
extra constraint that makes this endgame type what it is: both bishops must
sit on same-coloured squares (opposite-coloured bishops is a famous DRAW
generator and is explicitly Type 27's material instead -- never sample it
here). White's bishop square is swept too (not fixed), since unlike a knight
a bishop's square fixes its colour and therefore constrains where its own
king/pawn support can usefully go.
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

OUT_DIR = Path('/tmp/et_type26')
NEED = {'bronze': 3, 'silver': 2, 'gold': 2}
TIER_MOVE_LIMIT = {'bronze': 12, 'silver': 24, 'gold': 36}
TIER_BUDGET_FRAC = {'bronze': 0.60, 'silver': 0.75, 'gold': 0.85}

PAWN_SQUARES = ['d5', 'd6', 'e5', 'e6']
WK_SQUARES = {
    'd5': ['c4', 'd4', 'e4', 'c5', 'e5', 'c6'],
    'd6': ['c5', 'd5', 'e5', 'c6', 'e6', 'c7'],
    'e5': ['d4', 'e4', 'f4', 'd5', 'f5', 'd6'],
    'e6': ['d5', 'e5', 'f5', 'd6', 'f6', 'd7'],
}
WB_SQUARES = {  # candidate white-bishop squares (both colours represented)
    'd5': ['b3', 'c4', 'e4', 'f3', 'a2', 'g2', 'b7', 'f7'],
    'd6': ['b4', 'c5', 'e5', 'f4', 'a3', 'g3', 'b8', 'f8'],
    'e5': ['c3', 'd4', 'f4', 'g3', 'b2', 'h2', 'c7', 'g7'],
    'e6': ['c4', 'd5', 'f5', 'g4', 'b3', 'h3', 'c8', 'g8'],
}
BK_SQUARES = ['e8', 'f8', 'd8', 'c8', 'g8', 'e7', 'f7', 'a8', 'h8', 'a5', 'h5']
BB_NEAR = ['c6', 'e6', 'f6', 'c7', 'g6', 'b6', 'g7', 'f7', 'd8', 'h6']
BB_FAR = ['a8', 'h8', 'a1', 'h1', 'b8', 'h4', 'a4', 'g1']


def square_color(sq: int) -> int:
    return (chess.square_file(sq) + chess.square_rank(sq)) % 2


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
            return False
    return True


def candidates():
    for pawn_sq_name in PAWN_SQUARES:
        pawn_sq = chess.parse_square(pawn_sq_name)
        for wk_name in WK_SQUARES[pawn_sq_name]:
            wk_sq = chess.parse_square(wk_name)
            if wk_sq == pawn_sq:
                continue
            for wb_name in WB_SQUARES[pawn_sq_name]:
                wb_sq = chess.parse_square(wb_name)
                if wb_sq in (pawn_sq, wk_sq):
                    continue
                wb_color = square_color(wb_sq)
                for bk_name in BK_SQUARES:
                    bk_sq = chess.parse_square(bk_name)
                    if bk_sq in (pawn_sq, wk_sq, wb_sq):
                        continue
                    for label, bb_set in (('far', BB_FAR), ('near', BB_NEAR)):
                        for bb_name in bb_set:
                            bb_sq = chess.parse_square(bb_name)
                            if bb_sq in (pawn_sq, wk_sq, wb_sq, bk_sq):
                                continue
                            if square_color(bb_sq) != wb_color:
                                continue  # same-colour-bishops is the whole point
                            board = chess.Board(None)
                            board.set_piece_at(pawn_sq, chess.Piece(chess.PAWN, chess.WHITE))
                            board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                            board.set_piece_at(wb_sq, chess.Piece(chess.BISHOP, chess.WHITE))
                            board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                            board.set_piece_at(bb_sq, chess.Piece(chess.BISHOP, chess.BLACK))
                            board.turn = chess.WHITE
                            yield label, board


SAMPLE_CAP_PER_LABEL = 90


def main():
    random.seed(26)
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
        pools = {
            'bronze': sorted([c for c in results if c['label'] == 'far'
                               and c['dtm_white_moves'] <= TIER_BUDGET_FRAC['bronze'] * TIER_MOVE_LIMIT['bronze']],
                              key=lambda c: c['dtm_white_moves']),
            'gold': sorted([c for c in results if c['label'] == 'near'
                             and c['dtm_white_moves'] <= TIER_BUDGET_FRAC['gold'] * TIER_MOVE_LIMIT['gold']],
                            key=lambda c: -c['dtm_white_moves']),
            'silver': sorted([c for c in results
                               if c['dtm_white_moves'] <= TIER_BUDGET_FRAC['silver'] * TIER_MOVE_LIMIT['silver']],
                              key=lambda c: c['dtm_white_moves']),
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
