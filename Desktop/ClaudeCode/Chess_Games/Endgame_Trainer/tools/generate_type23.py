#!/usr/bin/env python3
"""Opdrag 8b: candidate generator + selector for Type 23 (K+Q vs K+2 connected P), mate.

Construction: a black connected pawn pair (adjacent files, same rank -- a
phalanx) is fixed per candidate; black king and white K+Q are swept around
it. Tablebase win-category is the entire quality bar (per spec) -- drawn or
lost configurations (pawns too far advanced/defended) are silently excluded
by the filter, not specially detected.

Tier construction (not pure DTM banding, per spec):
  bronze -> pawn pair on rank 4 or 5 (queen wins them cleanly)
  silver -> pawn pair on rank 5 (transitional)
  gold   -> pawn pair on rank 6 (blockade-first technique required)
DTM bands are then used only to pick the cleanest examples within each
construction band, using the same 60/75/85%-of-move-limit budget idea as
everywhere else (bronze/silver/gold move limits 12/24/36).
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

OUT_DIR = Path('/tmp/et_type23')
NEED = {'bronze': 3, 'silver': 2, 'gold': 2}
TIER_MOVE_LIMIT = {'bronze': 12, 'silver': 24, 'gold': 36}
TIER_PAWN_RANK = {'bronze': (4, 5), 'silver': (5,), 'gold': (6,)}  # 1-indexed

FILE_PAIRS = ['bc', 'cd', 'de', 'ef', 'fg']  # avoid a/b, g/h edge pairs
BK_OFFSETS = [  # relative to the pawn pair's left-file square, "coaching distance"
    (0, -1), (0, 1), (-1, 0), (1, 2), (-1, -1), (1, 1), (0, 2), (-2, 0), (2, 0), (0, -2),
]
WK_OFFSETS = [
    (-3, -3), (-2, -2), (2, 2), (3, 3), (-3, 0), (3, 0), (0, -3), (0, 3), (4, 4), (-4, -4),
]
WQ_OFFSETS = [
    (-4, -4), (4, 4), (-4, 4), (4, -4), (5, 0), (-5, 0), (0, 5), (0, -5), (2, 4), (-2, -4),
]
SAMPLE_PER_BUCKET = 10


def sq(f: int, r: int) -> int | None:
    return chess.square(f, r) if 0 <= f <= 7 and 0 <= r <= 7 else None


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


def local_filters_pass(board: chess.Board) -> bool:
    if not board.is_valid():
        return False
    wk, bk = board.king(chess.WHITE), board.king(chess.BLACK)
    if chess.square_distance(wk, bk) < 2:
        return False
    if board.is_stalemate() or board.is_checkmate():
        return False
    return two_ply_stalemate_scan(board)


def candidate_boards():
    for file_pair in FILE_PAIRS:
        f1, f2 = 'abcdefgh'.index(file_pair[0]), 'abcdefgh'.index(file_pair[1])
        for pawn_rank in range(3, 6):  # 0-indexed ranks 3,4,5 = ranks 4,5,6
            p1 = sq(f1, pawn_rank)
            p2 = sq(f2, pawn_rank)
            for dbf, dbr in BK_OFFSETS:
                bk_sq = sq(f1 + dbf, pawn_rank + dbr)
                if bk_sq is None or bk_sq in (p1, p2):
                    continue
                bk_f, bk_r = chess.square_file(bk_sq), chess.square_rank(bk_sq)
                for dwf, dwr in WK_OFFSETS:
                    wk_sq = sq(bk_f + dwf, bk_r + dwr)
                    if wk_sq is None or wk_sq in (p1, p2, bk_sq):
                        continue
                    for dqf, dqr in WQ_OFFSETS:
                        wq_sq = sq(bk_f + dqf, bk_r + dqr)
                        if wq_sq is None or wq_sq in (p1, p2, bk_sq, wk_sq):
                            continue
                        board = chess.Board(None)
                        board.set_piece_at(p1, chess.Piece(chess.PAWN, chess.BLACK))
                        board.set_piece_at(p2, chess.Piece(chess.PAWN, chess.BLACK))
                        board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                        board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                        board.set_piece_at(wq_sq, chess.Piece(chess.QUEEN, chess.WHITE))
                        board.turn = chess.WHITE
                        yield file_pair, pawn_rank + 1, board  # pawn_rank back to 1-indexed


def main():
    random.seed(23)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tb = vp.TablebaseClient(vp.TB_CACHE_PATH, enabled=True)

    seen: set[str] = set()
    buckets: dict[tuple[str, int], list[str]] = {}
    for file_pair, pawn_rank, board in candidate_boards():
        fen = board.fen()
        key = vp.TablebaseClient._key(fen)
        if key in seen:
            continue
        seen.add(key)
        if not local_filters_pass(board):
            continue
        buckets.setdefault((file_pair, pawn_rank), []).append(fen)

    total_local = sum(len(v) for v in buckets.values())
    print(f"Local-filter-passing: {total_local} across {len(buckets)} buckets", file=sys.stderr)

    results = []
    queried = 0
    try:
        for (file_pair, pawn_rank), fens in sorted(buckets.items()):
            sample = fens if len(fens) <= SAMPLE_PER_BUCKET else random.sample(fens, SAMPLE_PER_BUCKET)
            for fen in sample:
                entry = tb.query(fen)
                queried += 1
                if entry is None or entry.get('category') != 'win':
                    continue
                dtm = entry.get('dtm')
                if dtm is None or dtm <= 0:
                    continue
                results.append({'file_pair': file_pair, 'pawn_rank': pawn_rank, 'fen': fen,
                                 'dtm': dtm, 'dtm_white_moves': vp.plies_to_white_moves(dtm),
                                 'source': entry['source']})
    finally:
        tb.save()

    print(f"Tablebase queries: {queried}; win-candidates: {len(results)}", file=sys.stderr)
    (OUT_DIR / 'candidates.json').write_text(json.dumps(results, indent=1))

    stockfish_path = vp.find_stockfish()
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    selected = {'bronze': [], 'silver': [], 'gold': []}
    used_files: set[str] = set()
    try:
        for tier in ('gold', 'bronze', 'silver'):
            ranks = TIER_PAWN_RANK[tier]
            budget = 0.75 * TIER_MOVE_LIMIT[tier]
            # Gold: hardest-first within its construction band (pawns already on
            # the 6th otherwise trivially fall to the queen in a few moves --
            # picking the LOWEST dtm there, as bronze/silver do, would silently
            # ship gold puzzles easier than bronze; confirmed happened on the
            # first pass, caught before verification).
            key = (lambda c: -c['dtm_white_moves']) if tier == 'gold' else (lambda c: c['dtm_white_moves'])
            pool = sorted(
                [c for c in results if c['pawn_rank'] in ranks and c['dtm_white_moves'] <= budget],
                key=key,
            )
            chosen = []
            for c in pool:
                if len(chosen) >= NEED[tier]:
                    break
                if c['file_pair'] in used_files and len(chosen) < NEED[tier] - 1:
                    continue
                board = chess.Board(c['fen'])
                info = engine.analyse(board, chess.engine.Limit(depth=18))
                pv = info.get('pv', [])
                c['pv_head'] = board.san(pv[0]) if pv else '?'
                chosen.append(c)
                used_files.add(c['file_pair'])
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
        print(f"{c['tier']:7s} pawns={c['file_pair']}{c['pawn_rank']} dtm(wm)={c['dtm_white_moves']:3d} "
              f"pv_head={c['pv_head']:6s} fen={c['fen']}")


if __name__ == '__main__':
    main()
