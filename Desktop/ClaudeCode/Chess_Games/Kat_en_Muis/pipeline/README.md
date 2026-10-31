# Kat en Muis: building the position bank

`bou_bank.py` turns Lichess game dumps into `data/posisies.json`.

## One-off setup (Mac)

```bash
brew install stockfish
python3 -m pip install chess zstandard
```

## Running it

Download a month of rated standard games from <https://database.lichess.org/> (for example `lichess_db_standard_rated_2015-01.pgn.zst`), then from this folder:

```bash
python3 bou_bank.py ~/Downloads/lichess_db_standard_rated_2015-01.pgn.zst \
    --stockfish "$(which stockfish)" --out ../data/posisies.json
```

To see how many candidates a month holds before spending engine time:

```bash
python3 bou_bank.py ~/Downloads/lichess_db_standard_rated_2015-01.pgn.zst --candidates-only > /dev/null
```

Useful options:

| Option | Default | Meaning |
|---|---|---|
| `--nodes` | 30,000,000 | Certification search size. Bigger is safer and slower. |
| `--stable` | 6 | How many of the last search depths must all say mate in exactly 10. |
| `--alt-nodes` | 3,000,000 | Search size per move when listing the perfect alternatives. |
| `--max-games` | all | Stop scanning after this many games per file (handy for a quick test). |
| `--max-certify` | all | Stop after this many certification attempts. |
| `--fens FILE` | | Certify a list of FENs directly (one per line), for positions from elsewhere. |

The run is resumable. Every result is cached in `posisies.cache.jsonl` beside the output, so stopping and restarting, or adding a second month later, only does new work. The bank is rebuilt from the whole cache each time.

## What it does

1. Streams the dump and keeps only games with a `[%eval #10]` to `[%eval #14]` tag (either colour) in the movetext.
2. Takes every position in those games where the mating side is to move, the tag is #10 to #14 and there are more than 16 units on the board.
3. Certifies each with Stockfish: mate in exactly 10, the same answer over the last search depths, no shorter mate ever reported, and the full line replays to checkmate on the attacker's 10th move. At most one position per game is kept.
4. Lists every move that keeps the exact mate distance at each attacker turn (the game treats these as perfect too), counts quiet moves, flags promotions and castling, and scores difficulty.

Why #10 to #14 and not just #10: Lichess's server analysis is shallow, so its mate scores are upper bounds. A #10 tag is sometimes really a mate in 8 or 9, and a tag of #11 to #14 can hide an exact 10. In the January 2015 sample, though, #10 tags were by far the best source (31 of 54 certified), against 10 of 66 for #11 to #14.

## Current bank and how to grow it

`uitvoer/` holds the working copy: `posisies.json`, its resume cache `posisies.cache.jsonl`, and the old engine-made test bank (`toetsposisies-dev.json`). Always build into `uitvoer/` and then copy the JSON to `../data/`, so the cache stays out of the game folder:

```bash
python3 bou_bank.py ~/Downloads/lichess_db_standard_rated_2015-01.pgn.zst \
    --stockfish "$(which stockfish)" --out uitvoer/posisies.json --max-certify 600
cp uitvoer/posisies.json ../data/posisies.json
```

First run (30 Oct 2026, January 2015 dump, Stockfish 18, 6 threads, default settings):

| | |
|---|---|
| Games scanned | 1,497,237 |
| Games with a #10 to #14 tag | 52,249 |
| Games with candidates (more than 16 units, mating side to move) | 10,046 (12,186 positions) |
| Certification attempts | 120 (the first 99 games) |
| Certified mate in exactly 10 | 41 |
| Rejected | 79 (32 shorter mate, 47 unstable or not 10) |
| Time | 8 min scan, then about 9 s per attempt, 25 s per certified position |

The scan runs again on every invocation (8 minutes for this month). Extrapolated, the whole month holds about 4,000 positions and would need about 30 hours of engine time. Each further 100 positions costs about 45 minutes.

The 41 positions: 20 White, 21 Black to mate; 17 to 29 units; quiet attacker moves from 0 (3 positions) to 9; rating bands 1200 to 2199; blitz 22, classical 14, bullet 5. Nine lines contain a promotion (one underpromotion), one an en passant capture.

## Privacy

Only the month, the attacker's rating band and the game speed are written. Usernames and game links never leave the dump.

## Note on certainty

With more than 16 units there are no tablebases, so certification is strong engine evidence, not proof. If a shorter mate is ever found later, the game still works (a faster mate wins), but "presies 10" would be untrue for that position, so delete it from the cache and rebuild.
