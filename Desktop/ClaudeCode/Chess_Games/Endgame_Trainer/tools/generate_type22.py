#!/usr/bin/env python3
"""Opdrag 8b: candidate generator + selector for Type 22 (K+Q vs K+R), mate.

Same generate-and-verify shape as generate_type5.py/select_type5.py, collapsed
into one script since this type has no thematic construction constraint (no
pawn/blockade to fix) -- just legal K+Q vs K+R positions, swept broadly and
tablebase-filtered. KQvKR is a forced win from essentially every legal
position (no drawn configurations exist in this material balance), so the
job is producing DTM variety, not filtering out draws.
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

TIER_BANDS = {'bronze': (3, 7), 'silver': (12, 18), 'gold': (20, 30)}
# (dtm=1/2 candidates are near-instant mates -- no "hunt the rook" lesson at
# all, so bronze's floor is raised past them even though they'd fit the
# spec's literal "<=7" wording.)
NEED = {'bronze': 3, 'silver': 2, 'gold': 2}
OUT_DIR = Path('/tmp/et_type22')

BK_SWEEP = [
    'a8', 'h8', 'a1', 'h1',
    'b8', 'g8', 'a7', 'h7', 'b1', 'g1', 'a2', 'h2',
    'd8', 'e8', 'a5', 'a4', 'h5', 'h4', 'd1', 'e1',
    'd5', 'e5', 'd4', 'e4', 'c6', 'f6', 'c3', 'f3',
]
ROOK_OFFSETS = [
    (-1, 0), (1, 0), (0, -1), (0, 1), (-2, 0), (2, 0), (0, -2), (0, 2),
    (-1, -1), (1, 1), (-2, 2), (2, -2), (0, -4), (4, 0), (-3, 1), (1, -3),
]
WK_OFFSETS = [
    (-3, -3), (-2, -2), (2, 2), (3, 3), (-3, 0), (3, 0), (0, -3), (0, 3),
    (-2, 2), (2, -2), (4, 4), (-4, -4),
]
WQ_OFFSETS = [
    (-4, -4), (4, 4), (-4, 4), (4, -4), (5, 0), (-5, 0), (0, 5), (0, -5),
    (2, 4), (-2, -4), (4, -2), (-4, 2),
]
SAMPLE_PER_BUCKET = 12


def sq(f: int, r: int) -> int | None:
    if 0 <= f <= 7 and 0 <= r <= 7:
        return chess.square(f, r)
    return None


def two_ply_stalemate_scan(board: chess.Board) -> bool:
    for wmove in list(board.legal_moves):
        board.push(wmove)
        if board.is_stalemate():
            board.pop()
            return False
        if board.is_checkmate() or not list(board.legal_moves):
            board.pop()
            continue
        for bmove in list(board.legal_moves):
            board.push(bmove)
            white_replies = list(board.legal_moves)
            if white_replies:
                all_sm = True
                for wr in white_replies:
                    board.push(wr)
                    if not board.is_stalemate():
                        all_sm = False
                    board.pop()
                    if not all_sm:
                        break
                if all_sm:
                    board.pop()
                    board.pop()
                    return False
            board.pop()
        board.pop()
    return True


def candidate_boards():
    for bk_name in BK_SWEEP:
        bk_sq = chess.parse_square(bk_name)
        bk_f, bk_r = chess.square_file(bk_sq), chess.square_rank(bk_sq)
        for drf, drr in ROOK_OFFSETS:
            r_sq = sq(bk_f + drf, bk_r + drr)
            if r_sq is None or r_sq == bk_sq:
                continue
            for dwf, dwr in WK_OFFSETS:
                wk_sq = sq(bk_f + dwf, bk_r + dwr)
                if wk_sq is None or wk_sq in (bk_sq, r_sq):
                    continue
                for dqf, dqr in WQ_OFFSETS:
                    wq_sq = sq(bk_f + dqf, bk_r + dqr)
                    if wq_sq is None or wq_sq in (bk_sq, r_sq, wk_sq):
                        continue
                    board = chess.Board(None)
                    board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                    board.set_piece_at(r_sq, chess.Piece(chess.ROOK, chess.BLACK))
                    board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                    board.set_piece_at(wq_sq, chess.Piece(chess.QUEEN, chess.WHITE))
                    board.turn = chess.WHITE
                    yield bk_name, board


def local_filters_pass(board: chess.Board) -> bool:
    if not board.is_valid():
        return False
    wk, bk = board.king(chess.WHITE), board.king(chess.BLACK)
    if chess.square_distance(wk, bk) < 2:
        return False
    if board.is_stalemate() or board.is_checkmate():
        return False
    return two_ply_stalemate_scan(board)


def mating_corner(fen: str) -> str:
    bk = chess.Board(fen).king(chess.BLACK)
    f, r = chess.square_file(bk), chess.square_rank(bk)
    return ('a-kant' if f <= 3 else 'h-kant') + '/' + ('1ste ry' if r <= 3 else '8ste ry')


def main():
    random.seed(22)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tb = vp.TablebaseClient(vp.TB_CACHE_PATH, enabled=True)

    seen: set[str] = set()
    buckets: dict[str, list[str]] = {}
    for bk_name, board in candidate_boards():
        fen = board.fen()
        key = vp.TablebaseClient._key(fen)
        if key in seen:
            continue
        seen.add(key)
        if not local_filters_pass(board):
            continue
        buckets.setdefault(bk_name, []).append(fen)

    total_local = sum(len(v) for v in buckets.values())
    print(f"Local-filter-passing: {total_local} across {len(buckets)} buckets", file=sys.stderr)

    results = []
    queried = 0
    try:
        for bk_name, fens in sorted(buckets.items()):
            sample = fens if len(fens) <= SAMPLE_PER_BUCKET else random.sample(fens, SAMPLE_PER_BUCKET)
            for fen in sample:
                entry = tb.query(fen)
                queried += 1
                if entry is None or entry.get('category') != 'win':
                    continue
                dtm = entry.get('dtm')
                if dtm is None or dtm <= 0:
                    continue
                results.append({'bk': bk_name, 'fen': fen, 'dtm': dtm,
                                 'dtm_white_moves': vp.plies_to_white_moves(dtm),
                                 'corner': mating_corner(fen), 'source': entry['source']})
    finally:
        tb.save()

    print(f"Tablebase queries: {queried}; win-candidates: {len(results)}", file=sys.stderr)
    (OUT_DIR / 'candidates.json').write_text(json.dumps(results, indent=1))

    # Selection
    buckets_by_tier = {t: [] for t in TIER_BANDS}
    for c in results:
        for tier, (lo, hi) in TIER_BANDS.items():
            if lo <= c['dtm_white_moves'] <= hi:
                buckets_by_tier[tier].append(c)
    for tier in buckets_by_tier:
        print(f"{tier}: {len(buckets_by_tier[tier])} in band", file=sys.stderr)

    stockfish_path = vp.find_stockfish()
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    selected = {'bronze': [], 'silver': [], 'gold': []}
    used_corners: set[str] = set()
    try:
        for tier in ('gold', 'silver', 'bronze'):
            pool = sorted(buckets_by_tier[tier], key=lambda c: c['dtm_white_moves'])
            chosen = []
            for c in pool:
                if len(chosen) >= NEED[tier]:
                    break
                if c['corner'] in used_corners and len(chosen) < NEED[tier] - 1:
                    continue
                board = chess.Board(c['fen'])
                info = engine.analyse(board, chess.engine.Limit(depth=18))
                pv = info.get('pv', [])
                c['pv_head'] = board.san(pv[0]) if pv else '?'
                chosen.append(c)
                used_corners.add(c['corner'])
            if len(chosen) < NEED[tier]:
                for c in pool:
                    if len(chosen) >= NEED[tier]:
                        break
                    if c in chosen:
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
    (OUT_DIR / 'selected.json').write_text(json.dumps(out, indent=1))
    for c in out:
        print(f"{c['tier']:7s} dtm(wm)={c['dtm_white_moves']:3d} corner={c['corner']:14s} "
              f"pv_head={c['pv_head']:6s} fen={c['fen']}")


if __name__ == '__main__':
    main()
