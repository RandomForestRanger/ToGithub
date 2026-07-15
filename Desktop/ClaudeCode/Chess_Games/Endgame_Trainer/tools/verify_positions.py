#!/usr/bin/env python3
"""Verification harness for Skaakmat Afrigter's positions.js.

Reads every endgame position, runs a battery of checks against it
(legality, theoretical result, depth budget, stalemate traps, thematic
integrity, note sanity), prints a verdict per position, writes
tools/verification_report.md, and exits non-zero if any ERROR survives.

See tools/README.md for usage. See Opdrag_01_Verifikasie_Harnas.md for
the full spec this implements.

Pitfalls already fixed here — don't reintroduce them:

- DTZ is not a DTM proxy. For 6-7 piece positions, Lichess returns `dtz`
  (moves to the next zeroing move: capture/pawn push) even when `dtm`
  (moves to mate) is unavailable. An earlier version of find_dtm() used
  dtz as a DTM stand-in "since it's close enough" — it isn't: a pawn-race
  conversion resets dtz on every push, so it silently underreported mate
  distance by an arbitrary amount (observed: reporting "mate in 1" for a
  position that's actually ~40+ moves from mate). If dtm is None, fall
  through to the engine search below; never substitute dtz.
- The DTM engine search needs a time cap. `Limit(depth=DEPTH_C3)` with no
  time bound can pathologically grind for 10+ minutes on a single "quiet"
  position (observed directly on a slow pawn-race conversion) — enough to
  blow the whole run's time budget on one unlucky position. See
  DEPTH_C3_MAX_SEARCH_S.
- The §4 self-play rollout (self_play_rollout) is genuinely stochastic move
  to move — movetime-based search depth varies with real-time system load,
  not a fixed node/depth count. A single "no promotion within the ply cap"
  result is not strong evidence the position is broken: observed directly
  on a real (sound) Lucena position where one rollout found no promotion in
  100 moves and a fresh rollout on the same FEN promoted cleanly in 2 —
  the first was a non-convergent line (likely a repetition-shaped defence)
  that happened not to resolve within the cap, not a property of the
  position. _run_rollout_once() breaks on can_claim_threefold_repetition()
  (previously absent, letting such lines silently burn the whole cap) and
  self_play_rollout() retries once on a None result before concluding
  ERROR. Don't drop the retry, and don't treat a single rollout result as
  authoritative when deciding to retire content — cross-check against a
  deep single-PV analysis first (see the T17 investigation history in
  Opdrag 3 for a case where DTM legitimately varied 28 vs 42 between two
  genuine rollouts of the same slow positional squeeze — that one really
  was too slow for its tier, unlike the Lucena false alarm).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import chess
import chess.engine

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None


# ─── Configuration ────────────────────────────────────────────────────────
# Tune these without touching check logic.

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent
POSITIONS_JS = REPO_ROOT / "positions.js"
EXTRACTOR_CJS = TOOLS_DIR / "extract_positions.cjs"
TB_CACHE_PATH = TOOLS_DIR / "tb_cache.json"
REPORT_PATH = TOOLS_DIR / "verification_report.md"

# Engine depths (full run). --fast overrides these, see apply_fast_mode().
DEPTH_C2 = 28  # theoretical-result eval depth
DEPTH_C3 = 30  # DTM search depth
DEPTH_C3_MAX_SEARCH_S = 60.0  # safety cap on the depth-30 pass — a fixed depth with
# no time bound can pathologically grind for many minutes on a single "quiet"
# position (observed directly: 10+ min on a slow pawn-race conversion). Capping
# it keeps one unlucky position from blowing the whole run's time budget; if it
# times out before reaching DEPTH_C3, the fallback pass below still gets a look.
DEPTH_C3_TIME_FALLBACK = 15.0  # seconds, extra pass if no mate found at DEPTH_C3
DEPTH_C5 = 18  # thematic unique-winning-move eval depth
DEPTH_HINT_UNUSED = 20  # reserved: matches app.js hint depth, not used by checks

# C2 classification thresholds (centipawns, from the side-to-move's perspective
# after normalising to White's absolute perspective per project convention).
CP_WON_THRESHOLD = 300
CP_DRAWN_THRESHOLD = 100

# C3 budgets: DTM as a fraction of the tier's effective move limit.
TIER_BUDGET_FRACTION = {
    "bronze": 0.60,
    "silver": 0.75,
    "gold": 0.85,
}

# C4 stalemate-trap thresholds.
STALEMATE_ERROR_FRACTION = 0.30  # >30% of legal moves stalemating -> ERROR

# C5 thematic integrity: types where "is the theme actually required" matters.
# Extended in later tasks (per spec, initially just 9 and 10).
THEMATIC_TYPES = {9, 10}
THEMATIC_WINNING_CP = 300
THEMATIC_WARN_AT = 3  # >=3 winning moves -> WARN ("theme is decorative")

# C5-strict (Opdrag 6): tablebase-exact hardening of the above for the K+P
# family. Supersedes plain check_c5 for these type IDs. max_winning is the
# hard ceiling (ERROR above it); require_natural_fail demands at least one
# losing move be a "natural" forward king move (see is_natural_forward_move)
# -- a puzzle where only obvious blunders lose teaches nothing.
C5_STRICT_CONFIG = {
    8: {"max_winning": 2, "require_natural_fail": True},
    9: {"max_winning": 1, "require_natural_fail": True},
    10: {"max_winning": 2, "require_natural_fail": True},
}

# C7 (Opdrag 6, Type 10 only): triangle/reciprocal-zugzwang detector budget.
C7_MAX_PV_PLIES = 60

# C6 note sanity: eval drop threshold for a "legal but bad" recommended move.
NOTE_MOVE_MIN_CP_AFTER = 100  # if eval after the move (white's POV) < this, WARN

# C3 promote check (Opdrag 3 §4): a self-play rollout replaces the old PV-scan
# heuristic in full runs (the PV-scan was flagged from Task 1 as a stopgap and
# is now the weakest gate guarding 16+ re-tagged 'promote' positions). Ply cap
# is independent of tier so one rollout per FEN serves every budget check.
ROLLOUT_MOVETIME_S = 0.25
ROLLOUT_MAX_PLIES = 200  # ~100 white moves — comfortably beyond any tier's limit

# Tablebase: respect the service.
TABLEBASE_URL = "https://tablebase.lichess.ovh/standard"
TABLEBASE_MAX_PIECES = 7
TABLEBASE_DTM_MAX_PIECES = 5
TABLEBASE_MIN_INTERVAL_S = 1.05  # >~1 req/s

# Lichess reports 'cursed-win'/'blessed-loss' when the WDL is a win/loss but
# DTZ exceeds 100 plies (50 full moves) without a capture/pawn move, i.e. the
# win only exists past the point a standard 50-move rule would erase it. This
# project *disables* the 50-move rule (Endgame_Trainer/CLAUDE.md, "Draw
# conditions"), so the win is real in principle — but every tier's move
# limit here tops out at 46 (Type 5 gold), nowhere near 50 full moves. A
# cursed-win is therefore exactly as unreachable in this app as a plain draw
# would be, and gets the same C2 treatment; blessed-loss likewise mirrors a
# plain loss.
TABLEBASE_ERROR_CATEGORIES_FOR_MATE = {"draw", "loss", "cursed-win", "blessed-loss"}

# Lichess tablebase dtm/dtz are reported in plies (half-moves). This
# project's move limits count full white turns ("one move" = one white
# move + one black reply, per positions.js's own header comment and the
# spec's "Effective move limit" note). Since C1 guarantees White is always
# to move at these positions, White's moves fall on odd plies, so N plies
# needs ceil(N/2) white moves to complete.
def plies_to_white_moves(plies: int) -> int:
    return (abs(plies) + 1) // 2

# Afrikaans/mixed piece-letter convention observed in positions.js notes
# ('K' king and 'Q' queen already match python-chess; 'T'=Toring/Rook and
# 'L'=Loper/Bishop are Afrikaans; 'D'=Dame is an alternate queen initial;
# bare 'R' is assumed to mean Ruiter/Knight since no rook uses 'R' in this
# file's convention).
NOTE_PIECE_LETTER_MAP = {
    "K": chess.KING,
    "Q": chess.QUEEN,
    "D": chess.QUEEN,
    "T": chess.ROOK,
    "L": chess.BISHOP,
    "R": chess.KNIGHT,
    "N": chess.KNIGHT,
    "B": chess.BISHOP,
}


# ─── Data model ───────────────────────────────────────────────────────────

@dataclass
class Position:
    type_id: int | str  # int for real types 1-20; str (e.g. '_dev') for test scaffolding
    type_name: str
    tier: str  # 'bronze' | 'silver' | 'gold'
    tier_label: str
    index: int  # 1-based within (type, tier)
    fen: str
    note: str
    move_limit: int
    win_condition: str  # 'mate' (default) | 'promote' | 'hold' — Opdrag 2
    hold_moves: int  # full moves white must survive; meaningful only when win_condition == 'hold'
    retired: bool = False  # Opdrag 3 — never served, C2-C6 skipped (C1 legality still runs)

    @property
    def _type_tag(self) -> str:
        return f"{self.type_id:02d}" if isinstance(self.type_id, int) else str(self.type_id)

    @property
    def tag(self) -> str:
        return f"T{self._type_tag} {self.tier} #{self.index}"

    @property
    def short_tag(self) -> str:
        tier_char = {"bronze": "b", "silver": "s", "gold": "g"}[self.tier]
        return f"T{self._type_tag}{tier_char}{self.index}"


@dataclass
class Finding:
    check: str
    level: str  # OK | WARN | ERROR
    message: str


@dataclass
class PositionResult:
    position: Position
    findings: list = field(default_factory=list)
    extra: dict = field(default_factory=dict)  # Opdrag 6: e.g. extra['c7'] = the triangle detail dict

    @property
    def verdict(self) -> str:
        levels = [f.level for f in self.findings]
        if "ERROR" in levels:
            return "ERROR"
        if "WARN" in levels:
            return "WARN"
        return "OK"

    def summary(self) -> str:
        bad = [f for f in self.findings if f.level != "OK"]
        if not bad:
            return "alles in orde"
        return "; ".join(f"[{f.check}/{f.level}] {f.message}" for f in bad)


# ─── positions.js extraction ──────────────────────────────────────────────

def extract_raw_data(positions_path: Path) -> dict:
    """Return {'ENDGAME_TYPES', 'TIERS', 'POSITIONS'} parsed from positions.js.

    Prefers the Node extractor (exact — runs the file's own const
    declarations through Node's CommonJS module wrapper). Falls back to a
    regex-based scan if Node isn't available.
    """
    node = shutil.which("node")
    if node:
        try:
            out = subprocess.run(
                [node, str(EXTRACTOR_CJS), str(positions_path)],
                capture_output=True, text=True, check=True,
            )
            return json.loads(out.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
            print(f"WAARSKUWING: Node-ekstraksie het misluk ({exc}); "
                  f"val terug op regex-ontleding.", file=sys.stderr)
    return extract_raw_data_regex(positions_path)


def extract_raw_data_regex(positions_path: Path) -> dict:
    """Regex fallback per spec section 'Parsing positions.js', option 2.

    Used only when Node is unavailable. Extracts per-type blocks, then
    per-tier position lists, capturing fen / note / moveLimit.
    """
    import re

    text = positions_path.read_text(encoding="utf-8")

    tiers_match = re.search(r"const\s+TIERS\s*=\s*\{(.*?)\n\}", text, re.S)
    tiers = {}
    if tiers_match:
        for tier_m in re.finditer(
            r"(\w+):\s*\{\s*label:\s*'([^']*)',\s*moveLimit:\s*(\d+)",
            tiers_match.group(1),
        ):
            tiers[tier_m.group(1)] = {
                "label": tier_m.group(2),
                "moveLimit": int(tier_m.group(3)),
            }

    types = []
    for type_m in re.finditer(
        r"\{\s*id:\s*(\d+),\s*name:\s*'([^']*)'", text
    ):
        types.append({"id": int(type_m.group(1)), "name": type_m.group(2)})

    positions: dict[str, dict[str, list]] = {}
    # Numeric keys are real types ('1'..'20'); underscore-prefixed keys are
    # test scaffolding (Opdrag 2 §6's temporary '_dev' hold-mode fixture).
    type_block_re = re.compile(r"^\s*(\d+|_\w+):\s*\{\s*$", re.M)
    block_starts = list(type_block_re.finditer(text))
    for i, m in enumerate(block_starts):
        type_id = m.group(1)
        start = m.end()
        end = block_starts[i + 1].start() if i + 1 < len(block_starts) else len(text)
        block = text[start:end]
        positions[type_id] = {}
        for tier_m in re.finditer(r"(bronze|silver|gold):\s*\[(.*?)\n\s*\],", block, re.S):
            tier_name, tier_body = tier_m.group(1), tier_m.group(2)
            entries = []
            # Capture fen/note, then scan the rest of the object literal
            # (up to its closing brace) for the optional fields in any order.
            for pos_m in re.finditer(
                r"fen:\s*['\"]([^'\"]+)['\"]\s*,\s*\n?\s*note:\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")"
                r"(?P<rest>[^}]*)\}",
                tier_body,
            ):
                fen = pos_m.group(1)
                note = pos_m.group(2) if pos_m.group(2) is not None else pos_m.group(3)
                rest = pos_m.group("rest") or ""
                entry = {"fen": fen, "note": note}
                ml_m = re.search(r"moveLimit:\s*(\d+)", rest)
                if ml_m:
                    entry["moveLimit"] = int(ml_m.group(1))
                wc_m = re.search(r"winCondition:\s*'(\w+)'", rest)
                if wc_m:
                    entry["winCondition"] = wc_m.group(1)
                hm_m = re.search(r"holdMoves:\s*(\d+)", rest)
                if hm_m:
                    entry["holdMoves"] = int(hm_m.group(1))
                if re.search(r"retired:\s*true", rest):
                    entry["retired"] = True
                entries.append(entry)
            positions[type_id][tier_name] = entries

    return {"ENDGAME_TYPES": types, "TIERS": tiers, "POSITIONS": positions}


def flatten_positions(raw: dict, type_filter: int | None) -> list[Position]:
    type_names = {t["id"]: t["name"] for t in raw["ENDGAME_TYPES"]}
    tier_labels = {k: v["label"] for k, v in raw["TIERS"].items()}
    tier_defaults = {k: v["moveLimit"] for k, v in raw["TIERS"].items()}

    out: list[Position] = []
    for type_id_str, tiers in raw["POSITIONS"].items():
        # Real types are numeric ('1'..'20'); test scaffolding (e.g. '_dev',
        # Opdrag 2 §6's temporary hold-mode fixture) keeps its string key so
        # it's visibly distinct in reports rather than colliding with a real
        # type number.
        type_id = int(type_id_str) if type_id_str.lstrip("-").isdigit() else type_id_str
        if type_filter is not None and type_id != type_filter:
            continue
        for tier_name, entries in tiers.items():
            for idx, entry in enumerate(entries, start=1):
                move_limit = entry.get("moveLimit", tier_defaults[tier_name])
                out.append(Position(
                    type_id=type_id,
                    type_name=type_names.get(type_id, f"Tipe {type_id}"),
                    tier=tier_name,
                    tier_label=tier_labels.get(tier_name, tier_name),
                    index=idx,
                    fen=entry["fen"],
                    note=entry.get("note", ""),
                    move_limit=move_limit,
                    win_condition=entry.get("winCondition", "mate"),
                    hold_moves=entry.get("holdMoves", move_limit),
                    retired=bool(entry.get("retired", False)),
                ))
    # Sort ints before strs (Python can't compare across types directly) so
    # numeric types list in order, with any string-keyed scaffolding after.
    out.sort(key=lambda p: (
        isinstance(p.type_id, str), p.type_id,
        ["bronze", "silver", "gold"].index(p.tier), p.index,
    ))
    return out


# ─── Tablebase client (cached, rate-limited) ──────────────────────────────

class TablebaseClient:
    def __init__(self, cache_path: Path, enabled: bool):
        self.cache_path = cache_path
        self.enabled = enabled
        self._cache: dict = {}
        self._last_call = 0.0
        self._dirty = False
        if cache_path.exists():
            try:
                self._cache = json.loads(cache_path.read_text())
            except json.JSONDecodeError:
                self._cache = {}

    @staticmethod
    def _key(fen: str) -> str:
        # Compare piece-placement + side-to-move only, matching the C1
        # duplicate-detection convention, so cache hits survive irrelevant
        # FEN field differences (castling/ep/clocks are meaningless for
        # king-and-a-few-pieces endgame positions anyway).
        parts = fen.split()
        return " ".join(parts[:2])

    def save(self):
        if self._dirty:
            self.cache_path.write_text(json.dumps(self._cache, indent=1, sort_keys=True))
            self._dirty = False

    def query(self, fen: str) -> dict | None:
        """Return {'category', 'dtz', 'dtm', 'source': 'tablebase'|'cache'} or None."""
        key = self._key(fen)
        if key in self._cache:
            entry = dict(self._cache[key])
            entry["source"] = "cache"
            return entry
        if not self.enabled or requests is None:
            return None
        wait = TABLEBASE_MIN_INTERVAL_S - (time.monotonic() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        try:
            resp = requests.get(TABLEBASE_URL, params={"fen": fen}, timeout=8)
            self._last_call = time.monotonic()
            if resp.status_code != 200:
                return None
            data = resp.json()
        except Exception:
            return None
        entry = {
            "category": data.get("category"),
            "dtz": data.get("dtz"),
            "dtm": data.get("dtm"),
        }
        self._cache[key] = entry
        self._dirty = True
        result = dict(entry)
        result["source"] = "tablebase"
        return result

    def query_full(self, fen: str) -> dict | None:
        """Full raw tablebase JSON (category/dtz/dtm PLUS the 'moves' list),
        needed for PV-following (Opdrag 6 C7). Cached separately under a
        'full:' prefix so it never collides with query()'s slim cache shape
        -- callers must not call both query() and query_full() for the same
        FEN (that would burn two requests for one answer); pick one per use
        site depending on whether the 'moves' list is actually needed."""
        key = "full:" + self._key(fen)
        if key in self._cache:
            return self._cache[key]
        if not self.enabled or requests is None:
            return None
        wait = TABLEBASE_MIN_INTERVAL_S - (time.monotonic() - self._last_call)
        if wait > 0:
            time.sleep(wait)
        try:
            resp = requests.get(TABLEBASE_URL, params={"fen": fen}, timeout=8)
            self._last_call = time.monotonic()
            if resp.status_code != 200:
                return None
            data = resp.json()
        except Exception:
            return None
        self._cache[key] = data
        self._dirty = True
        return data

    def get_rollout(self, fen: str) -> dict | None:
        """Cached self-play rollout result (Opdrag 3 §4), namespaced with a
        'rollout:' prefix in the same file so it never collides with a
        tablebase entry for the same position."""
        return self._cache.get("rollout:" + self._key(fen))

    def set_rollout(self, fen: str, entry: dict) -> None:
        self._cache["rollout:" + self._key(fen)] = entry
        self._dirty = True


# ─── Engine wrapper ────────────────────────────────────────────────────────

def find_stockfish() -> str:
    for candidate in ("stockfish", "/usr/games/stockfish", "/usr/local/bin/stockfish"):
        found = shutil.which(candidate) or (candidate if Path(candidate).exists() else None)
        if found:
            return found
    raise SystemExit(
        "Kan nie Stockfish vind nie. Installeer dit met 'brew install stockfish' "
        "(macOS) of 'apt install stockfish' (Linux) en probeer weer."
    )


def piece_count(board: chess.Board) -> int:
    return len(board.piece_map())


# ─── Checks ───────────────────────────────────────────────────────────────

def check_c1(pos: Position, board: chess.Board | None, all_keys_seen: dict) -> list[Finding]:
    findings = []
    try:
        board = board or chess.Board(pos.fen)
    except ValueError as exc:
        return [Finding("C1", "ERROR", f"FEN ontleed nie: {exc}")]

    if not board.is_valid():
        status = board.status()
        findings.append(Finding("C1", "ERROR", f"Bord ongeldig (status={status!r})"))
    if board.turn != chess.WHITE:
        findings.append(Finding("C1", "ERROR", "Swart aan die beurt, nie wit nie"))
    for square, piece in board.piece_map().items():
        if piece.piece_type == chess.PAWN:
            rank = chess.square_rank(square)
            if rank in (0, 7):
                findings.append(Finding(
                    "C1", "ERROR",
                    f"Pion op ry {rank + 1} ({chess.square_name(square)}) — pione mag nie op ry 1/8 wees nie",
                ))
    wk = board.king(chess.WHITE)
    bk = board.king(chess.BLACK)
    if wk is not None and bk is not None and chess.square_distance(wk, bk) <= 1:
        findings.append(Finding("C1", "ERROR", "Konings is langs mekaar"))

    key = TablebaseClient._key(pos.fen)
    if key in all_keys_seen:
        findings.append(Finding(
            "C1", "ERROR",
            f"Duplikaat posisie (identies aan {all_keys_seen[key]})",
        ))
    else:
        all_keys_seen[key] = pos.tag

    if not findings:
        findings.append(Finding("C1", "OK", "wettig"))
    return findings


def classify_eval(score: chess.engine.PovScore) -> tuple[str, str]:
    """Return (category, human-readable eval) from White's absolute POV."""
    white_score = score.white()
    if white_score.is_mate():
        mate_in = white_score.mate()
        cat = "WON" if mate_in > 0 else "LOST"
        return cat, f"mat in {abs(mate_in)}"
    cp = white_score.score()
    if cp is None:
        return "ONBEKEND", "geen telling"
    if cp >= CP_WON_THRESHOLD:
        cat = "WON"
    elif cp <= -CP_WON_THRESHOLD:
        cat = "LOST"
    elif abs(cp) < CP_DRAWN_THRESHOLD:
        cat = "DRAWN"
    else:
        cat = "ONSEKER"
    return cat, f"{cp / 100:+.2f}"


def check_c2(pos: Position, board: chess.Board, engine: chess.engine.SimpleEngine,
             tb: TablebaseClient, depth: int) -> tuple[list[Finding], dict]:
    findings = []
    ctx = {}
    n_pieces = piece_count(board)

    tb_result = None
    if n_pieces <= TABLEBASE_MAX_PIECES:
        tb_result = tb.query(pos.fen)

    if tb_result and tb_result.get("category"):
        category = tb_result["category"]
        ctx["source"] = tb_result["source"]
        ctx["tb_category"] = category
        ctx["dtm"] = tb_result.get("dtm")
        ctx["dtz"] = tb_result.get("dtz")

        if pos.win_condition in ("mate", "promote"):
            if category == "win":
                dtm_wm = plies_to_white_moves(tb_result["dtm"]) if tb_result.get("dtm") is not None else None
                findings.append(Finding("C2", "OK", f"tabelbasis: wen (dtm={dtm_wm} wit-skuiwe)"))
            elif category in TABLEBASE_ERROR_CATEGORIES_FOR_MATE:
                extra = ""
                if category == "cursed-win":
                    extra = " — 'n wen slegs na 50+ skuiwe, buite bereik van enige toring in hierdie projek"
                elif category == "blessed-loss":
                    extra = " — 'n verlies wat eers na 50+ skuiwe ontsnap, sonder betekenis binne die skuifgrens"
                findings.append(Finding(
                    "C2", "ERROR",
                    f"tabelbasis: {category.upper()} vir 'n mat-vereiste posisie{extra}",
                ))
            else:
                findings.append(Finding("C2", "WARN", f"onbekende tabelbasis-kategorie: {category}"))
        elif pos.win_condition == "hold":
            if category == "draw":
                findings.append(Finding("C2", "OK", "tabelbasis: gelykspel (hou-vereiste bevredig)"))
            else:
                findings.append(Finding("C2", "ERROR", f"tabelbasis: {category} vir 'n hou-vereiste posisie"))
        return findings, ctx

    # Fallback: Stockfish eval.
    ctx["source"] = "engine"
    info = engine.analyse(board, chess.engine.Limit(depth=depth))
    score = info["score"]
    category, human = classify_eval(score)
    ctx["eval_cp"] = score.white().score(mate_score=100000)
    ctx["eval_human"] = human

    if pos.win_condition in ("mate", "promote"):
        if category == "WON":
            findings.append(Finding("C2", "OK", f"enjin (diepte {depth}): {human}"))
        elif category in ("DRAWN", "LOST"):
            findings.append(Finding(
                "C2", "ERROR",
                f"enjin (diepte {depth}) klassifiseer as {category} ({human}) vir 'n mat-vereiste posisie",
            ))
        else:
            findings.append(Finding(
                "C2", "WARN",
                f"onsekere sone (diepte {depth}): {human} — hersien met die hand",
            ))
    elif pos.win_condition == "hold":
        if category == "DRAWN":
            findings.append(Finding("C2", "OK", f"enjin (diepte {depth}): {human}, gelykspel gehou"))
        else:
            findings.append(Finding(
                "C2", "WARN" if category == "ONSEKER" else "ERROR",
                f"enjin (diepte {depth}) klassifiseer as {category} ({human}) vir 'n hou-vereiste posisie",
            ))
    return findings, ctx


def find_dtm(pos: Position, board: chess.Board, engine: chess.engine.SimpleEngine,
             tb: TablebaseClient, c2_ctx: dict, depth: int,
             time_fallback: float | None) -> tuple[int | None, bool, str]:
    """Return (dtm_in_white_moves, is_upper_bound, source_label).

    Tablebase dtm/dtz come back in plies (half-moves) and are converted
    here via plies_to_white_moves(). Engine mate scores from python-chess
    are already reported in full white-moves (the standard UCI "mate in N"
    convention), so those pass through unconverted.
    """
    if c2_ctx.get("dtm") is not None:
        return plies_to_white_moves(c2_ctx["dtm"]), False, c2_ctx.get("source", "tabelbasis")
    # dtz (>5 men, no native dtm) is NOT a usable DTM proxy: it counts moves
    # to the next zeroing move (capture/pawn push), not moves to mate, and a
    # pawn-race conversion resets it on every push — it would silently
    # under-report the true mate distance by an arbitrary amount. Per spec,
    # 6-7 piece positions without a tablebase dtm fall through to engine
    # search below, same as any position without tablebase access at all.

    info = engine.analyse(board, chess.engine.Limit(depth=depth, time=DEPTH_C3_MAX_SEARCH_S))
    score = info["score"].white()
    if score.is_mate():
        return abs(score.mate()), False, f"enjin diepte {depth}"

    if time_fallback:
        info2 = engine.analyse(board, chess.engine.Limit(time=time_fallback))
        score2 = info2["score"].white()
        if score2.is_mate():
            return abs(score2.mate()), True, f"enjin {time_fallback}s (boonste grens)"

    return None, True, f"enjin diepte {depth} (geen mat gevind nie)"


def pv_scan_promote(board: chess.Board, engine: chess.engine.SimpleEngine,
                     depth: int, time_fallback: float | None) -> int | None:
    """Fast pre-filter (--fast mode only): scan one PV for a white promotion.

    This was the only promote check in Opdrag 1/2 and is intentionally kept
    only as a quick sanity pass now — it under-detects promotions that lie
    outside a single fixed-depth PV (see self_play_rollout for the real
    check used in full runs).
    """
    info = engine.analyse(board, chess.engine.Limit(depth=depth, time=time_fallback))
    pv = info.get("pv", [])
    b = board.copy()
    white_move_no = 0
    for move in pv:
        if b.turn == chess.WHITE:
            white_move_no += 1
            if move.promotion:
                return white_move_no
        b.push(move)
    return None


def _run_rollout_once(fen: str, engine: chess.engine.SimpleEngine) -> int | None:
    board = chess.Board(fen)
    white_move_no = 0
    for _ in range(ROLLOUT_MAX_PLIES):
        is_white = board.turn == chess.WHITE
        if is_white:
            white_move_no += 1
        play_result = engine.play(board, chess.engine.Limit(time=ROLLOUT_MOVETIME_S))
        move = play_result.move
        if move is None:
            return None
        promoted = is_white and move.promotion is not None
        board.push(move)
        if promoted:
            return white_move_no
        # Threefold repetition (e.g. a perpetual-check defence) would otherwise
        # silently burn the entire ply cap with neither side making progress,
        # since movetime-based self-play isn't a real strength guarantee move
        # to move — it's occasionally just unlucky, not evidence the position
        # is unsound. Stop as soon as it's detected rather than grinding on.
        if board.is_checkmate() or board.is_stalemate() or board.is_insufficient_material() \
                or board.can_claim_threefold_repetition():
            return None
    return None


def self_play_rollout(fen: str, engine: chess.engine.SimpleEngine, tb: TablebaseClient) -> int | None:
    """Opdrag 3 §4: Stockfish plays both sides at ROLLOUT_MOVETIME_S/move;
    returns the white-move-number of the first promotion, or None if none
    occurs within ROLLOUT_MAX_PLIES. Cached by FEN (namespaced apart from
    tablebase entries) since one rollout serves any tier's budget check.

    Retries once on a "no promotion" result: movetime-based self-play is not
    fully deterministic (real-time search depth varies with system load), so
    a single non-convergent game (typically a repetition loop that could have
    gone differently under slightly different timing) isn't strong enough
    evidence alone to fail an otherwise-sound position — confirmed directly
    on a real position where one rollout found no promotion in 100 moves and
    a second, fresh rollout promoted cleanly in 2.
    """
    cached = tb.get_rollout(fen)
    if cached is not None:
        return cached.get("promote_at")

    promote_at = _run_rollout_once(fen, engine)
    if promote_at is None:
        promote_at = _run_rollout_once(fen, engine)

    tb.set_rollout(fen, {"promote_at": promote_at})
    return promote_at


def check_c3(pos: Position, board: chess.Board, engine: chess.engine.SimpleEngine,
             tb: TablebaseClient, c2_ctx: dict, depth: int,
             time_fallback: float | None, fast: bool = False) -> list[Finding]:
    if pos.win_condition == "hold":
        return [Finding("C3", "OK", "hou-vereiste — geen DTM-begroting van toepassing nie")]

    if pos.win_condition == "promote":
        if fast:
            promote_move_index = pv_scan_promote(board, engine, depth, time_fallback)
            source = "PV-skandering (--fast)"
        else:
            promote_move_index = self_play_rollout(pos.fen, engine, tb)
            source = "selfspel-uitrol"

        if promote_move_index is None:
            if fast:
                return [Finding("C3", "WARN", "PV bevorder nie binne die soektog nie — hersien met die hand")]
            return [Finding(
                "C3", "ERROR",
                f"{source}: geen bevordering binne {ROLLOUT_MAX_PLIES // 2} wit-skuiwe nie",
            )]
        if promote_move_index > pos.move_limit:
            return [Finding(
                "C3", "ERROR",
                f"{source}: bevordering eers op wit-skuif {promote_move_index}, limiet is {pos.move_limit}",
            )]
        budget = TIER_BUDGET_FRACTION[pos.tier] * pos.move_limit
        if promote_move_index > budget:
            return [Finding(
                "C3", "WARN",
                f"{source}: bevordering op skuif {promote_move_index} oorskry {pos.tier} begroting ({budget:.1f})",
            )]
        return [Finding("C3", "OK", f"{source}: bevorder teen skuif {promote_move_index}")]

    dtm, is_upper_bound, source = find_dtm(pos, board, engine, tb, c2_ctx, depth, time_fallback)
    if dtm is None:
        return [Finding("C3", "WARN", f"kon nie DTM bepaal nie ({source})")]

    label = f"DTM={dtm} ({source}{', boonste grens' if is_upper_bound else ''})"
    if dtm > pos.move_limit:
        return [Finding("C3", "ERROR", f"{label} > skuifgrens {pos.move_limit} — onwenbaar binne limiet")]

    budget = TIER_BUDGET_FRACTION[pos.tier] * pos.move_limit
    if dtm > budget:
        return [Finding(
            "C3", "WARN",
            f"{label} oorskry {pos.tier}-begroting ({budget:.1f} = "
            f"{int(TIER_BUDGET_FRACTION[pos.tier] * 100)}% van {pos.move_limit})",
        )]
    return [Finding("C3", "OK", label)]


def check_c4(pos: Position, board: chess.Board) -> list[Finding]:
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return [Finding("C4", "OK", "geen wettige skuiwe (reeds mat/pat aan die begin?)")]

    stalemating_sans = []
    for move in legal_moves:
        san = board.san(move)  # must compute before push (SAN needs the pre-move board)
        board.push(move)
        if board.is_stalemate():
            stalemating_sans.append(san)
        board.pop()

    n_stalemating = len(stalemating_sans)
    n_legal = len(legal_moves)
    fraction = n_stalemating / n_legal
    detail = f"{n_stalemating}/{n_legal} skuiwe gee onmiddellike pat"
    if stalemating_sans:
        detail += f" ({', '.join(stalemating_sans)})"

    if fraction > STALEMATE_ERROR_FRACTION:
        return [Finding("C4", "ERROR", f"pat-mynveld — {detail}")]
    if n_stalemating > 0:
        return [Finding("C4", "WARN", detail)]
    return [Finding("C4", "OK", "geen pat-gevaar in een skuif")]


def check_c5(pos: Position, board: chess.Board, engine: chess.engine.SimpleEngine,
             depth: int) -> list[Finding]:
    if pos.type_id not in THEMATIC_TYPES:
        return []

    winning_sans = []
    for move in board.legal_moves:
        san = board.san(move)
        board.push(move)
        info = engine.analyse(board, chess.engine.Limit(depth=depth))
        score = info["score"].white()
        board.pop()
        if score.is_mate():
            winning = score.mate() > 0
        else:
            cp = score.score()
            winning = cp is not None and cp > THEMATIC_WINNING_CP
        if winning:
            winning_sans.append(san)

    n_winning = len(winning_sans)
    detail = f"{n_winning} wen-skuiwe: {', '.join(winning_sans)}"
    if n_winning >= THEMATIC_WARN_AT:
        return [Finding("C5", "WARN", f"tema is dekoratief — {detail}")]
    if n_winning == 0:
        return [Finding("C5", "WARN", f"geen skuif behou 'n wen-evaluasie nie (diepte {depth}) — hersien")]
    return [Finding("C5", "OK", detail)]


# ─── C5-strict + C7 (Opdrag 6) ──────────────────────────────────────────────
# Tablebase-exact hardening for the K+P family. Sign convention throughout:
# a tablebase top-level 'category' is ALWAYS relative to whoever is to move
# in the queried position -- never an absolute white/black result. Every
# helper below that talks about "white winning" converts explicitly.

def normalize_category(cat: str | None) -> str | None:
    """Fold the 50-move-rule-qualified categories into their eventual
    outcome, matching this app's convention of disabling the 50-move rule
    everywhere (see CLAUDE.md, Engine Behaviour) -- a 'cursed-win' is a real
    win in actual play here, a 'blessed-loss' a real loss."""
    if cat in ("win", "cursed-win"):
        return "win"
    if cat in ("loss", "blessed-loss"):
        return "loss"
    if cat == "draw":
        return "draw"
    return None


def absolute_result_for_white(cat: str | None, side_to_move_is_white: bool) -> str | None:
    """Convert a side-to-move-relative category to an absolute white result."""
    norm = normalize_category(cat)
    if norm is None:
        return None
    if side_to_move_is_white:
        return norm
    return {"win": "loss", "loss": "win", "draw": "draw"}[norm]


def flip_fen_turn(fen: str) -> str:
    parts = fen.split()
    parts[1] = "b" if parts[1] == "w" else "w"
    return " ".join(parts)


def classify_move_for_white(board: chess.Board, move: chess.Move, tb: TablebaseClient) -> str | None:
    """After `move` (board.turn is the mover), returns 'win'/'draw'/'loss'
    from the ABSOLUTE white perspective, via tablebase lookup of the
    resulting position."""
    b2 = board.copy()
    b2.push(move)
    entry = tb.query(b2.fen())
    if entry is None:
        return None
    return absolute_result_for_white(entry.get("category"), b2.turn == chess.WHITE)


def is_natural_forward_move(board: chess.Board, move: chess.Move) -> bool:
    """A 'natural' move a child would instinctively try: a WHITE KING move
    that does not retreat -- distance to black's king or to the promotion
    square of white's most-advanced pawn stays the same or improves. Non-
    king moves are never 'natural' in this sense -- the zugzwang lesson is
    specifically that the obvious KING approach also loses.

    Deliberately non-strict (<=, not <): in a tightly-constrained position
    every LEGAL king move can be a genuine retreat by strict distance, while
    the naive try a child actually makes is often one that merely holds its
    ground (e.g. staying equidistant, still centralised) rather than one
    that measurably closes the gap. Verified against T9 Silver #1 ("the
    gem"): under strict decrease, Kc5 (the sole winner) is the only
    qualifying move at all and no losing alternative registers as
    "natural" -- but Ke4, which keeps the SAME king-distance instead of
    retreating, is exactly the tempting centralising try a child would
    reach for, and it loses. <= correctly captures that without also
    passing genuine retreats (Kc3/Kd3/Ke3 all strictly worsen both
    distances there and stay excluded)."""
    piece = board.piece_at(move.from_square)
    if piece is None or piece.piece_type != chess.KING or piece.color != chess.WHITE:
        return False
    bk = board.king(chess.BLACK)
    if bk is None:
        return False
    dist_before_king = chess.square_distance(move.from_square, bk)
    dist_after_king = chess.square_distance(move.to_square, bk)
    if dist_after_king <= dist_before_king:
        return True
    white_pawns = [sq for sq, p in board.piece_map().items()
                   if p.piece_type == chess.PAWN and p.color == chess.WHITE]
    if not white_pawns:
        return False
    # Most-advanced white pawn (closest to rank 8) is "the" promoting pawn
    # for this family (T6/8/9/10 positions carry at most one live runner).
    lead_pawn = max(white_pawns, key=lambda sq: chess.square_rank(sq))
    promo_sq = chess.square(chess.square_file(lead_pawn), 7)
    dist_before_promo = chess.square_distance(move.from_square, promo_sq)
    dist_after_promo = chess.square_distance(move.to_square, promo_sq)
    return dist_after_promo <= dist_before_promo


def check_c5_strict(pos: Position, board: chess.Board, tb: TablebaseClient) -> list[Finding]:
    cfg = C5_STRICT_CONFIG.get(pos.type_id)
    if cfg is None:
        return []

    winning, losing_natural, losing_other, unknown = [], [], [], []
    for move in board.legal_moves:
        san = board.san(move)
        result = classify_move_for_white(board, move, tb)
        if result is None:
            unknown.append(san)
            continue
        if result == "win":
            winning.append(san)
        else:
            (losing_natural if is_natural_forward_move(board, move) else losing_other).append(san)

    if unknown:
        return [Finding("C5S", "WARN", f"tabelbasis kon {len(unknown)} skuif/skuiwe nie klassifiseer nie: {', '.join(unknown)}")]

    n_winning = len(winning)
    if n_winning == 0:
        return [Finding("C5S", "ERROR", "geen wen-skuif gevind nie volgens tabelbasis — posisie is nie eintlik 'n wen nie")]
    if n_winning > cfg["max_winning"]:
        return [Finding("C5S", "ERROR",
                         f"{n_winning} wen-skuiwe ({', '.join(winning)}) > drempel {cfg['max_winning']} — tema is dekoratief")]
    if cfg["require_natural_fail"] and not losing_natural:
        return [Finding("C5S", "WARN",
                         "geen natuurlike (koning-vorentoe) skuif faal nie — die les leer niks, net skerp waaksaamheid teen flaters")]

    detail = f"{n_winning} wen-skuif/skuiwe: {', '.join(winning)}"
    if losing_natural:
        detail += f"; natuurlike faal-skuif/skuiwe: {', '.join(losing_natural)}"
    return [Finding("C5S", "OK", detail)]


def tablebase_pv_rank(move_entry: dict) -> tuple:
    """Rank a tablebase 'moves' entry for picking White's best continuation.
    move_entry's category/dtz/dtm are relative to the side to move AFTER the
    move (i.e. Black, if White just moved) -- so the best move for White is
    the one worst for that opponent: category='loss' first, then smallest
    |dtm| (moves-to-mate, when available).

    dtz is NOT a usable tie-break here (same pitfall documented at this
    file's top for find_dtm): it counts moves to the next zeroing event
    (capture/pawn push), not moves to mate, so a slow king shuffle with
    dtz=-2 can rank as "better" than an immediate promotion with dtz=-8
    even though the promotion is actually four times faster by dtm (-8 vs
    -12) -- greedily minimising |dtz| both picks the objectively slower
    move AND, worse, can cycle forever through king shuffles that never
    make zeroing progress (observed directly: a real PV construction stuck
    in an 8-ply repeating loop because dtz doesn't strictly decrease
    without a zeroing move). dtm decreases monotonically along any genuine
    mating line, so it can't produce that cycle. Only fall back to dtz when
    dtm is absent (positions past Gaviota's piece-count ceiling)."""
    cat = normalize_category(move_entry.get("category"))
    cat_rank = {"loss": 0, "draw": 1, "win": 2}.get(cat, 3)
    dtm = move_entry.get("dtm")
    if dtm is not None:
        return (cat_rank, 0, abs(dtm))
    dtz = move_entry.get("dtz")
    return (cat_rank, 1, abs(dtz) if dtz is not None else 999)


def tablebase_optimal_pv(fen: str, tb: TablebaseClient, max_plies: int = C7_MAX_PV_PLIES) -> list[dict]:
    """Follow the tablebase's own top move from `fen` until promotion, mate,
    stalemate, or max_plies. Entirely engine-free -- the tablebase IS the
    authority for these small K+P-family positions. Returns a list of
    {ply, fen_before, white_to_move, move_uci, move_san}."""
    pv = []
    board = chess.Board(fen)
    for ply in range(max_plies):
        if board.is_game_over():
            break
        cur_fen = board.fen()
        data = tb.query_full(cur_fen)
        if not data or not data.get("moves"):
            break
        best = min(data["moves"], key=tablebase_pv_rank)
        try:
            move = chess.Move.from_uci(best["uci"])
        except ValueError:
            break
        san = board.san(move)
        pv.append({
            "ply": ply, "fen_before": cur_fen,
            "white_to_move": board.turn == chess.WHITE,
            "move_uci": best["uci"], "move_san": san,
        })
        board.push(move)
        if move.promotion:
            break
    return pv


def check_c7(pos: Position, board: chess.Board, tb: TablebaseClient) -> tuple[list[Finding], dict | None]:
    """Type 10 only: certify real reciprocal-zugzwang-based triangulation.
    Returns (findings, detail_dict_or_None) -- detail_dict carries the X
    square-pair tablebase JSON and the extracted triangle cycle, consumed by
    the report generator for criterion 3's table."""
    if pos.type_id != 10:
        return [], None

    pv = tablebase_optimal_pv(pos.fen, tb)
    if not pv:
        return [Finding("C7", "ERROR", "tabelbasis-PV kon nie gebou word nie")], None

    black_to_move_indices = [i for i, p in enumerate(pv) if not p["white_to_move"]]

    for x_idx in black_to_move_indices:
        x_fen = pv[x_idx]["fen_before"]
        x_placement = x_fen.split(" ", 1)[0]

        entry_black = tb.query(x_fen)  # X as actually visited: black to move
        if entry_black is None:
            continue
        abs_black_to_move = absolute_result_for_white(entry_black.get("category"), False)
        if abs_black_to_move != "win":
            continue  # shouldn't happen on a winning PV, but be defensive

        flipped_fen = flip_fen_turn(x_fen)
        entry_white = tb.query(flipped_fen)  # X hypothetically with white to move
        if entry_white is None:
            continue
        abs_white_to_move = absolute_result_for_white(entry_white.get("category"), True)
        if abs_white_to_move != "draw":
            continue  # no value-flip here -- not reciprocal zugzwang

        # Found X. Now find an earlier point where WHITE'S KING occupied the
        # same square it's on at X -- the triangle it walks away from and
        # back to. Deliberately NOT a full-board match: if X-with-white-to-
        # move is a genuine draw (just confirmed above), no winning PV can
        # ever visit that exact full position with white to move -- doing so
        # would make the continuation from there drawn too, contradicting an
        # overall win. A full-board anchor match is therefore a logical
        # impossibility on any real winning line, not just a rare event
        # (confirmed empirically: 0/184 across three independent candidate
        # sweeps once the DTM-ranking fix ruled out cycling as the cause).
        # White's king alone returning to a square -- while black's pieces
        # are NOT in the same place they were (black failed to mirror) -- is
        # the achievable, and correct, reading of "returning to a previously
        # occupied square...while black's king...cannot."
        x_board = chess.Board(x_fen)
        x_wk_square = x_board.king(chess.WHITE)
        anchor_idx = None
        for j in range(x_idx - 1, -1, -1):
            if not pv[j]["white_to_move"]:
                continue
            j_board = chess.Board(pv[j]["fen_before"])
            if j_board.king(chess.WHITE) != x_wk_square:
                continue
            # Black must NOT have mirrored back to its own earlier square --
            # otherwise this isn't "black forced to a mirror with fewer
            # squares... cannot", it's black successfully mirroring too.
            if j_board.king(chess.BLACK) == x_board.king(chess.BLACK):
                continue
            anchor_idx = j
            break
        if anchor_idx is None:
            continue  # X is genuine reciprocal zugzwang, but this PV doesn't cycle through it

        cycle_sans = [pv[k]["move_san"] for k in range(anchor_idx, x_idx)]
        detail = {
            "x_fen_black_to_move": x_fen,
            "x_tablebase_black_to_move": entry_black,
            "x_fen_white_to_move": flipped_fen,
            "x_tablebase_white_to_move": entry_white,
            "anchor_fen": pv[anchor_idx]["fen_before"],
            "cycle_sans": cycle_sans,
        }
        finding = Finding(
            "C7", "OK",
            f"driehoek gevind: anker ply{anchor_idx} -> X ply{x_idx} via {' '.join(cycle_sans)}; "
            f"X (swart-aan-beurt)=win, X (wit-aan-beurt)=draw",
        )
        return [finding], detail

    return [Finding("C7", "ERROR", "geen wederkerige zugzwang met driehoek-siklus gevind in die optimale lyn nie")], None


NOTE_MOVE_RE = None  # compiled lazily below to keep the regex near its docs


def _compile_note_move_re():
    import re
    # Matches tokens like 'Kc6!', 'Td4!', '1.b6!', 'Qxh1#!' — an optional
    # move number, optional (Afrikaans-or-English) piece letter, optional
    # capture 'x', destination square, optional promotion/check marks, and
    # a mandatory trailing '!' (every genuine "do this!" recommendation in
    # positions.js notes is emphasised this way; this is what distinguishes
    # a move recommendation from an incidental two-letter word fragment).
    return re.compile(
        r"(?:\d+\.)?(?P<piece>[KQDTLRNB])?(?P<capture>x)?"
        r"(?P<dest>[a-h][1-8])(?:=(?P<promo>[KQDTLRNB]))?(?P<suffix>[+#]?)!"
    )


def check_c6(pos: Position, board: chess.Board, engine: chess.engine.SimpleEngine) -> list[Finding]:
    global NOTE_MOVE_RE
    if NOTE_MOVE_RE is None:
        NOTE_MOVE_RE = _compile_note_move_re()

    m = NOTE_MOVE_RE.search(pos.note)
    if not m:
        return [Finding("C6", "OK", "geen SAN-agtige skuif in die notas nie")]

    piece_letter = m.group("piece")
    dest_name = m.group("dest")
    dest_sq = chess.parse_square(dest_name)
    expected_piece_type = NOTE_PIECE_LETTER_MAP.get(piece_letter, chess.PAWN)

    candidates = [
        mv for mv in board.legal_moves
        if mv.to_square == dest_sq
        and board.piece_type_at(mv.from_square) == expected_piece_type
    ]

    token = m.group(0)
    if not candidates:
        return [Finding(
            "C6", "WARN",
            f"nota beveel '{token}' aan, maar dit is nie 'n wettige skuif nie",
        )]
    if len(candidates) > 1:
        return [Finding(
            "C6", "WARN",
            f"nota beveel '{token}' aan — dubbelsinnig ({len(candidates)} kandidate), kon nie verifieer nie",
        )]

    move = candidates[0]
    san = board.san(move)
    board.push(move)
    is_stalemate = board.is_stalemate()
    info = engine.analyse(board, chess.engine.Limit(depth=20))
    score_after = info["score"].white()
    board.pop()

    if is_stalemate:
        return [Finding("C6", "WARN", f"nota beveel '{token}' ({san}) aan — dit is 'n ONMIDDELLIKE PAT")]

    if score_after.is_mate():
        dropped = score_after.mate() < 0
    else:
        cp = score_after.score()
        dropped = cp is not None and cp < NOTE_MOVE_MIN_CP_AFTER
    if dropped:
        return [Finding(
            "C6", "WARN",
            f"nota beveel '{token}' ({san}) aan, maar evaluasie val onder +{NOTE_MOVE_MIN_CP_AFTER}cp daarna",
        )]
    return [Finding("C6", "OK", f"nota se skuif '{token}' ({san}) is wettig en gesond")]


# ─── Orchestration ─────────────────────────────────────────────────────────

def run_checks(pos: Position, engine: chess.engine.SimpleEngine, tb: TablebaseClient,
                seen_keys: dict, args) -> PositionResult:
    result = PositionResult(position=pos)

    c1 = check_c1(pos, None, seen_keys)
    result.findings.extend(c1)
    if any(f.level == "ERROR" for f in c1):
        # Board isn't usable for the rest — stop here for this position.
        return result

    if pos.retired:
        # Opdrag 3: retired positions stay in the audit trail and keep
        # passing C1 legality, but are never graded on theory/budget/theme —
        # they're not served, so C2-C6 findings about them are noise.
        result.findings.append(Finding("RETIRED", "OK", "afgetree — C2-C6 oorgeslaan"))
        return result

    board = chess.Board(pos.fen)

    c2_findings, c2_ctx = check_c2(pos, board, engine, tb, args.depth_c2)
    result.findings.extend(c2_findings)

    c3_findings = check_c3(pos, board, engine, tb, c2_ctx, args.depth_c3, args.time_c3, fast=args.fast)
    result.findings.extend(c3_findings)

    result.findings.extend(check_c4(pos, board))

    if pos.type_id in C5_STRICT_CONFIG:
        result.findings.extend(check_c5_strict(pos, board, tb))
    elif not args.fast:
        result.findings.extend(check_c5(pos, board, engine, args.depth_c5))

    if pos.type_id == 10:
        c7_findings, c7_detail = check_c7(pos, board, tb)
        result.findings.extend(c7_findings)
        if c7_detail is not None:
            result.extra["c7"] = c7_detail

    result.findings.extend(check_c6(pos, board, engine))

    return result


def apply_fast_mode(args):
    if args.fast:
        args.depth_c2 = 20
        args.depth_c3 = 20
        args.time_c3 = None
        args.depth_c5 = 0  # unused, C5 skipped entirely
    else:
        args.depth_c2 = DEPTH_C2
        args.depth_c3 = DEPTH_C3
        args.time_c3 = DEPTH_C3_TIME_FALLBACK
        args.depth_c5 = DEPTH_C5


# ─── Reporting ─────────────────────────────────────────────────────────────

def print_progress_line(result: PositionResult):
    pos = result.position
    verdict = result.verdict
    # flush explicitly: stdout is fully buffered (not line-buffered) once
    # redirected to a file/pipe, and these runs take minutes — silence
    # would otherwise look like a hang until the process exits.
    print(f"{pos.tag:<20} | {verdict:<5} | {result.summary()}", flush=True)


def print_totals(results: list[PositionResult], elapsed_s: float):
    active = [r for r in results if not r.position.retired]
    retired = [r for r in results if r.position.retired]
    n_ok = sum(1 for r in active if r.verdict == "OK")
    n_warn = sum(1 for r in active if r.verdict == "WARN")
    n_error = sum(1 for r in active if r.verdict == "ERROR")
    retired_errors = sum(1 for r in retired if r.verdict == "ERROR")
    print()
    print("─" * 60)
    print(f"Totaal: {len(results)} posisies | Aktief: {len(active)} · Afgetree: {len(retired)}")
    print(f"Aktief — OK={n_ok}  WARN={n_warn}  ERROR={n_error}")
    if retired_errors:
        print(f"⚠️  {retired_errors} afgetree posisie(s) faal C1-wettigheid — dit moet reggemaak word")
    print(f"Verlope tyd: {elapsed_s:.1f}s")
    print("─" * 60)


def write_report(results: list[PositionResult], args, engine_version: str):
    lines = []
    now = time.strftime("%Y-%m-%d %H:%M:%S")
    active = [r for r in results if not r.position.retired]
    retired = [r for r in results if r.position.retired]
    n_ok = sum(1 for r in active if r.verdict == "OK")
    n_warn = sum(1 for r in active if r.verdict == "WARN")
    n_error = sum(1 for r in active if r.verdict == "ERROR")
    retired_errors = sum(1 for r in retired if r.verdict == "ERROR")

    lines.append("# Verifikasieverslag — Skaakmat Afrigter posisies.js")
    lines.append("")
    lines.append(f"- Gegenereer: {now}")
    lines.append(f"- Enjin: {engine_version}")
    lines.append(
        f"- Diepte-instellings: C2={args.depth_c2}, C3={args.depth_c3}"
        f"{f'+{args.time_c3}s' if args.time_c3 else ''}, "
        f"C5={'oorgeslaan (--fast)' if args.fast else args.depth_c5}"
    )
    lines.append(f"- Modus: {'--fast' if args.fast else 'volledig'}"
                  f"{', --no-net' if args.no_net else ''}"
                  f"{f', --type {args.type}' if args.type else ''}")
    lines.append(f"- Totaal: {len(results)} posisies | Aktief: {len(active)} · Afgetree: {len(retired)}")
    lines.append(f"- Aktief — OK={n_ok} WARN={n_warn} ERROR={n_error}")
    if retired_errors:
        lines.append(f"- ⚠️ {retired_errors} afgetree posisie(s) faal C1-wettigheid")
    lines.append("")

    def table(rows, heading):
        if not rows:
            return []
        out = [f"## {heading} ({len(rows)})", "",
               "| Tipe | Pos | FEN | Uitspraak | Besonderhede |",
               "|---|---|---|---|---|"]
        for r in rows:
            fen_escaped = r.position.fen.replace("|", "\\|")
            details = r.summary().replace("|", "\\|")
            out.append(
                f"| {r.position.type_name} (T{r.position.type_id}) "
                f"| {r.position.tier_label} #{r.position.index} "
                f"| `{fen_escaped}` | {r.verdict} | {details} |"
            )
        out.append("")
        return out

    lines += table([r for r in active if r.verdict == "ERROR"], "ERRORS")
    lines += table([r for r in active if r.verdict == "WARN"], "WARNINGS")

    ok_rows = [r for r in active if r.verdict == "OK"]
    if ok_rows:
        lines.append(f"<details><summary>OK ({len(ok_rows)}) — saamgevou</summary>")
        lines.append("")
        lines += table(ok_rows, "OK")[2:]  # skip heading/count line
        lines.append("</details>")
        lines.append("")

    if retired:
        lines.append(f"<details><summary>AFGETREE ({len(retired)}) — saamgevou</summary>")
        lines.append("")
        lines += table(retired, "AFGETREE")[2:]  # skip heading/count line
        lines.append("</details>")
        lines.append("")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


# ─── CLI ───────────────────────────────────────────────────────────────────

def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--type", type=int, default=None, help="Verifieer net hierdie tipe-nommer (1-20)")
    p.add_argument("--fast", action="store_true", help="Slaan C5 oor, vlakker soektogte — vir vinnige iterasie")
    p.add_argument("--no-net", action="store_true", help="Moet nooit die tabelbasis-API bel nie")
    p.add_argument("--positions", type=Path, default=POSITIONS_JS, help="Pad na positions.js")
    return p


def main(argv=None) -> int:
    # Force line-buffering even when stdout is redirected to a file/pipe
    # (its default becomes fully-buffered off a TTY), so progress prints as
    # it happens instead of arriving in one burst at the end.
    sys.stdout.reconfigure(line_buffering=True)

    args = build_arg_parser().parse_args(argv)
    apply_fast_mode(args)

    raw = extract_raw_data(args.positions)
    positions = flatten_positions(raw, args.type)
    if not positions:
        print(f"Geen posisies gevind nie (type filter={args.type})", file=sys.stderr)
        return 1

    stockfish_path = find_stockfish()
    tb = TablebaseClient(TB_CACHE_PATH, enabled=not args.no_net)

    print(f"Stockfish: {stockfish_path}")
    print(f"Posisies: {len(positions)} | modus: {'--fast' if args.fast else 'volledig'}"
          f"{' --no-net' if args.no_net else ''}{f' --type {args.type}' if args.type else ''}")
    print("─" * 60)

    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    engine_version = "onbekend"
    try:
        engine_version = engine.id.get("name", "onbekend")
        seen_keys: dict = {}
        results = []
        start = time.monotonic()
        for i, pos in enumerate(positions, start=1):
            result = run_checks(pos, engine, tb, seen_keys, args)
            results.append(result)
            print_progress_line(result)
            if i % 10 == 0:
                tb.save()
        elapsed = time.monotonic() - start
    finally:
        engine.quit()
        tb.save()

    print_totals(results, elapsed)
    write_report(results, args, engine_version)
    print(f"Verslag geskryf na: {REPORT_PATH.relative_to(REPO_ROOT)}")

    return 1 if any(r.verdict == "ERROR" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
