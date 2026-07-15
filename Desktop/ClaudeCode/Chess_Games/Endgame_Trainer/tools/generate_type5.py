#!/usr/bin/env python3
"""Opdrag 5: candidate generator for Type 5 (K+N+N vs K+P), Troitsky method.

Strategy (documented in the Opdrag 5 report, not repeated here):
  - Pawn is fixed on/behind its file's Troitsky square; blockading knight is
    fixed directly in front of it. These two pieces are NOT swept.
  - Black king is swept across a curated set of squares spanning corner ->
    near-corner -> edge-mid -> central (DTM correlates with king distance
    from a mating corner in this family).
  - White king and the second knight are swept across a small set of
    "coaching distance" squares near the action, not every empty square.
  - All local (network-free) checks -- board validity, C1 house rules, the
    two-ply stalemate scan -- run BEFORE any tablebase query, so only
    surviving candidates spend a network call.

This keeps total tablebase queries in the low hundreds, matching the
spec's own estimate, while still covering all 8 files for variety.
"""
from __future__ import annotations

import itertools
import json
import sys
from pathlib import Path

import chess

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_positions as vp  # noqa: E402  (reuse TablebaseClient, cache, rate limit)

TROITSKY = {  # file -> (rank of Troitsky square), 1-indexed ranks
    'a': 4, 'b': 6, 'c': 5, 'd': 4, 'e': 4, 'f': 5, 'g': 6, 'h': 4,
}

TIER_BANDS = {
    'bronze': (8, 13),
    'silver': (16, 25),
    'gold': (28, 39),
}
TIER_LIMITS = {'bronze': 22, 'silver': 34, 'gold': 46}

# Curated black-king sweep: corners, near-corners, edge-mid, central squares.
BK_SWEEP = [
    'a8', 'h8', 'a1', 'h1',                      # corners
    'b8', 'g8', 'a7', 'h7', 'b1', 'g1', 'a2', 'h2',  # near-corner
    'd8', 'e8', 'a5', 'a4', 'h5', 'h4', 'd1', 'e1',  # edge-mid
    'd5', 'e5', 'd4', 'e4', 'c6', 'f6', 'c3', 'f3',  # central
]

# Curated white-king sweep (coaching distance -- generic offsets, filtered
# for on-board legality per candidate).
WK_OFFSETS = [(-3, -3), (-2, -2), (2, 2), (3, 3), (-3, 0), (3, 0), (0, -3), (0, 3),
              (-2, 2), (2, -2), (4, 4), (-4, -4)]

# Curated second-knight outposts (generic offsets from the black king).
# NB: must NOT be knight-move-shaped (|dx|,|dy| in {1,2}/{2,1}) -- that would
# place the knight giving check to black with white to move, i.e. an
# automatically illegal (opposite-check) position.
N2_OFFSETS = [(-3, -3), (3, 3), (-3, 3), (3, -3), (4, 0), (-4, 0), (0, 4), (0, -4)]


def sq(file_idx: int, rank_idx: int) -> int | None:
    if 0 <= file_idx <= 7 and 0 <= rank_idx <= 7:
        return chess.square(file_idx, rank_idx)
    return None


def two_ply_stalemate_scan(board: chess.Board) -> tuple[bool, str]:
    """Construction-time filter, stricter than the harness's 1-ply C4.

    Ply 1: no white move may immediately stalemate black (matches C4).
    Ply 2: for every black reply to every ply-1-safe white move, white must
    retain at least one non-stalemating follow-up -- catches a stalemate
    trap lurking one move deeper than C4 alone checks.
    """
    for wmove in list(board.legal_moves):
        board.push(wmove)
        if board.is_stalemate():
            board.pop()
            return False, f"onmiddellike pat na {wmove.uci()}"
        if board.is_checkmate() or not list(board.legal_moves):
            board.pop()
            continue
        for bmove in list(board.legal_moves):
            board.push(bmove)
            white_replies = list(board.legal_moves)
            if white_replies:
                all_stalemate = True
                for wr in white_replies:
                    board.push(wr)
                    if not board.is_stalemate():
                        all_stalemate = False
                    board.pop()
                    if not all_stalemate:
                        break
                if all_stalemate:
                    board.pop()
                    board.pop()
                    return False, f"pat-fuik twee-ply diep na {wmove.uci()} {bmove.uci()}"
            board.pop()
        board.pop()
    return True, "skoon tot twee ply"


def candidate_boards():
    for file_letter, troitsky_rank in TROITSKY.items():
        file_idx = 'abcdefgh'.index(file_letter)
        for pawn_rank in range(troitsky_rank, 7):  # Troitsky square .. rank 7 (0-indexed: rank-1)
            pawn_rank0 = pawn_rank - 1  # convert to 0-indexed
            pawn_sq = sq(file_idx, pawn_rank0)
            n1_sq = sq(file_idx, pawn_rank0 - 1)  # blockader directly in front (toward rank 1)
            if pawn_sq is None or n1_sq is None:
                continue
            for bk_name in BK_SWEEP:
                bk_sq = chess.parse_square(bk_name)
                if bk_sq in (pawn_sq, n1_sq):
                    continue
                bk_file, bk_rank = chess.square_file(bk_sq), chess.square_rank(bk_sq)
                for dwf, dwr in WK_OFFSETS:
                    wk_sq = sq(bk_file + dwf, bk_rank + dwr)
                    if wk_sq is None or wk_sq in (pawn_sq, n1_sq, bk_sq):
                        continue
                    for dnf, dnr in N2_OFFSETS:
                        n2_sq = sq(bk_file + dnf, bk_rank + dnr)
                        if n2_sq is None or n2_sq in (pawn_sq, n1_sq, bk_sq, wk_sq):
                            continue
                        board = chess.Board(None)
                        board.set_piece_at(pawn_sq, chess.Piece(chess.PAWN, chess.BLACK))
                        board.set_piece_at(n1_sq, chess.Piece(chess.KNIGHT, chess.WHITE))
                        board.set_piece_at(n2_sq, chess.Piece(chess.KNIGHT, chess.WHITE))
                        board.set_piece_at(wk_sq, chess.Piece(chess.KING, chess.WHITE))
                        board.set_piece_at(bk_sq, chess.Piece(chess.KING, chess.BLACK))
                        board.turn = chess.WHITE
                        yield file_letter, pawn_rank, board


def local_filters_pass(board: chess.Board) -> bool:
    if not board.is_valid():
        return False
    wk = board.king(chess.WHITE)
    bk = board.king(chess.BLACK)
    if chess.square_distance(wk, bk) < 2:
        return False
    if board.is_stalemate() or board.is_checkmate():
        return False
    ok, _ = two_ply_stalemate_scan(board)
    return ok


SAMPLE_PER_BUCKET = 15  # cap on how many locally-valid candidates per
                        # (file, pawn_rank) bucket get sent to the tablebase


def main():
    import random
    random.seed(5)  # reproducible sampling

    tb = vp.TablebaseClient(vp.TB_CACHE_PATH, enabled=True)
    seen_keys: set[str] = set()
    buckets: dict[tuple[str, int], list[tuple[str, int, str]]] = {}

    # Pass 1: local-only filtering (no network), bucketed by (file, pawn_rank).
    for file_letter, pawn_rank, board in candidate_boards():
        fen = board.fen()
        key = vp.TablebaseClient._key(fen)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        if not local_filters_pass(board):
            continue
        buckets.setdefault((file_letter, pawn_rank), []).append(fen)

    total_local = sum(len(v) for v in buckets.values())
    print(f"Local-filter-passing candidates: {total_local} across {len(buckets)} buckets", file=sys.stderr)

    # Pass 2: stratified sample per bucket, THEN query the tablebase.
    results = []
    queried = 0
    try:
        for (file_letter, pawn_rank), fens in sorted(buckets.items()):
            sample = fens if len(fens) <= SAMPLE_PER_BUCKET else random.sample(fens, SAMPLE_PER_BUCKET)
            for fen in sample:
                entry = tb.query(fen)
                queried += 1
                if entry is None:
                    continue
                if entry.get('category') != 'win':
                    continue
                dtm = entry.get('dtm')
                if dtm is None or dtm <= 0:
                    continue
                results.append({
                    'file': file_letter, 'pawn_rank': pawn_rank, 'fen': fen,
                    'category': entry['category'], 'dtm': dtm, 'source': entry['source'],
                })
                if queried % 25 == 0:
                    print(f"... {queried} queried, {len(results)} in-band-candidates so far", file=sys.stderr)
    finally:
        tb.save()

    print(f"Total tablebase queries this run: {queried}", file=sys.stderr)
    print(f"Total win-category candidates collected: {len(results)}", file=sys.stderr)

    out_path = Path('/tmp/et_type5/candidates.json')
    out_path.write_text(json.dumps(results, indent=1))
    print(f"Wrote {len(results)} candidates to {out_path}")


if __name__ == '__main__':
    main()
