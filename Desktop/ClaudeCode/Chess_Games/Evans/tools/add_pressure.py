#!/usr/bin/env python3
"""
Adds Stoomdruk (pressure) to every Black-to-move node of data/evans_canon_app.json.

Pressure answers: "how big a question did White's last move ask?"  It is what Black would lose
by skipping his move (a null move):

    press = max(0, eval(White to move again) - eval(Black to move))     in pawns, White's view

Both evals come from the same search depth, clamped to +-15 pawns so mates stay finite.
When Black is in check a null move is illegal; such nodes get "press": null and the app
uses PRESS_CHECK from src/config.ts instead.

Run after tools/canon_builder.py (it only adds the "press" field; nothing else changes):

    python tools/add_pressure.py data/evans_canon_app.json --stockfish /path/to/stockfish --depth 16
"""
import argparse, json, sys

import chess
import chess.engine

CLAMP = 1500  # centipawns


def white_cp(eng, board, depth):
    if board.is_checkmate():
        return -CLAMP if board.turn == chess.WHITE else CLAMP
    if board.is_stalemate() or board.is_insufficient_material():
        return 0
    info = eng.analyse(board, chess.engine.Limit(depth=depth))
    cp = info["score"].white().score(mate_score=100000)
    return max(-CLAMP, min(CLAMP, cp))


def null_board(board):
    """Same position with White to move again (no en passant)."""
    parts = board.fen().split()
    parts[1] = "w"
    parts[3] = "-"
    return chess.Board(" ".join(parts))


def pressure(eng, fen, depth):
    b = chess.Board(fen)
    assert b.turn == chess.BLACK
    if b.is_check() or b.is_game_over():
        return None
    act = white_cp(eng, b, depth)
    nul = white_cp(eng, null_board(b), depth)
    return round(max(0, nul - act) / 100, 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--stockfish", required=True)
    ap.add_argument("--depth", type=int, default=16)
    ap.add_argument("--threads", type=int, default=2)
    args = ap.parse_args()

    d = json.load(open(args.data, encoding="utf-8"))
    eng = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    eng.configure({"Threads": args.threads, "Hash": 256})
    todo = [n for n in d["nodes"].values() if n["toMove"] == "b"]
    for i, n in enumerate(todo):
        n["press"] = pressure(eng, n["fen"], args.depth)
        if i % 50 == 0:
            print(f"{i}/{len(todo)}", file=sys.stderr, flush=True)
    eng.quit()
    d["meta"]["press"] = (f"pawns, Black-to-move nodes only: what Black loses by skipping his move "
                          f"(null move), Stockfish depth {args.depth}; null = Black in check")
    with open(args.data, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"press added to {len(todo)} nodes")


if __name__ == "__main__":
    main()
