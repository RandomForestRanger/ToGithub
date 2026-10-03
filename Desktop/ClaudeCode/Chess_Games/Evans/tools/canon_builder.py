#!/usr/bin/env python3
"""
Evans Gambit canon builder.

Builds the baked-in opening tree for the Evans game:
  * starts from the forced entry 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4
  * a move is CANON if it belongs to a named Lichess Evans line, or if it was
    played at least --min-games times in master games (both players >= --min-elo)
  * nodes are keyed by POSITION, not move order, so transpositions merge
  * the tree stops at the end of move 16 (--max-ply 32); a branch whose
    master games run out earlier ends early (that is where Stockfish takes over)
  * Stockfish then adds, for every node: eval, material balance, debt, steam
    (Stoomdruk = eval + debt, where debt = pawns White is down, or 0), best move,
    and for White-to-move nodes the engine's top two moves
  * --app-out writes the file the game loads: named lines with ids, labels,
    parents, famous and reef flags; nodes with reach sets (which named lines can
    still be reached) and a 'toward' table (the canon move that heads for each line)

Game sources (use one or both):
  --pgn FILE [FILE ...]   any PGN (e.g. a ChessBase or Lichess export)
  --lichess-masters       query the Lichess masters explorer position by position
                          (set LICHESS_TOKEN if the API asks for authentication)

Requires:  pip install chess   and a Stockfish binary.

Example:
  python canon_builder.py --pgn evans_master_games.pgn \
      --stockfish ./stockfish --min-games 2 --out evans_canon.json \
      --app-out evans_canon_app.json
"""
import argparse, collections, csv, io, json, os, re, sys, time, urllib.request, urllib.parse

import chess
import chess.pgn

ENTRY = "e4 e5 Nf3 Nc6 Bc4 Bc5 b4".split()
NAMES_URL = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/c.tsv"
PIECE_VALUE = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}

# Lines the app favours when choosing a round's target (Lichess names, without "Italian Game: ").
FAMOUS = {
    "Evans Gambit Accepted", "Evans Gambit, Pierce Defense", "Evans Gambit, Anderssen Variation, Cordel Line",
    "Evans Gambit, Stone-Ware Variation", "Evans Gambit, Fontaine Countergambit", "Evans Gambit, Hein Countergambit",
    "Evans Gambit Declined, Hirschbach Variation", "Evans Gambit Declined, Lange Variation",
    "Evans Gambit, Compromised Defense", "Evans Gambit, Waller Attack", "Evans Gambit, Dufresne Defense",
    "Evans Gambit, Anderssen Defense", "Evans Gambit, Göring Attack", "Evans Gambit, Fraser Attack",
    "Evans Gambit, Slow Variation", "Evans Gambit, McDonnell Defense",
    # further famous lines
    "Evans Gambit, Lasker Defense", "Evans Gambit, Morphy Attack", "Evans Gambit, McDonnell Defense, Main Line",
    "Evans Gambit, Tartakower Attack", "Evans Gambit Declined", "Evans Gambit Declined, Showalter Variation",
    "Evans Gambit Declined, Cordel Variation", "Evans Gambit, Ulvestad Variation", "Evans Gambit, Steinitz Variation",
}
# Display-name overrides (after the "Evans Gambit, " prefix is removed).
SHORT_OVERRIDES = {
    "Anderssen Variation, Cordel Line": "Cordel Line",
    "Compromised Defense, Potter Variation": "Potter Variation",
}
# Lines starting 4...Bb6 5.b5 Na5 6.Nxe5: named, but dubious for White (drawn as reef on the tree).
REEF_PREFIX = "Bb6 b5".split()


def key(board):
    """Position key: placement, side to move, castling, legal en-passant square."""
    return " ".join(board.fen().split()[:4])


def material(board):
    """White minus Black, in pawns."""
    s = 0
    for pt, v in PIECE_VALUE.items():
        s += v * (len(board.pieces(pt, chess.WHITE)) - len(board.pieces(pt, chess.BLACK)))
    return s


def entry_board():
    b = chess.Board()
    for m in ENTRY:
        b.push_san(m)
    return b


# ---------------------------------------------------------------- named lines
def load_named_lines(path=None):
    if path and os.path.exists(path):
        text = open(path, encoding="utf-8").read()
    else:
        text = urllib.request.urlopen(NAMES_URL, timeout=30).read().decode("utf-8")
    lines = []
    for row in csv.DictReader(io.StringIO(text), delimiter="\t"):
        if "Evans" not in row["name"]:
            continue
        sans = [t for t in row["pgn"].split() if not re.match(r"^\d+\.$", t)]
        b = chess.Board()
        moves = []
        for s in sans:
            mv = b.parse_san(s)          # raises if illegal: the list is validated
            moves.append(mv)
            b.push(mv)
        lines.append({"eco": row["eco"], "name": row["name"].replace("Italian Game: ", ""),
                      "moves": moves, "final_key": key(b), "plies": len(moves)})
    return lines


# ---------------------------------------------------------------- game counts
def count_pgn_games(paths, min_elo, max_ply):
    """counts[(pos_key, uci)] = games, for every move from the Evans entry to max_ply."""
    counts = collections.Counter()
    root = key(entry_board())
    used = 0
    for p in paths:
        with open(p, encoding="utf-8", errors="replace") as fh:
            while True:
                g = chess.pgn.read_game(fh)
                if g is None:
                    break
                try:
                    we = int(g.headers.get("WhiteElo", "0") or 0)
                    be = int(g.headers.get("BlackElo", "0") or 0)
                except ValueError:
                    continue
                if min(we, be) < min_elo:
                    continue
                b = g.board()
                mainline = list(g.mainline_moves())
                if len(mainline) <= len(ENTRY):
                    continue
                for mv in mainline[:len(ENTRY)]:
                    b.push(mv)
                if key(b) != root:            # also catches transposed entries
                    continue
                used += 1
                for mv in mainline[len(ENTRY):max_ply]:
                    counts[(key(b), mv.uci())] += 1
                    b.push(mv)
    return counts, used


def count_lichess_masters(min_games, max_ply, named_edges, sleep=1.0):
    """Breadth-first walk of the Lichess masters explorer (2200+ OTB games)."""
    token = os.environ.get("LICHESS_TOKEN")
    counts = collections.Counter()
    b0 = entry_board()
    frontier = [(b0, len(ENTRY))]
    seen = set()
    while frontier:
        b, ply = frontier.pop(0)
        k = key(b)
        if k in seen or ply >= max_ply:
            continue
        seen.add(k)
        url = "https://explorer.lichess.ovh/masters?" + urllib.parse.urlencode({"fen": b.fen(), "moves": 30, "topGames": 0})
        req = urllib.request.Request(url, headers={"User-Agent": "evans-canon-builder"})
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        for attempt in range(5):
            try:
                data = json.load(urllib.request.urlopen(req, timeout=30))
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    time.sleep(60)
                    continue
                raise
        time.sleep(sleep)
        children = set()
        for m in data.get("moves", []):
            n = m["white"] + m["draws"] + m["black"]
            counts[(k, m["uci"])] = n
            if n >= min_games:
                children.add(m["uci"])
        children |= {u for (kk, u) in named_edges if kk == k}
        for u in children:
            nb = b.copy()
            nb.push(chess.Move.from_uci(u))
            frontier.append((nb, ply + 1))
    return counts


# ---------------------------------------------------------------- the tree
def build_tree(named, counts, min_games, max_ply):
    root_board = entry_board()
    named_edges = {}            # (pos_key, uci) -> [line names that use this move]
    names_at = collections.defaultdict(list)   # pos_key -> names ending there
    for ln in named:
        b = chess.Board()
        for i, mv in enumerate(ln["moves"]):
            if i >= len(ENTRY) and i < max_ply:
                named_edges.setdefault((key(b), mv.uci()), []).append(ln["name"])
            b.push(mv)
        names_at[ln["final_key"]].append(ln["name"])

    nodes, edges = {}, []
    root = key(root_board)
    queue = [(root_board, len(ENTRY))]
    while queue:
        b, ply = queue.pop(0)
        k = key(b)
        if k in nodes:
            continue
        nodes[k] = {"fen": b.fen(), "ply": ply, "move_no": ply // 2 + 1,
                    "to_move": "white" if b.turn else "black",
                    "names": sorted(set(names_at.get(k, [])), key=len, reverse=True),
                    "games": 0, "children": []}
        if ply >= max_ply:
            nodes[k]["end"] = "cap"              # reached the cap (default: end of move 16)
            continue
        cand = {}
        for mv in b.legal_moves:
            u = mv.uci()
            n = counts.get((k, u), 0)
            is_named = (k, u) in named_edges
            if is_named or n >= min_games:
                cand[u] = (mv, n, is_named)
        for u, (mv, n, is_named) in sorted(cand.items(), key=lambda x: -x[1][1]):
            nb = b.copy()
            san = b.san(mv)
            nb.push(mv)
            ck = key(nb)
            edges.append({"from": k, "to": ck, "uci": u, "san": san, "games": n,
                          "named": is_named, "side": nodes[k]["to_move"]})
            nodes[k]["children"].append(ck)
            queue.append((nb, ply + 1))
        if not cand:
            nodes[k]["end"] = "early"            # master games run out before the cap
    # games through each node = sum of incoming edge counts (root: sum of outgoing)
    for e in edges:
        nodes[e["to"]]["games"] += e["games"]
    nodes[root]["games"] = sum(e["games"] for e in edges if e["from"] == root)
    return root, nodes, edges, named_edges


def count_paths(root, nodes):
    memo = {}
    def go(k):
        if k in memo:
            return memo[k]
        ch = nodes[k]["children"]
        if not ch:
            r = {"cap": 1, "early": 0} if nodes[k].get("end") == "cap" else {"cap": 0, "early": 1}
        else:
            r = {"cap": 0, "early": 0}
            for c in ch:
                cr = go(c)
                r["cap"] += cr["cap"]
                r["early"] += cr["early"]
        memo[k] = r
        return r
    return go(root)


def family_names(root, nodes, edges):
    """Nearest named ancestor along the shortest (BFS) path, for display."""
    fam = {root: "Evans Gambit"}
    order = sorted(nodes, key=lambda k: nodes[k]["ply"])
    by_from = collections.defaultdict(list)
    for e in edges:
        by_from[e["from"]].append(e["to"])
    for k in order:
        here = nodes[k]["names"][0] if nodes[k]["names"] else fam.get(k, "Evans Gambit")
        fam.setdefault(k, here)
        if nodes[k]["names"]:
            fam[k] = nodes[k]["names"][0]
        for c in by_from[k]:
            fam.setdefault(c, fam[k])
    for k in nodes:
        nodes[k]["family"] = fam.get(k, "Evans Gambit")


# ---------------------------------------------------------------- Stockfish
def add_engine(nodes, edges, sf_path, depth, threads, hash_mb, cache_path, points_cp):
    import chess.engine
    cache = json.load(open(cache_path)) if cache_path and os.path.exists(cache_path) else {}
    eng = chess.engine.SimpleEngine.popen_uci(sf_path)
    eng.configure({"Threads": threads, "Hash": hash_mb})
    def need(k):
        c = cache.get(f"{k}|{depth}")
        if c is None:
            return True
        return nodes[k]["to_move"] == "white" and "top2" not in c     # White nodes need MultiPV 2
    todo = [k for k in nodes if need(k)]
    t0 = time.time()
    for i, k in enumerate(todo):
        b = chess.Board(nodes[k]["fen"])
        if b.is_game_over():
            cache[f"{k}|{depth}"] = {"cp": 0, "mate": None, "best": None, "top2": []}
            continue
        white = nodes[k]["to_move"] == "white"
        infos = eng.analyse(b, chess.engine.Limit(depth=depth), multipv=2 if white else 1)
        sc = infos[0]["score"].white()
        entry = {"cp": sc.score(mate_score=10000), "mate": sc.mate(),
                 "best": b.san(infos[0]["pv"][0]) if infos[0].get("pv") else None}
        if white:
            entry["top2"] = [{"san": b.san(x["pv"][0]), "uci": x["pv"][0].uci(),
                              "cp": x["score"].white().score(mate_score=10000)} for x in infos if x.get("pv")]
        cache[f"{k}|{depth}"] = entry
        if cache_path and i % 20 == 0:
            json.dump(cache, open(cache_path, "w"))
            print(f"  engine {i+1}/{len(todo)}  {time.time()-t0:.0f}s", file=sys.stderr)
    eng.quit()
    if cache_path:
        json.dump(cache, open(cache_path, "w"))
    for k, n in nodes.items():
        c = cache[f"{k}|{depth}"]
        b = chess.Board(n["fen"])
        n["eval_cp"] = c["cp"]
        n["mate"] = c["mate"]
        n["best"] = c["best"]
        n["material"] = material(b)
        n["top2"] = c.get("top2") if n["to_move"] == "white" else None
        ev = max(-15.0, min(15.0, c["cp"] / 100.0))
        n["debt"] = max(0, -n["material"])                  # pawns White has invested
        n["steam"] = round(ev + n["debt"], 2)               # Stoomdruk; above the red mark (= debt) means eval > 0
    child_sans = collections.defaultdict(set)
    for e in edges:
        child_sans[e["from"]].add(e["san"])
    for k, n in nodes.items():
        n["best_in_canon"] = (n["best"] in child_sans[k]) if n["children"] else None
    for e in edges:
        pv, cv = nodes[e["from"]]["eval_cp"], nodes[e["to"]]["eval_cp"]
        loss = (pv - cv) if e["side"] == "white" else (cv - pv)
        e["cp_loss"] = max(0, loss)
        if e["side"] == "white":
            e["points"] = 4 if loss <= points_cp[0] else 3 if loss <= points_cp[1] else 2 if loss <= points_cp[2] else 1


# ---------------------------------------------------------------- report
def summary(root, nodes, edges, named, max_ply, used_games, args):
    paths = count_paths(root, nodes)
    harb = [k for k, n in nodes.items() if n.get("end") == "cap"]
    early = [k for k, n in nodes.items() if n.get("end") == "early"]
    reached = [ln["name"] for ln in named if ln["final_key"] in nodes]
    beyond = [ln["name"] for ln in named if ln["plies"] > max_ply]
    missing = [ln["name"] for ln in named if ln["final_key"] not in nodes and ln["plies"] <= max_ply]
    def after(p):          # label for the position after p half-moves
        return f"{p // 2}..." if p % 2 == 0 else f"{(p + 1) // 2}."
    early_by_move = collections.Counter(after(nodes[k]["ply"]) for k in early)
    early_by_move = {lbl: early_by_move[lbl] for lbl in sorted(early_by_move, key=lambda s: (int(s.rstrip(".")), s.count(".")))}
    return {
        "games_used": used_games,
        "min_games": args.min_games, "min_elo": args.min_elo, "max_ply": max_ply,
        "positions": len(nodes), "moves": len(edges),
        "white_moves": sum(1 for e in edges if e["side"] == "white"),
        "black_moves": sum(1 for e in edges if e["side"] == "black"),
        "routes_to_cap": paths["cap"],
        "cap_positions": len(harb),
        "routes_ending_early": paths["early"],
        "early_end_positions": len(early),
        "early_ends_after": early_by_move,
        "named_lines_reached": len(reached), "named_lines_total": len(named),
        "named_lines_beyond_cap": beyond,
        "named_lines_missing": missing,
        "transposition_nodes": sum(1 for k in nodes if sum(1 for e in edges if e["to"] == k) > 1),
    }


def export_lines(root, nodes, edges, path):
    """One CSV row per route from 4.b4 to the end of the canon (cap or early end)."""
    out_edges = collections.defaultdict(list)
    for e in edges:
        out_edges[e["from"]].append(e)
    rows = []

    def walk(k, ply, moves, names, min_pts):
        n = nodes[k]
        if n["names"] and (not names or names[-1] != n["names"][0]):
            names = names + [n["names"][0]]
        if not n["children"]:
            rows.append({"end": n.get("end"), "moves": " ".join(moves), "named_lines": " > ".join(names),
                         "last_name": names[-1] if names else "Evans Gambit",
                         "games_at_end": n["games"], "eval": round(n.get("eval_cp", 0) / 100, 2) if "eval_cp" in n else "",
                         "material": n.get("material", ""), "steam": n.get("steam", ""),
                         "worst_white_points": min_pts if min_pts < 9 else ""})
            return
        for e in out_edges[k]:
            if ply % 2 == 0:                       # White's move
                mv = f"{ply // 2 + 1}.{e['san']}"
            else:                                  # Black's move
                mv = e["san"] if moves else f"{(ply + 1) // 2}...{e['san']}"
            pts = min(min_pts, e.get("points", 9)) if e["side"] == "white" else min_pts
            walk(e["to"], ply + 1, moves + [mv], names, pts)

    walk(root, len(ENTRY), [], [], 9)
    rows.sort(key=lambda r: (r["end"] != "cap", r["moves"]))
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def _slug(s):
    s = s.lower().replace("ö", "o").replace("...", "-").replace(".", "-")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def _numbered(moves_san):
    """['e4','e5',...] -> ['1.e4','1...e5',...]"""
    return [f"{i // 2 + 1}.{m}" if i % 2 == 0 else f"{i // 2 + 1}...{m}" for i, m in enumerate(moves_san)]


def export_app(root, nodes, edges, named, path, max_ply):
    """The file the game loads. See CLAUDE.md, section 'Data file'."""
    # ---- named lines
    lines = []
    by_key = collections.defaultdict(list)
    name_count = collections.Counter(ln["name"] for ln in named)
    for ln in sorted(named, key=lambda x: (x["plies"], x["name"])):
        b = chess.Board()
        sans = []
        for mv in ln["moves"]:
            sans.append(b.san(mv))
            b.push(mv)
        numbered = _numbered(sans)
        defining = numbered[-1]
        short = ln["name"]
        for pre in ("Evans Gambit, ", "Evans Gambit Declined, "):
            if short.startswith(pre):
                short = short[len(pre):]
        short = SHORT_OVERRIDES.get(short, short)
        if name_count[ln["name"]] > 1 and ln["plies"] > len(ENTRY):
            short = f"{short} ({defining})"
        lid = _slug(short) if name_count[ln["name"]] == 1 or ln["plies"] == len(ENTRY) else _slug(f"{short}")
        if ln["name"].startswith("Evans Gambit Declined, ") and not lid.startswith("declined"):
            lid = "declined-" + lid
        lines.append({"id": lid, "name": ln["name"], "label": short, "sub": defining, "eco": ln["eco"],
                      "movesSan": sans, "movesNumbered": numbered, "plies": ln["plies"],
                      "endKey": ln["final_key"], "famous": ln["name"] in FAMOUS,
                      "reef": sans[len(ENTRY):len(ENTRY) + len(REEF_PREFIX)] == REEF_PREFIX})
    ids = [l["id"] for l in lines]
    assert len(ids) == len(set(ids)), collections.Counter(ids).most_common(3)
    # parent = longest named proper prefix (gives a strict tree for drawing)
    for l in lines:
        best = None
        for p in lines:
            if p["plies"] < l["plies"] and l["movesSan"][:p["plies"]] == p["movesSan"]:
                if best is None or p["plies"] > best["plies"]:
                    best = p
        l["parent"] = best["id"] if best else None
        l["frondPlies"] = l["plies"] - (best["plies"] if best else 0)
        l["games"] = nodes[l["endKey"]]["games"] if l["endKey"] in nodes else 0
        by_key[l["endKey"]].append(l["id"])
    # ---- reach sets: which named lines can still be reached from each node (DAG, deepest first)
    out_edges = collections.defaultdict(list)
    for e in edges:
        out_edges[e["from"]].append(e)
    reach = {}
    for k in sorted(nodes, key=lambda k: -nodes[k]["ply"]):
        r = set(by_key.get(k, []))
        for e in out_edges[k]:
            r |= reach[e["to"]]
        reach[k] = r
    # ---- toward[node][line] = the canon move heading for that line (named edges first, then most games)
    app_nodes = {}
    for k, n in nodes.items():
        tw = {}
        for lid in reach[k]:
            if lid in by_key.get(k, []):
                continue
            cands = [e for e in out_edges[k] if lid in reach[e["to"]]]
            cands.sort(key=lambda e: (not e["named"], -e["games"]))
            tw[lid] = cands[0]["uci"]
        app_nodes[k] = {
            "fen": n["fen"], "ply": n["ply"], "toMove": n["to_move"][0],
            "eval": n.get("eval_cp"), "material": n.get("material"), "debt": n.get("debt"), "steam": n.get("steam"),
            "best": n.get("best"), "top2": n.get("top2"),
            "endOf": by_key.get(k, []), "reach": sorted(reach[k]), "toward": tw,
            "moves": [{"uci": e["uci"], "san": e["san"], "games": e["games"], "named": e["named"], "to": e["to"]}
                      for e in sorted(out_edges[k], key=lambda e: -e["games"])],
            "chartEnd": not out_edges[k],
        }
    data = {"meta": {"entry": ENTRY, "entryNumbered": _numbered(ENTRY), "rootKey": root, "capPly": max_ply,
                     "nodeCount": len(app_nodes), "lineCount": len(lines),
                     "key": "first four FEN fields; en-passant square only when an en-passant capture is legal",
                     "eval": "centipawns, White's point of view, Stockfish depth 18 (mate = +-10000)",
                     "steam": "pawns: clamp(eval/100, -15, 15) + debt; debt = max(0, -material); red mark at debt"},
            "lines": lines, "nodes": app_nodes}
    json.dump(data, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
    return data


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pgn", nargs="*", default=[])
    ap.add_argument("--lichess-masters", action="store_true")
    ap.add_argument("--names", help="local copy of lichess chess-openings c.tsv (downloaded if absent)")
    ap.add_argument("--min-games", type=int, default=2)
    ap.add_argument("--min-elo", type=int, default=2200)
    ap.add_argument("--max-ply", type=int, default=32, help="32 = end of move 16")
    ap.add_argument("--stockfish")
    ap.add_argument("--depth", type=int, default=18)
    ap.add_argument("--threads", type=int, default=2)
    ap.add_argument("--hash", type=int, default=256)
    ap.add_argument("--points-cp", default="25,60,120", help="max cp loss for 4,3,2 points")
    ap.add_argument("--cache", default="engine_cache.json")
    ap.add_argument("--sweep", action="store_true", help="only report tree size for several thresholds")
    ap.add_argument("--out", default="evans_canon.json")
    ap.add_argument("--lines-csv", default="evans_canon_lines.csv", help="one row per route; empty string to skip")
    ap.add_argument("--app-out", help="write the game's data file (needs --stockfish)")
    args = ap.parse_args()

    named = load_named_lines(args.names)
    counts, used = count_pgn_games(args.pgn, args.min_elo, args.max_ply) if args.pgn else (collections.Counter(), 0)
    if args.lichess_masters:
        _, _, _, named_edges = build_tree(named, counts, 10**9, args.max_ply)
        lc = count_lichess_masters(args.min_games, args.max_ply, named_edges)
        for k, v in lc.items():
            counts[k] = max(counts[k], v)

    if args.sweep:
        print(f"games used: {used}")
        print(f"{'min games':>9} {'positions':>9} {'routes to cap':>13} {'routes ending early':>19} {'named reached':>13}")
        for n in (1, 2, 3, 5, 10):
            r, nodes, edges, _ = build_tree(named, counts, n, args.max_ply)
            s = summary(r, nodes, edges, named, args.max_ply, used, argparse.Namespace(min_games=n, min_elo=args.min_elo))
            print(f"{n:>9} {s['positions']:>9} {s['routes_to_cap']:>13} {s['routes_ending_early']:>19} {s['named_lines_reached']:>9}/{s['named_lines_total']}")
        return

    root, nodes, edges, _ = build_tree(named, counts, args.min_games, args.max_ply)
    family_names(root, nodes, edges)
    if args.stockfish:
        add_engine(nodes, edges, args.stockfish, args.depth, args.threads, args.hash, args.cache,
                   [int(x) for x in args.points_cp.split(",")])
    s = summary(root, nodes, edges, named, args.max_ply, used, args)
    out = {"meta": {"entry": " ".join(ENTRY), "engine_depth": args.depth if args.stockfish else None,
                    "steam": "eval (pawns, clamped to +-15) + debt; debt = max(0, -(White minus Black material)); red mark = debt",
                    "points_cp": args.points_cp, **s},
           "root": root, "nodes": nodes, "edges": edges}
    json.dump(out, open(args.out, "w"), ensure_ascii=False, indent=1)
    if args.lines_csv:
        export_lines(root, nodes, edges, args.lines_csv)
    if args.app_out:
        if not args.stockfish:
            sys.exit("--app-out needs --stockfish")
        export_app(root, nodes, edges, named, args.app_out, args.max_ply)
    print(json.dumps(s, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
