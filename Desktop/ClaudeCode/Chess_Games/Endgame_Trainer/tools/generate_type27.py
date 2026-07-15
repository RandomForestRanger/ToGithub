#!/usr/bin/env python3
"""Opdrag 8b: candidate generator + selector for Type 27 (opposite-coloured
bishops, hold), the game's first real defence badge.

White: K+B. Black: K+B (opposite colour complex to white's) + one pawn.
Construction is NOT hand-derived square-colour geometry -- it's generated
broadly (pawn file/rank swept, white king/bishop swept near the pawn's
blockade square, black king/bishop swept, bishops constrained to opposite
colour complexes) and the tablebase is the arbiter of which configurations
actually hold as a fortress (category == 'draw'); anything the tablebase
calls a loss for white is discarded, not hand-debugged.

Bronze/gold split: white king's distance to the pawn's immediate stop square
at the START position. Bronze = king already on/adjacent to it (survive by
not wandering). Gold = king starts 2-3 squares away (must reach the blockade
under pressure).

Selection tiebreak (the confirmed novel wrinkle): among tablebase-draw
candidates, count how many of white's legal moves ALSO hold the draw
(reusing verify_positions.classify_move_for_white, which already returns an
absolute-white win/draw/loss classification per move via tablebase lookup of
the resulting position -- this script just tallies 'draw' instead of C5's
'win'). Prefer candidates with <=3 drawing moves, so the puzzle can't be
solved by any plausible shuffle -- only the real blockade holds.
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

OUT_DIR = Path('/tmp/et_type27')
NEED = {'bronze': 3, 'silver': 2, 'gold': 2}

PAWN_SQUARES = ['b5', 'c5', 'd5', 'e4', 'f4', 'g5']
# White king offsets from the pawn's immediate front (stop) square.
WK_CLOSE_OFFSETS = [(0, 0), (1, 0), (-1, 0), (0, 1), (1, 1), (-1, 1)]     # bronze: on/adjacent
WK_FAR_OFFSETS = [(2, 0), (-2, 0), (0, 2), (2, 1), (-2, -1), (3, 0)]       # gold: must travel
WB_OFFSETS = [(-2, -2), (2, -2), (-2, 2), (2, 2), (3, -1), (-3, 1), (1, 3), (-1, -3)]
BK_OFFSETS = [(0, -2), (0, 2), (2, 0), (-2, 0), (1, -3), (-1, 3), (3, 3), (-3, -3)]
BB_OFFSETS = [(-3, -1), (3, 1), (-3, 3), (3, -3), (4, 0), (-4, 0), (1, -4), (-1, 4)]


def sq(f: int, r: int) -> int | None:
    return chess.square(f, r) if 0 <= f <= 7 and 0 <= r <= 7 else None


def square_color(s: int) -> int:
    return (chess.square_file(s) + chess.square_rank(s)) % 2


def local_ok(board: chess.Board) -> bool:
    if not board.is_valid():
        return False
    wk, bk = board.king(chess.WHITE), board.king(chess.BLACK)
    if chess.square_distance(wk, bk) < 2:
        return False
    if board.is_stalemate() or board.is_checkmate():
        return False
    return True  # hold-mode: stalemate reachability is NOT a defect, don't filter it


def candidates():
    for pawn_name in PAWN_SQUARES:
        pawn_sq = chess.parse_square(pawn_name)
        pf, pr = chess.square_file(pawn_sq), chess.square_rank(pawn_sq)
        front_sq = sq(pf, pr - 1)  # black pawn advances toward rank 1
        if front_sq is None:
            continue
        ff, fr = chess.square_file(front_sq), chess.square_rank(front_sq)
        for label, offsets in (('close', WK_CLOSE_OFFSETS), ('far', WK_FAR_OFFSETS)):
            for dwf, dwr in offsets:
                wk_sq = sq(ff + dwf, fr + dwr)
                if wk_sq is None or wk_sq == pawn_sq:
                    continue
                for dbf, dbr in WB_OFFSETS:
                    wb_sq = sq(ff + dbf, fr + dbr)
                    if wb_sq is None or wb_sq in (pawn_sq, wk_sq):
                        continue
                    wb_color = square_color(wb_sq)
                    for dkf, dkr in BK_OFFSETS:
                        bk_sq = sq(pf + dkf, pr + dkr)
                        if bk_sq is None or bk_sq in (pawn_sq, wk_sq, wb_sq):
                            continue
                        for dbbf, dbbr in BB_OFFSETS:
                            bb_sq = sq(pf + dbbf, pr + dbbr)
                            if bb_sq is None or bb_sq in (pawn_sq, wk_sq, wb_sq, bk_sq):
                                continue
                            if square_color(bb_sq) == wb_color:
                                continue  # must be OPPOSITE colour, that's the theme
                            board = chess.Board(None)
                            board.set_piece_at(pawn_sq, chess.Piece(chess.PAWN, chess.BLACK))
                            board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                            board.set_piece_at(wb_sq, chess.Piece(chess.BISHOP, chess.WHITE))
                            board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                            board.set_piece_at(bb_sq, chess.Piece(chess.BISHOP, chess.BLACK))
                            board.turn = chess.WHITE
                            yield label, board


SAMPLE_CAP_PER_LABEL = 100


def main():
    random.seed(27)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tb = vp.TablebaseClient(vp.TB_CACHE_PATH, enabled=True)

    seen: set[str] = set()
    local_pass_by_label: dict[str, list[str]] = {'close': [], 'far': []}
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
            if entry is None or entry.get('category') != 'draw':
                continue
            results.append({'label': label, 'fen': fen, 'source': entry['source']})
    finally:
        tb.save()

    print(f"Tablebase queries: {queried}; draw-candidates: {len(results)}", file=sys.stderr)
    (OUT_DIR / 'candidates.json').write_text(json.dumps(results, indent=1))

    # The reversed-C5 pass below queries the tablebase once per LEGAL MOVE
    # per candidate (~8-10 extra queries each) -- running it over all ~200
    # draw-candidates would blow well past this type's time budget (killed a
    # first attempt at ~30min projected). Cap to a stratified sample instead;
    # 50 candidates is still plenty to find NEED[]-worth of tight (<=3
    # drawing moves) positions per label.
    REVERSED_C5_SAMPLE_PER_LABEL = 25
    by_label: dict[str, list[dict]] = {'close': [], 'far': []}
    for c in results:
        by_label[c['label']].append(c)
    reversed_c5_pool = []
    for label, items in by_label.items():
        reversed_c5_pool.extend(
            items if len(items) <= REVERSED_C5_SAMPLE_PER_LABEL
            else random.sample(items, REVERSED_C5_SAMPLE_PER_LABEL)
        )
    print(f"Reversed-C5 pass on {len(reversed_c5_pool)} of {len(results)} draw-candidates", file=sys.stderr)

    # Reversed-C5: count white's legal moves that ALSO keep the result 'draw'.
    for c in reversed_c5_pool:
        board = chess.Board(c['fen'])
        drawing = 0
        losing_sans = []
        for move in board.legal_moves:
            san = board.san(move)
            res = vp.classify_move_for_white(board, move, tb)
            if res == 'draw':
                drawing += 1
            elif res == 'loss':
                losing_sans.append(san)
        c['drawing_move_count'] = drawing
        c['n_legal'] = len(list(board.legal_moves))
        c['sample_losing_san'] = losing_sans[0] if losing_sans else None
    tb.save()

    (OUT_DIR / 'candidates.json').write_text(json.dumps(results, indent=1))

    stockfish_path = vp.find_stockfish()
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    selected = {'bronze': [], 'silver': [], 'gold': []}
    try:
        tight = [c for c in reversed_c5_pool if c['drawing_move_count'] is not None and c['drawing_move_count'] <= 3
                 and c['sample_losing_san'] is not None]
        pools = {
            'bronze': sorted([c for c in tight if c['label'] == 'close'], key=lambda c: c['drawing_move_count']),
            'gold': sorted([c for c in tight if c['label'] == 'far'], key=lambda c: c['drawing_move_count']),
            'silver': sorted(tight, key=lambda c: c['drawing_move_count']),
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
                info = engine.analyse(board, chess.engine.Limit(depth=16))
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
        print(f"{c['tier']:7s} label={c['label']:5s} draws={c['drawing_move_count']}/{c['n_legal']} "
              f"lose_eg={c['sample_losing_san']:6s} pv_head={c['pv_head']:6s} fen={c['fen']}")
    for tier in NEED:
        if len(selected[tier]) < NEED[tier]:
            print(f"SHORTFALL: {tier} has {len(selected[tier])}/{NEED[tier]}", file=sys.stderr)


if __name__ == '__main__':
    main()
