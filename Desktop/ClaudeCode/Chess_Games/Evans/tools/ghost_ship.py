#!/usr/bin/env python3
"""
Die Spookskip (the ghost ship): what happens when White gives the pawn and does not use the time.

Chapter 1, "slow": 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.O-O, then White keeps choosing the
quietest sensible move (never more than --window worse than the best, never dropping material),
while Black plays the engine's best, until Black has castled and developed. Black is still a pawn up.

Chapter 2, "later": a pawn ending with chapter 1's queenside pawns (White a+c against Black's a+b+c:
the missing b-pawn is the bait) and the kingside pawns as they stood; the middle pawns and all pieces
are gone. Both sides play the engine's best until Black's extra pawn becomes a queen. The position
is checked: it must be a win for Black with best play.

    python tools/ghost_ship.py --stockfish /path/to/stockfish --out data/ghost_ship.json

Output: {"chapters": [{"key": "slow", "fen": ..., "moves": [uci...], "san": [...], "startPly": 0},
                      {"key": "later", "fen": ..., "moves": [...], "san": [...], "startPly": n}]}
Captions live in src/content/kaptein.ts (UI.ghost), keyed by chapter.
"""
import argparse, json, sys

import chess
import chess.engine

START = "e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 O-O".split()
VAL = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}


def material(b):
    return sum(VAL[p.piece_type] * (1 if p.color else -1) for p in b.piece_map().values())


def cp_white(eng, b, depth):
    if b.is_checkmate():
        return -100000 if b.turn == chess.WHITE else 100000
    if b.is_game_over():
        return 0
    return eng.analyse(b, chess.engine.Limit(depth=depth))["score"].white().score(mate_score=100000)


def pressure(eng, b, depth=10):
    if b.is_check():
        return 1.5
    f = b.fen().split(); f[1] = "w"; f[3] = "-"
    return max(0, cp_white(eng, chess.Board(" ".join(f)), depth) - cp_white(eng, b, depth)) / 100


def holds_material(eng, b):
    """After his move (Black to move): does Black's best reply plus White's best answer keep material?"""
    m0 = material(b)
    t = b.copy()
    for _ in range(2):
        if t.is_game_over():
            break
        t.push(eng.play(t, chess.engine.Limit(depth=10)).move)
    return material(t) >= m0


def developed(b, color):
    home = [chess.B8, chess.G8, chess.C8, chess.F8] if color == chess.BLACK else [chess.B1, chess.G1, chess.C1, chess.F1]
    minors = [sq for sq, p in b.piece_map().items() if p.color == color and p.piece_type in (chess.KNIGHT, chess.BISHOP)]
    return all(sq not in home for sq in minors)


def chapter_slow(eng, window, max_ply):
    b = chess.Board()
    for s in START:
        b.push_san(s)
    while b.ply() < max_ply:
        if b.turn == chess.WHITE:
            info = eng.analyse(b, chess.engine.Limit(depth=14), multipv=5)
            cands = [(i["pv"][0], i["score"].pov(chess.WHITE).score(mate_score=100000)) for i in info]
            best = max(s for _, s in cands)
            ok = []
            for m, s in cands:
                if s < best - window:
                    continue
                b.push(m)
                if holds_material(eng, b):
                    ok.append((pressure(eng, b), m))
                b.pop()
            m = min(ok)[1] if ok else cands[0][0]
        else:
            m = eng.play(b, chess.engine.Limit(depth=16)).move
        b.push(m)
        if b.turn == chess.WHITE and not b.has_castling_rights(chess.BLACK) and developed(b, chess.BLACK) \
                and b.king(chess.BLACK) in (chess.G8, chess.C8):
            break
    return b


def ending_from(b):
    """Pawn ending: queenside (a-c files) and kingside (f-h files) pawns as they stand; kings e2 / e7."""
    e = chess.Board(None)
    for sq, p in b.piece_map().items():
        if p.piece_type == chess.PAWN and chess.square_file(sq) in (0, 1, 2, 5, 6, 7):
            e.set_piece_at(sq, p)
    e.set_piece_at(chess.E2, chess.Piece(chess.KING, chess.WHITE))
    e.set_piece_at(chess.E7, chess.Piece(chess.KING, chess.BLACK))
    e.turn = chess.WHITE
    return e


def chapter_later(eng, e, max_ply=120):
    b = e.copy()
    while not b.is_game_over() and b.ply() < max_ply:
        b.push(eng.play(b, chess.engine.Limit(depth=22)).move)
        if b.move_stack[-1].promotion and b.turn == chess.WHITE:
            return b, True
    return b, False


def sans(board_start, moves):
    t = board_start.copy(); out = []
    for m in moves:
        out.append(t.san(m)); t.push(m)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stockfish", required=True)
    ap.add_argument("--out", default="data/ghost_ship.json")
    ap.add_argument("--window", type=int, default=20)
    args = ap.parse_args()
    eng = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    eng.configure({"Threads": 2, "Hash": 256})

    slow = chapter_slow(eng, args.window, 40)
    mats = []
    t = chess.Board()
    for m in slow.move_stack:
        t.push(m); mats.append(material(t))
    ev = cp_white(eng, slow, 20)
    print("slow:", " ".join(sans(chess.Board(), slow.move_stack)), file=sys.stderr)
    print(f"  material after 4...Bxb4: {sorted(set(mats[8:]))}, eval at the end {ev}", file=sys.stderr)
    if min(mats[8:]) < -1 or max(mats[8:]) > -1:
        sys.exit("chapter 1 is not a clean one-pawn story")

    e = ending_from(slow)
    verdict = cp_white(eng, e, 26)
    print(f"ending {e.fen()}: eval {verdict}", file=sys.stderr)
    later, promoted = chapter_later(eng, e)
    print("later:", " ".join(sans(e, later.move_stack)), f"promoted={promoted}", file=sys.stderr)
    if not promoted:
        sys.exit("the ending did not promote")
    out = {"chapters": [
        {"key": "slow", "fen": chess.STARTING_FEN, "startPly": 0,
         "moves": [m.uci() for m in slow.move_stack], "san": sans(chess.Board(), slow.move_stack), "evalEnd": ev},
        {"key": "later", "fen": e.fen(), "startPly": 60,
         "moves": [m.uci() for m in later.move_stack], "san": sans(e, later.move_stack), "evalStart": verdict},
    ]}
    json.dump(out, open(args.out, "w"), separators=(",", ":"))
    print(f"wrote {args.out}", file=sys.stderr)
    eng.quit()


if __name__ == "__main__":
    main()
