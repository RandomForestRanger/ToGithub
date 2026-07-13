# Verifikasie-Harnas

Checks every position in `positions.js` against six checks (C1 legality, C2 theoretical
result, C3 move-limit budget, C4 stalemate traps, C5 thematic integrity, C6 note sanity)
and fails the build if any ERROR is found. Needs Python 3.10+ (`pip install -r
requirements.txt`, or reuse `tools/.venv`), Node (any version, for exact `positions.js`
parsing), and a `stockfish` binary on PATH.

```
python tools/verify_positions.py            # full run (15-25 min), all checks
python tools/verify_positions.py --type 9   # one endgame type only
python tools/verify_positions.py --fast     # skip C5, shallower search — for quick iteration
python tools/verify_positions.py --no-net   # never call the Lichess tablebase API
```

Tablebase responses are cached in `tools/tb_cache.json`; delete it to force fresh lookups,
otherwise reruns make no network calls at all.

Read `tools/verification_report.md` after each run — ERRORs are listed first (these must
be fixed or the position removed; the harness exits 1 while any exist), then WARNs (worth a
human look, don't block), then a collapsed OK section. Run this after every future edit to
`positions.js` as a regression gate.

DTM (moves-to-mate) is only ever taken from Lichess's `dtm` field or a real engine search —
never from `dtz` (moves-to-next-capture-or-pawn-push), which is a different, unrelated
number that happens to also come from the tablebase. The engine's DTM search is capped at
`DEPTH_C3_MAX_SEARCH_S` (60s) per position so one slow "quiet" position can't blow the run's
time budget. See the module docstring in `verify_positions.py` for the story behind both.
