// All tunable numbers (CLAUDE.md section 15).
export const TOP2_TOLERANCE_CP = 30;
export const BLACK_ENGINE_DEPTH = 5; // was 6 until 30 Oct: a smidge easier
export const BLACK_MULTIPV = 3;
export const BLACK_WINDOW_CP = 50; // a Black candidate this close to the best is "safe"
export const ANALYSIS_DEPTH = 14;
export const ANALYSIS_MAX_MS = 2500;
export const ANALYSIS_MIN_DEPTH = 10;
export const FINAL_EVAL_DEPTH = 16;
export const GOLD_EVAL = 1.0; // pawns
export const POINT_BANDS_CP = [25, 60, 120] as const;
// Target choice (section 8). Gold lines keep returning (15% of rounds once some are gold) so the game
// never runs dry; new lines come in by tier (data.ts tierOf), softly, never shut.
export const CLASS_ODDS = { grey: 0.6, green: 0.25, gold: 0.15 } as const;
export const TIER_FLOOR = { 1: 1, 2: 0.35, 3: 0.3, 4: 0.08 } as const; // weight of a tier's new lines at the start
export const TIER_NEED = { 1: 1, 2: 0.4, 3: 0.5, 4: 0.6 } as const;    // share of the easier tiers green for full weight
export const TIER_REPEAT = 0.5; // a tier that gave the last two targets gets half weight (interleaving)
export const FAMOUS_WEIGHT = 3;
export const RECENT_EXCLUDE = 2;
export const MOVES_PER_ROUND = 20;
export const STEAM_SMOOTHING = 0.5; // the eval series on the round-end graph
export const MATE_CP = 10000;
export const THINK_MIN_MS = 400;
export const THINK_MAX_MS = 900;

// Stoomdruk = pressure of his last move (section 9): what Black would lose by skipping his move.
export const PRESS_DEPTH = 12;      // open sea: both searches (real and null move) at this depth
export const PRESS_MAX_MS = 1200;
export const PRESS_CHECK = 1.5;     // pawns: a check is a question Black must answer (null move is illegal)
// Calibrated on open-sea play (28 Oct, 360 simulated games): about 10% of club moves read cold,
// 20% amber, 40% green and 30% gold. A quiet move in a quiet Italian is about 0.2; attacking a piece is 3+.
export const PRESS_ZONES = { amber: 0.5, green: 1.1, gold: 3.5 } as const; // pawns; below amber = cold
export const PRESS_FULL = 6.0;      // pawns: the needle reaches the right-hand tick (2)

// Pressure-sensitive Black (section 5): Black cracks where the road is narrow.
// Simulated (28 Oct): gold rate for a pressing / a quiet club White went from 13% / 17% (no cracks)
// to 38% / 28% at 0.3, and 43% / 30% at 0.5. So 0.3 makes pressure pay; raise it for an easier sea.
export const CRACK_P = 0.3;         // chance Black misses its only safe move...
export const CRACK_MIN_PRESS = 0.8; // ...when his last move asked at least this much (or gave check)
export const CRACK_REAL_CP = 50;    // the Captain only names a crack that really cost Black this much (depth 14)
export const CRACK_KEEP_CP = 60;    // he "caught" the crack if his reply lost at most this much

// "Wat het jou pion gekoop?" checkpoints (section 9a), asked only while he has a pawn invested.
// Thresholds calibrated on 217 canon positions (moves 9 to 17, White a pawn or more down).
export const CHECK_PLIES = [16, 24, 32] as const; // before his 9th, 13th and 17th moves
export const CHECK_DEV_LEAD = 1;    // "tyd": at least one more piece in play than Black
export const CHECK_MOB_LEAD = 8;    // "lyne": at least 8 more legal moves than Black
export const CHECK_NOTHING_CP = -70; // "niks meer nie" is the right answer only when the engine agrees (eval <= -0.7)
// ...and never while he is fighting for his life (in check, at -1.5 or worse, or with only one move that
// doesn't lose 1.5 pawns, which includes a forced take-back). Then the question waits for a calm moment,
// at most CHECK_DEFER_PLIES later, or is skipped. In master positions about 1 checkpoint moment in 7 is a fight.
export const CHECK_CALM_EVAL = -150;   // centipawns
export const CHECK_ONLY_MOVE_CP = 150; // best move minus second best, centipawns
export const CHECK_DEFER_PLIES = 4;    // two of his moves

// Die Spookskip (section 11a): shown once, after this many finished rounds; always available from the lesson popup.
export const GHOST_AFTER_ROUNDS = 3;

// No cheering for a move he had to play (section 12): if the best move was the only one that doesn't lose
// FORCED_GAP_CP (or the only legal move), a good move still scores its points, but the Captain says FORCED
// instead of the usual praise; RESCUE when he was also in trouble (best eval at RESCUE_EVAL_CP or worse).
export const FORCED_GAP_CP = 150;   // the same idea as CHECK_ONLY_MOVE_CP
export const RESCUE_EVAL_CP = -150;

// Toernooi mode (since 30 Oct): only the four Evans moves are set, then it's open play, moves 5 to 20 scored.
// No aids on the screen (no needle, no Captain, no points until the end); the Kelpwoud is untouched.
export const TOERNOOI_WOBBLE_P = 0.1;     // about once in 10 moves Black plays a random, not quite catastrophic move...
export const WOBBLE_MIN_CP = 50;          // ...one that costs it at least half a pawn
export const WOBBLE_MAX_CP = 150;         // ...and at most a pawn and a half
export const WOBBLE_MULTIPV = 8;          // candidates searched when Black wobbles
export const PERFECT_FROM_PLY = 31;       // after White's 16th move...
export const PERFECT_EVAL_CP = 300;       // ...if White is this far ahead, Black plays its best to the end (no slips)
export const PERFECT_DEPTH = 12;
export const PERFECT_MAX_MS = 4000;
export const TOERNOOI_BONUS = 10;         // final eval at GOLD_EVAL or better
export const TOERNOOI_BONUS_MATE = 20;    // he gave checkmate (plus 4 for every unplayed move, as in verkenning)
