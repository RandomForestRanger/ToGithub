#!/usr/bin/env python3
"""
Kat en Muis: build the position bank (posisies.json) from Lichess game dumps.

Steps (see CLAUDE.md, "Position bank"):
  1. Stream one or more Lichess PGN dumps (.pgn or .pgn.zst).
  2. Cheap text pre-filter: only games whose movetext contains [%eval #10] or [%eval #-10].
  3. Candidate: the position after the annotated move, side to move is the mating side,
     more than 16 units on the board. At most one per game, dedupe by FEN.
  4. Certification with a native Stockfish: mate in exactly 10, stable over the last
     iterations, no shorter mate ever reported, full line replays to checkmate.
  5. Enrichment: perfect alternatives per attacker turn, quiet moves, flags, difficulty.

Usage:
  python3 bou_bank.py lichess_db_standard_rated_2015-01.pgn.zst \
      --stockfish /path/to/stockfish --out ../data/posisies.json

Rerunnable: certified results are cached in a .jsonl next to the output, so a second
run (or a run on another month) skips work already done.

Privacy: usernames and game links are never written to the output. Only the month,
a rating band and the speed survive.
"""

import argparse
import hashlib
import datetime as dt
import io
import json
import os
import re
import sys
import time

import chess
import chess.engine
import chess.pgn

MATE_N = 10
MIN_UNITS = 17  # "more than 16", kings and pawns included

# Lichess server analysis is shallow, so a reported mate is an upper bound: a "#12"
# is often really a mate in 10, and a "#10" is often really a mate in 8 or 9.
# Scan a band of tags and let certification find the exact 10s.
TAG_MAX = 14
TAG_RE = re.compile(r"\[%eval #(-?)(\d+)\]")
PREFILTER_RE = re.compile(r"\[%eval #-?(?:" + "|".join(str(n) for n in range(MATE_N, TAG_MAX + 1)) + r")\]")
MAX_PER_GAME = 6


# ---------------------------------------------------------------- reading

def open_text(path):
    if path.endswith(".zst"):
        import zstandard
        fh = open(path, "rb")
        reader = zstandard.ZstdDecompressor(max_window_size=2**31).stream_reader(fh)
        return io.TextIOWrapper(reader, encoding="utf-8", errors="replace")
    return open(path, encoding="utf-8", errors="replace")


def matching_games(path, max_games=None):
    """Yield (pgn_text) for games whose movetext carries a #10 or #-10 eval.

    Lichess dumps are: header lines, blank line, one movetext line, blank line.
    Only matching games are handed to python-chess, which is the slow part."""
    headers = []
    seen = 0
    with open_text(path) as fh:
        for line in fh:
            if line.startswith("["):
                headers.append(line)
                continue
            if not line.strip():
                continue
            # movetext line
            seen += 1
            if PREFILTER_RE.search(line):
                yield "".join(headers) + "\n" + line, seen
            headers = []
            if max_games and seen >= max_games:
                break
    yield None, seen


def rating_band(elo):
    try:
        e = int(elo)
    except (TypeError, ValueError):
        return None
    lo = (e // 200) * 200
    return f"{lo}-{lo + 199}"


def speed_from_event(event):
    ev = (event or "").lower()
    for s in ("ultrabullet", "bullet", "blitz", "rapid", "classical", "correspondence"):
        if s in ev:
            return s
    return None


def fen_key(board):
    # placement, side to move, castling, en passant (legal only)
    return " ".join(board.fen().split(" ")[:4])


def candidates_from_game(pgn_text):
    """All positions in a game that might be an exact mate in 10, in game order:
    side to move is the mating side, reported mate between 10 and TAG_MAX,
    more than 16 units. Certification later keeps at most one per game."""
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        return []
    h = game.headers
    if h.get("Variant", "Standard") not in ("Standard", "", None):
        return []
    date = (h.get("UTCDate") or h.get("Date") or "????.??.??").replace(".", "-")
    out = []
    for node in game.mainline():
        ev = node.eval()
        if ev is None:
            continue
        w = ev.white()
        if not w.is_mate() or not (MATE_N <= abs(w.mate()) <= TAG_MAX):
            continue
        board = node.board()
        mating = chess.WHITE if w.mate() > 0 else chess.BLACK
        if board.turn != mating:
            continue
        if len(board.piece_map()) < MIN_UNITS:
            continue
        elo = h.get("WhiteElo") if mating == chess.WHITE else h.get("BlackElo")
        out.append({
            "fen": board.fen(),
            "key": fen_key(board),
            "attacker": "w" if mating == chess.WHITE else "b",
            "units": len(board.piece_map()),
            "tag": abs(w.mate()),
            "source": {
                "type": "lichess-rated",
                "month": date[:7],
                "ratingBand": rating_band(elo),
                "speed": speed_from_event(h.get("Event")),
            },
        })
        if len(out) >= MAX_PER_GAME:
            break
    return out


# ---------------------------------------------------------------- engine

def mate_for_side_to_move(score):
    """Mate distance for the side to move (positive = it mates), else None."""
    if score is None:
        return None
    m = score.relative.mate()
    return m


def certify(engine, board, nodes, stable_n):
    """Return (ok, reason, pv_moves, info_summary)."""
    reports = []  # (depth, mate)
    pv = []
    shorter = None
    with engine.analysis(board, chess.engine.Limit(nodes=nodes), multipv=1) as an:
        for info in an:
            if "score" not in info or "depth" not in info:
                continue
            if info.get("lowerbound") or info.get("upperbound"):
                continue
            m = mate_for_side_to_move(info["score"])
            reports.append((info["depth"], m))
            if m is not None and 0 < m < MATE_N:
                shorter = m
                break
            if "pv" in info and info["pv"]:
                pv = list(info["pv"])
    if shorter is not None:
        return False, f"shorter mate #{shorter}", [], reports
    if not reports:
        return False, "no engine output", [], reports
    # last stable_n distinct depths must all say mate in exactly N
    by_depth = {}
    for d, m in reports:
        by_depth[d] = m
    depths = sorted(by_depth)
    tail = [by_depth[d] for d in depths[-stable_n:]]
    if len(tail) < stable_n or any(m != MATE_N for m in tail):
        return False, f"unstable or not #{MATE_N}: {tail}", [], reports
    return True, "ok", pv, reports


def complete_line(engine, board, pv, nodes):
    """Make sure the main line runs all the way to mate. Stockfish PVs are
    sometimes truncated; extend with fresh searches from the end."""
    b = board.copy()
    line = []
    for mv in pv:
        if mv not in b.legal_moves:
            break
        line.append(mv)
        b.push(mv)
    guard = 0
    while not b.is_checkmate() and guard < 30:
        guard += 1
        info = engine.analyse(b, chess.engine.Limit(nodes=max(nodes // 4, 200_000)))
        ext = info.get("pv") or []
        if not ext:
            return None
        for mv in ext:
            if b.is_checkmate():
                break
            line.append(mv)
            b.push(mv)
    if not b.is_checkmate():
        return None
    return line


def line_checks(board, line, attacker):
    """Line must give mate on the attacker's 10th move, and nothing earlier."""
    b = board.copy()
    attacker_moves = 0
    for i, mv in enumerate(line):
        if b.turn == attacker:
            attacker_moves += 1
        b.push(mv)
        if b.is_checkmate() and i != len(line) - 1:
            return False
    return b.is_checkmate() and attacker_moves == MATE_N and len(line) == 2 * MATE_N - 1


def perfect_alternatives(engine, board, line, attacker, nodes, multipv):
    """For each attacker turn on the line, every move that keeps the exact distance."""
    out = {}
    b = board.copy()
    for ply, mv in enumerate(line):
        if b.turn == attacker:
            need = MATE_N - ply // 2
            n_legal = b.legal_moves.count()
            k = min(multipv, n_legal)
            while True:
                infos = engine.analyse(b, chess.engine.Limit(nodes=nodes), multipv=k)
                good = set()
                for inf in infos:
                    if "pv" not in inf or not inf["pv"]:
                        continue
                    m = mate_for_side_to_move(inf.get("score"))
                    if m == need:
                        good.add(inf["pv"][0].uci())
                # every line we looked at was perfect: there may be more, so look wider
                if len(good) < k or k >= n_legal:
                    break
                k = min(k * 2, n_legal)
            good.add(mv.uci())  # the line's own move is always perfect
            out[str(ply)] = sorted(good)
        b.push(mv)
    return out


def describe(board, line, attacker):
    b = board.copy()
    quiet = 0
    flags = set()
    defender_choices = 0
    for mv in line:
        if b.turn == attacker:
            if not b.gives_check(mv):
                quiet += 1
            if mv.promotion and mv.promotion != chess.QUEEN:
                flags.add("underpromotion")
            elif mv.promotion:
                flags.add("promotion")
            if b.is_castling(mv):
                flags.add("castling")
            if b.is_en_passant(mv):
                flags.add("en-passant")
            if b.is_capture(mv) and b.piece_type_at(mv.from_square) == chess.QUEEN:
                pass
        else:
            defender_choices += b.legal_moves.count()
        b.push(mv)
    return quiet, sorted(flags), defender_choices


def difficulty(quiet, defender_choices, units):
    # quiet moves dominate; defender options and crowding break ties
    return round(quiet * 10 + defender_choices / 20 + units / 10, 2)


def certify_and_enrich(engine, cand, args, engine_name, today):
    t0 = time.time()
    board = chess.Board(cand["fen"])
    attacker = board.turn
    ok, reason, pv, _ = certify(engine, board, args.nodes, args.stable)
    rec = {"key": cand["key"], "ok": False, "reason": reason}
    if ok:
        line = complete_line(engine, board, pv, args.nodes)
        if not line or not line_checks(board, line, attacker):
            rec["reason"] = "line does not mate on move 10"
        else:
            alts = perfect_alternatives(engine, board, line, attacker, args.alt_nodes, args.multipv)
            quiet, flags, dchoices = describe(board, line, attacker)
            rec = {
                "key": cand["key"], "ok": True, "reason": "ok",
                "entry": {
                    "fen": cand["fen"],
                    "attacker": cand["attacker"],
                    "mateIn": MATE_N,
                    "units": cand["units"],
                    "pv": [m.uci() for m in line],
                    "perfectAlternatives": alts,
                    "quietMoves": quiet,
                    "defenderChoices": dchoices,
                    "flags": flags,
                    "difficulty": difficulty(quiet, dchoices, cand["units"]),
                    "source": cand["source"],
                    "verified": {"engine": engine_name, "nodes": args.nodes, "date": today},
                },
            }
    rec["_secs"] = time.time() - t0
    return rec


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pgn", nargs="*", help="Lichess dump(s), .pgn or .pgn.zst")
    ap.add_argument("--fens", help="text file with one FEN per line to certify directly "
                                   "(skips the Lichess scan; source type set by --fen-source)")
    ap.add_argument("--fen-source", default="dev", help="source type for --fens entries")
    ap.add_argument("--stockfish", default="stockfish", help="path to a native Stockfish binary")
    ap.add_argument("--out", default="../data/posisies.json")
    ap.add_argument("--nodes", type=int, default=30_000_000, help="certification node budget")
    ap.add_argument("--alt-nodes", type=int, default=3_000_000, help="node budget per enrichment search")
    ap.add_argument("--multipv", type=int, default=6)
    ap.add_argument("--stable", type=int, default=6, help="last N depths that must agree")
    ap.add_argument("--threads", type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument("--hash", type=int, default=512, help="MB")
    ap.add_argument("--max-games", type=int, default=None, help="stop after this many games per file")
    ap.add_argument("--max-certify", type=int, default=None, help="stop after this many certification attempts")
    ap.add_argument("--candidates-only", action="store_true", help="scan and list candidates, no engine")
    args = ap.parse_args()

    out_path = os.path.abspath(args.out)
    cache_path = os.path.splitext(out_path)[0] + ".cache.jsonl"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path) as fh:
            for line in fh:
                try:
                    rec = json.loads(line)
                    cache[rec["key"]] = rec
                except (ValueError, KeyError):
                    pass

    stats = {"games_scanned": 0, "games_with_tag": 0, "candidates": 0, "duplicates": 0,
             "certified": 0, "rejected": 0, "from_cache": 0}
    reasons = {}

    # 1-3: scan. Candidates come in groups, one group per game.
    groups = []
    seen_keys = set()
    for path in args.pgn:
        t0 = time.time()
        for pgn_text, seen in matching_games(path, args.max_games):
            if pgn_text is None:
                stats["games_scanned"] += seen
                break
            stats["games_with_tag"] += 1
            group = []
            for cand in candidates_from_game(pgn_text):
                if cand["key"] in seen_keys:
                    stats["duplicates"] += 1
                    continue
                seen_keys.add(cand["key"])
                group.append(cand)
            if group:
                groups.append(group)
        print(f"[scan] {os.path.basename(path)}: {stats['games_scanned']} games, "
              f"{stats['games_with_tag']} tagged, {len(groups)} games with candidates, "
              f"{sum(map(len, groups))} positions ({time.time() - t0:.0f}s)", file=sys.stderr)
    if args.fens:
        with open(args.fens) as fh:
            for line in fh:
                fen = line.strip()
                if not fen or fen.startswith("#"):
                    continue
                board = chess.Board(fen)
                if len(board.piece_map()) < MIN_UNITS or fen_key(board) in seen_keys:
                    continue
                seen_keys.add(fen_key(board))
                groups.append([{
                    "fen": board.fen(), "key": fen_key(board),
                    "attacker": "w" if board.turn == chess.WHITE else "b",
                    "units": len(board.piece_map()),
                    "source": {"type": args.fen_source},
                }])
    if not groups and not args.pgn:
        ap.error("give at least one PGN file or --fens")
    stats["candidates"] = sum(map(len, groups))
    stats["games_with_candidates"] = len(groups)

    if args.candidates_only:
        json.dump({"stats": stats, "groups": groups}, sys.stdout, indent=1)
        return

    # 4-5: certify + enrich, at most one certified position per game
    engine = chess.engine.SimpleEngine.popen_uci(args.stockfish)
    engine.configure({"Threads": args.threads, "Hash": args.hash})
    engine_name = engine.id.get("name", "Stockfish")
    today = dt.date.today().isoformat()

    attempts = 0
    run_t0 = time.time()
    with open(cache_path, "a") as cache_fh:
        for gi, group in enumerate(groups):
            if any(cache.get(c["key"], {}).get("ok") for c in group):
                stats["from_cache"] += 1
                continue
            for cand in group:
                if cand["key"] in cache:
                    continue
                if args.max_certify and attempts >= args.max_certify:
                    break
                attempts += 1
                rec = certify_and_enrich(engine, cand, args, engine_name, today)
                secs = rec.pop("_secs", 0)
                cache[cand["key"]] = rec
                cache_fh.write(json.dumps(rec) + "\n")
                cache_fh.flush()
                tag = "OK " if rec["ok"] else "-- "
                tagged = f" (tag #{cand['tag']})" if "tag" in cand else ""
                print(f"[game {gi + 1}/{len(groups)}] {tag}{rec['reason']}{tagged}  "
                      f"({secs:.0f}s, total {time.time() - run_t0:.0f}s)", file=sys.stderr)
                if rec["ok"]:
                    break
            if args.max_certify and attempts >= args.max_certify:
                break

    engine.quit()

    # assemble bank from everything certified (this run and earlier runs)
    entries = [r["entry"] for r in cache.values() if r.get("ok")]
    for r in cache.values():
        if not r.get("ok"):
            key = r["reason"].split(":")[0]
            reasons[key] = reasons.get(key, 0) + 1
    entries.sort(key=lambda e: (e["difficulty"], e["fen"]))
    for e in entries:
        # stable id from the position, so saved progress survives a bigger bank
        e["id"] = "km-" + hashlib.sha1(fen_key(chess.Board(e["fen"])).encode()).hexdigest()[:8]
    stats["certified"] = len(entries)
    stats["rejected"] = sum(reasons.values())

    bank = {"version": 1, "generated": today, "mateIn": MATE_N, "minUnits": MIN_UNITS,
            "count": len(entries), "positions": [{"id": e.pop("id"), **e} for e in entries]}
    with open(out_path, "w") as fh:
        json.dump(bank, fh, ensure_ascii=False, indent=1)

    print(json.dumps({"stats": stats, "rejections": reasons}, indent=1), file=sys.stderr)
    print(f"wrote {len(entries)} positions to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
