#!/usr/bin/env python3
"""
Checks data/evans_canon_app.json against the rules in CLAUDE.md.

1. Data invariants: keys match their FEN, every move is legal and leads to a known node,
   every reachable line has a 'toward' move, every line end exists, White nodes have top2.
2. Round simulation: plays many chart phases with the steering, re-targeting and MISSED
   rules of sections 4 and 8, and asserts that every lookup resolves.

Usage:  python tools/check_canon.py data/evans_canon_app.json [--rounds 2000] [--seed 1]
"""
import argparse, collections, json, math, random, sys

import chess

CLASS_ODDS = {"grey": 0.70, "green": 0.25, "gold": 0.05}
FAMOUS_WEIGHT = 3
RECENT_EXCLUDE = 2


def pos_key(b):
    return " ".join(b.fen().split()[:4])          # python-chess: ep square only when legal


def check_data(d):
    N, L = d["nodes"], {l["id"]: l for l in d["lines"]}
    errors = []
    root = d["meta"]["rootKey"]
    for k, n in N.items():
        b = chess.Board(n["fen"])
        if pos_key(b) != k:
            errors.append(f"key mismatch {k}")
        for m in n["moves"]:
            mv = chess.Move.from_uci(m["uci"])
            if mv not in b.legal_moves:
                errors.append(f"illegal canon move {m['san']} at {k}")
                continue
            if b.san(mv) != m["san"]:
                errors.append(f"san mismatch {m['san']} at {k}")
            nb = b.copy(); nb.push(mv)
            if pos_key(nb) != m["to"] or m["to"] not in N:
                errors.append(f"bad target of {m['san']} at {k}")
        for lid in n["reach"]:
            if lid in n["endOf"]:
                continue
            u = n["toward"].get(lid)
            if u is None:
                errors.append(f"no toward for {lid} at {k}")
                continue
            child = next((m["to"] for m in n["moves"] if m["uci"] == u), None)
            if child is None or lid not in N[child]["reach"]:
                errors.append(f"toward {lid} does not lead there at {k}")
        if n["chartEnd"] != (not n["moves"]):
            errors.append(f"chartEnd inconsistent at {k}")
        if n["toMove"] == "w" and not b.is_game_over() and not n["top2"]:
            errors.append(f"missing top2 at {k}")
    for l in d["lines"]:
        if l["endKey"] not in N:
            errors.append(f"line end missing {l['id']}")
        elif l["id"] not in N[l["endKey"]]["endOf"]:
            errors.append(f"endOf missing {l['id']}")
        if l["parent"] and l["parent"] not in L:
            errors.append(f"bad parent {l['id']}")
    missing_from_root = set(L) - set(N[root]["reach"])
    if missing_from_root:
        errors.append(f"lines unreachable from root: {sorted(missing_from_root)}")
    return errors


def choose(rng, lines_by_id, ids, state, recent=()):
    pool = [i for i in ids if i not in recent] or list(ids)
    classes = {c: [i for i in pool if state[i] == c] for c in CLASS_ODDS}
    odds = {c: p for c, p in CLASS_ODDS.items() if classes[c]}
    c = rng.choices(list(odds), weights=list(odds.values()))[0]
    w = [(FAMOUS_WEIGHT if lines_by_id[i]["famous"] else 1) * (1 + math.log10(1 + lines_by_id[i]["games"]))
         for i in classes[c]]
    return rng.choices(classes[c], weights=w)[0]


def play_chart(d, rng, state, recent, policy):
    """One chart phase. Returns (target_at_start, conquered, events)."""
    N, L = d["nodes"], {l["id"]: l for l in d["lines"]}
    targets = [l["id"] for l in d["lines"] if l["plies"] > len(d["meta"]["entry"])]
    target = start = choose(rng, L, targets, state, recent)
    k = d["meta"]["rootKey"]
    conquered = set(N[k]["endOf"])
    events = collections.Counter()
    while True:
        n = N[k]
        if n["chartEnd"]:
            events["chart_end"] += 1
            break
        b = chess.Board(n["fen"])
        if n["toMove"] == "b":
            if target in n["toward"]:
                u = n["toward"][target]
            else:
                open_ = [i for i in n["reach"] if i not in conquered]
                if open_:
                    target = choose(rng, L, open_, state)
                    events["chain"] += 1
                    u = n["toward"][target]          # KeyError here = data bug
                else:
                    ms = n["moves"]
                    u = rng.choices([m["uci"] for m in ms], weights=[max(1, m["games"]) for m in ms])[0]
            k = next(m["to"] for m in n["moves"] if m["uci"] == u)
            conquered |= set(N[k]["endOf"])
            continue
        # White to move
        r = rng.random()
        canon = [m["uci"] for m in n["moves"]]
        if policy == "perfect" or r < 0.75:
            u = n["toward"].get(target) or rng.choice(canon)
        elif r < 0.90:
            u = rng.choice(canon)
        else:
            u = rng.choice([m.uci() for m in b.legal_moves])
        if u in canon:
            k2 = next(m["to"] for m in n["moves"] if m["uci"] == u)
            conquered |= set(N[k2]["endOf"])
            if target is not None and target not in conquered and target not in N[k2]["reach"]:
                landed = N[k2]["endOf"]
                open_ = [i for i in N[k2]["reach"] if i not in conquered]
                if landed or open_:
                    target = choose(rng, L, open_, state) if open_ else landed[0]
                    events["retarget"] += 1
                else:
                    events["missed_on_chart"] += 1
                    target = None                     # lost for this round (CLAUDE.md 4.4)
            k = k2
        else:
            if target is not None and target not in conquered:
                need = n["toward"][target]            # KeyError here = data bug
                assert chess.Move.from_uci(need) in b.legal_moves
                top = n["top2"] or []
                is_top = bool(top) and (u == top[0]["uci"] or (len(top) > 1 and u == top[1]["uci"]
                                         and top[0]["cp"] - top[1]["cp"] <= 30))
                events["missed_top2" if is_top else "missed"] += 1
            else:
                events["off_chart_after_conquest"] += 1
            break
    return start, conquered, events


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data")
    ap.add_argument("--rounds", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()
    d = json.load(open(args.data, encoding="utf-8"))
    errs = check_data(d)
    print(f"nodes {len(d['nodes'])}, lines {len(d['lines'])}, data errors: {len(errs)}")
    for e in errs[:20]:
        print("  ", e)

    rng = random.Random(args.seed)
    # (a) noisy player: all rules exercised
    state = {l["id"]: "grey" for l in d["lines"]}
    totals = collections.Counter()
    start_hits = 0
    recent = []
    for _ in range(args.rounds):
        start, conq, ev = play_chart(d, rng, state, recent[-RECENT_EXCLUDE:], "noisy")
        recent.append(start)
        totals.update(ev)
        start_hits += start in conq
        for i in conq:
            state[i] = "green"
    print(f"noisy player, {args.rounds} rounds: start target conquered in {start_hits / args.rounds:.0%}; events {dict(totals)}")

    # (b) perfect player: how many rounds to colour the whole forest green?
    rng = random.Random(args.seed)
    state = {l["id"]: "grey" for l in d["lines"]}
    recent, rounds, curve = [], 0, {}
    while any(v == "grey" for v in state.values()) and rounds < 1000:
        start, conq, _ = play_chart(d, rng, state, recent[-RECENT_EXCLUDE:], "perfect")
        assert start in conq, f"perfect play missed {start}"
        recent.append(start)
        rounds += 1
        for i in conq:
            state[i] = "green"
        g = sum(v == "green" for v in state.values())
        for mark in (25, 40, len(state)):
            if g >= mark and mark not in curve:
                curve[mark] = rounds
    print(f"perfect player: whole forest green after {rounds} rounds (milestones {curve})")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
