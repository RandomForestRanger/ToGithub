// Main game state hook — orchestrates the full game loop.
//
// Game phases (string enum):
//   'idle'            — not started yet
//   'player_turn'     — waiting for White's move
//   'scoring'         — computing score (Giacomo shows thinking face)
//   'explanation'     — ExplanationModal open, waiting for player's answer
//   'popup'           — MovePopup visible (auto-dismisses after 2.5s)
//   'black_thinking'  — computing Black's reply
//   'black_moving'    — Black's move animating (800ms)
//   'game_over'       — game ended
//
// Sequence per White move:
//   player_turn → [click] → scoring → [async 0-8s] →
//   explanation? → popup → black_thinking → black_moving → player_turn
//
// Important: capture FEN and history SYNCHRONOUSLY before any async call.
// Never read game.turn() inside a .then() — see CLAUDE.md pitfall #1.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { scoreWhiteMove, getEngineHintMove, evalFen, sanToSquares, uciToSquares } from '../data/scoringRules.js';
import { detectLayerComplete, getTreeHintMove, detectNewMidgamePanel } from '../data/openingTree.js';
import { selectBlackMove, rollTrap, checkTrapTrigger } from '../engine/moveSelector.js';
import { getGiacomoLine, scoreToExpression, LAYER_ANNOUNCEMENTS, MIDGAME_PANELS, getRandomItalyFact } from '../data/giacomoLines.js';

export const PHASES = {
  IDLE:           'idle',
  PLAYER_TURN:    'player_turn',
  SCORING:        'scoring',
  EXPLANATION:    'explanation',
  POPUP:          'popup',
  BLACK_THINKING: 'black_thinking',
  BLACK_MOVING:   'black_moving',
  GAME_OVER:      'game_over',
};

const MAX_WHITE_MOVES = 50;
const MAX_SCORE       = MAX_WHITE_MOVES * 4; // 200
const POPUP_DURATION  = 7500;
const BLACK_MOVE_DELAY    = 800;
const BLACK_THINK_MIN     = 10000; // minimum thinking pause before Black moves
const BLACK_THINK_MAX     = 20000; // maximum thinking pause
const BLACK_THINK_CUTOFF  = 40;    // no artificial delay after this move number
const GAME_OVER_LINGER    = 5000;  // board stays visible this long after game ends
const MATE_BONUS      = 50;

export function useGame({ onBadgeUnlock, onGameEnd, explanationsAnswered = 0 } = {}) {
  // chess.js instance — mutated in place, wrapped in ref to survive renders
  const gameRef = useRef(new Chess());

  // UI state
  const [position,       setPosition]       = useState(gameRef.current.fen());
  const [phase,          setPhase]           = useState(PHASES.IDLE);
  const [selectedSquare, setSelectedSquare]  = useState(null);
  const [legalSquares,   setLegalSquares]    = useState([]); // destination squares to highlight
  const [lastMove,       setLastMove]        = useState(null); // {from, to}

  // Progress state
  const [whiteMovesPlayed, setWhiteMovesPlayed] = useState(0);
  const [totalScore,       setTotalScore]        = useState(0);
  const [moveLog,          setMoveLog]            = useState([]); // for PostGame + badge ctx
  const [layerStatus,      setLayerStatus]        = useState(0);
  const [variationName,    setVariationName]      = useState(null);
  const [variationsHit,    setVariationsHit]      = useState(new Set());
  const [consecutivePerfect, setConsecutivePerfect] = useState(0);

  // Trap tracking
  const trapConfigRef = useRef(null);
  const [trapEscaped, setTrapEscaped] = useState(false);
  const [trapKey,     setTrapKey]     = useState(null);

  // Popup / modal content
  const [popupData,      setPopupData]      = useState(null);
  const [explanationData, setExplanationData] = useState(null);

  // Lingering best-move suggestion (shown after popup dismisses until next move)
  const [lastBestMove, setLastBestMove] = useState(null);

  // Game over
  const [gameOverReason, setGameOverReason] = useState(null);
  const [mateDelivered,  setMateDelivered]  = useState(false);

  // Take-back — one use per game
  const [undoUsed, setUndoUsed] = useState(false);

  // Hint system
  const [hintTreeMove,   setHintTreeMove]   = useState(null); // {from,to} | null
  const [hintEngineMove, setHintEngineMove] = useState(null); // {from,to} | null
  const [hintLoading,    setHintLoading]    = useState(false);
  const [hintUsed,       setHintUsed]       = useState(false);
  const [hintActive,     setHintActive]     = useState(false);
  const hintPenaltyRef = useRef(false); // captured synchronously before async scoring

  // Dynamic difficulty: updated after each Black move via background eval
  // 'fighting' → depth 15 (Black clamps down when White is up 5+), permanent once set
  // 'coasting' → depth 5  (Black eases off when Black is up 5+), resets if White reaches +5
  // null       → use normal depth schedule
  const blackModeRef = useRef(null);

  // Scheduled imperfections: rolled once per game
  // suboptimalAt (15–20): Black plays 3rd-best move that turn
  // randomAt     (20–25): Black plays a random legal move that turn
  const imperfectionsRef  = useRef(null);
  const trapEvaluatedRef  = useRef(false); // true after the first White move following a trap move
  const announcedPanelsRef = useRef(new Set()); // tracks which mid-game panels have fired
  const popupTimerRef = useRef(null);    // cancelable handle for the popup auto-dismiss
  const popupAfterRef = useRef(null);    // { isCheckmate, isGameOver } captured for early dismiss

  // Internal: data pending while explanation modal is open
  const pendingRef = useRef(null);

  const game = gameRef.current;

  // ── Eager hint loader ─────────────────────────────────────────────────
  // Fires every time we enter player_turn for the first 5 White moves.
  // Loads tree hint synchronously, engine hint asynchronously.
  useEffect(() => {
    if (phase !== PHASES.PLAYER_TURN) return;

    // Always clear penalty ref — must happen even after move 10 when hint loading is skipped.
    // Without this, using a hint on move 9/10 (last available) would permanently cap score at 3.
    hintPenaltyRef.current = false;

    if (whiteMovesPlayed >= 10) return;

    const g   = gameRef.current;
    const fen = g.fen();
    const history = g.history();

    // Reset hint state for this turn
    setHintUsed(false);
    setHintActive(false);

    // Tree hint — synchronous
    const treeSan = getTreeHintMove(history);
    setHintTreeMove(treeSan ? sanToSquares(fen, treeSan) : null);

    // Engine hint — async (cloud eval first, Stockfish fallback)
    setHintLoading(true);
    setHintEngineMove(null);
    getEngineHintMove(fen).then(uci => {
      setHintEngineMove(uci ? uciToSquares(uci) : null);
    }).catch(() => {
      setHintEngineMove(null);
    }).finally(() => {
      setHintLoading(false);
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / Reset ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    gameRef.current = new Chess();
    const g = gameRef.current;

    setPosition(g.fen());
    setPhase(PHASES.PLAYER_TURN);
    setSelectedSquare(null);
    setLegalSquares([]);
    setLastMove(null);
    setWhiteMovesPlayed(0);
    setTotalScore(0);
    setMoveLog([]);
    setLayerStatus(0);
    setVariationName(null);
    setVariationsHit(new Set());
    setConsecutivePerfect(0);
    setTrapEscaped(false);
    setTrapKey(null);
    setPopupData(null);
    setExplanationData(null);
    setLastBestMove(null);
    setGameOverReason(null);
    setMateDelivered(false);
    setUndoUsed(false);
    setHintTreeMove(null);
    setHintEngineMove(null);
    setHintLoading(false);
    setHintUsed(false);
    setHintActive(false);
    hintPenaltyRef.current = false;
    blackModeRef.current = null;
    trapEvaluatedRef.current = false;
    trapConfigRef.current = rollTrap();
    imperfectionsRef.current = {
      earlySuboptimalAt: 10 + Math.floor(Math.random() * 3), // 10–12
      suboptimalAt:      15 + Math.floor(Math.random() * 6), // 15–20
      randomAt:          20 + Math.floor(Math.random() * 6), // 20–25
      lateRandomAt:      40,                                  // always fires on move 40
    };
    announcedPanelsRef.current = new Set();
    pendingRef.current = null;
  }, []);

  // ── Board click handler ──────────────────────────────────────────────
  const onSquareClick = useCallback((square) => {
    if (phase !== PHASES.PLAYER_TURN) return;

    const g = gameRef.current;
    const piece = g.get(square);

    // Click on own (White) piece — select it
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const targets = g.moves({ square, verbose: true }).map(m => m.to);
      setLegalSquares(targets);
      return;
    }

    // Click on a destination square
    if (selectedSquare) {
      const validTargets = g.moves({ square: selectedSquare, verbose: true }).map(m => m.to);

      if (validTargets.includes(square)) {
        const movingPiece = g.get(selectedSquare);
        const isPromotion =
          movingPiece?.type === 'p' &&
          ((movingPiece.color === 'w' && square[1] === '8') ||
           (movingPiece.color === 'b' && square[1] === '1'));

        setSelectedSquare(null);
        setLegalSquares([]);
        // Auto-promote to queen (children's game — no promotion dialog needed)
        _executeWhiteMove(selectedSquare, square, isPromotion ? 'q' : undefined);
        return;
      }

      // Clicked a non-target square — deselect
      setSelectedSquare(null);
      setLegalSquares([]);
    }
  }, [phase, selectedSquare]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Hint action ───────────────────────────────────────────────────────
  const useHint = useCallback(() => {
    if (phase !== PHASES.PLAYER_TURN || hintUsed || whiteMovesPlayed >= 10) return;
    setHintUsed(true);
    setHintActive(true);
    hintPenaltyRef.current = true;
  }, [phase, hintUsed, whiteMovesPlayed]);

  // ── Three-move take-back ─────────────────────────────────────────────
  // Available once per game from move 4 onwards, only during PLAYER_TURN
  // (no async ops in flight at that point — same safety constraint as begin-oor).
  //
  // Target: 2*(whiteMovesPlayed - 3) half-moves, which always lands on
  // White to move regardless of whether the current position is at an even
  // or odd half-move count (handles "3 moves" and "3.5 moves" cases).
  const drieSkuiweTerug = useCallback(() => {
    if (undoUsed || whiteMovesPlayed < 4 || phase === PHASES.GAME_OVER) return;

    clearTimeout(popupTimerRef.current);
    pendingRef.current  = null;
    popupAfterRef.current = null;

    const targetLen  = 2 * (whiteMovesPlayed - 3);
    const oldHistory = gameRef.current.history();
    const newHistory = oldHistory.slice(0, targetLen);

    const newGame = new Chess();
    let lastMv = null;
    for (const san of newHistory) lastMv = newGame.move(san);
    gameRef.current = newGame;

    const newMovesPlayed = whiteMovesPlayed - 3;
    const newLog         = moveLog.slice(0, newMovesPlayed);
    const newScore       = newLog.reduce((s, m) => s + m.score, 0);
    const newLayer       = detectLayerComplete(newHistory);

    let newStreak = 0;
    for (let i = newLog.length - 1; i >= 0; i--) {
      if (newLog[i].score === 4) newStreak++; else break;
    }

    setUndoUsed(true);
    setPosition(newGame.fen());
    setPhase(PHASES.PLAYER_TURN);
    setSelectedSquare(null);
    setLegalSquares([]);
    setLastMove(lastMv ? { from: lastMv.from, to: lastMv.to } : null);
    setWhiteMovesPlayed(newMovesPlayed);
    setTotalScore(newScore);
    setMoveLog(newLog);
    setLayerStatus(newLayer);
    setVariationName(null);
    setVariationsHit(new Set());
    setConsecutivePerfect(newStreak);
    setTrapKey(null);
    setTrapEscaped(false);
    setPopupData(null);
    setExplanationData(null);
    setLastBestMove(null);
    setGameOverReason(null);
    setMateDelivered(false);
    setHintUsed(false);
    setHintActive(false);
    hintPenaltyRef.current   = false;
    trapEvaluatedRef.current = false;
    announcedPanelsRef.current = new Set();

    // Eagerly reload hints for the new position
    const newFen  = newGame.fen();
    const treeSan = getTreeHintMove(newGame.history());
    setHintTreeMove(treeSan ? sanToSquares(newFen, treeSan) : null);
    if (newMovesPlayed < 10) {
      setHintLoading(true);
      setHintEngineMove(null);
      getEngineHintMove(newFen)
        .then(uci => setHintEngineMove(uci ? uciToSquares(uci) : null))
        .catch(() => setHintEngineMove(null))
        .finally(() => setHintLoading(false));
    } else {
      setHintEngineMove(null);
      setHintLoading(false);
    }
  }, [undoUsed, whiteMovesPlayed, moveLog, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute White's move ─────────────────────────────────────────────
  // Capture FEN + history synchronously BEFORE mutating game state.
  async function _executeWhiteMove(from, to, promotion) {
    const g = gameRef.current;

    // Capture BEFORE move (critical — avoids race condition on game.turn())
    const historyBefore  = g.history();
    const fenBefore      = g.fen();
    const hadHintPenalty = hintPenaltyRef.current; // read synchronously

    const moveResult = g.move({ from, to, promotion: promotion || undefined });
    if (!moveResult) return; // illegal — shouldn't happen

    const san = moveResult.san;
    setPosition(g.fen());
    setLastMove({ from, to });
    setLastBestMove(null); // clear previous suggestion
    setHintActive(false);  // clear hint arrows
    setPhase(PHASES.SCORING);

    // Score asynchronously (instant if in-tree, up to 8s if out-of-tree)
    let result;
    try {
      result = await scoreWhiteMove(historyBefore, fenBefore, san);
    } catch {
      result = { score: 1, label: null, variationName: null, explanation: null, layerComplete: null, source: 'fallback' };
    }

    // Enforce minimum score of 1
    result = { ...result, score: Math.max(1, result.score) };

    // If explanation modal needed and under the 10-explanation limit → pause here
    if (result.explanation && explanationsAnswered < 10) {
      pendingRef.current = { san, result, historyBefore, fenBefore, from, to, hadHintPenalty };
      setExplanationData(result.explanation);
      setPhase(PHASES.EXPLANATION);
      return;
    }

    _applyScoreAndContinue(san, result, false, hadHintPenalty);
  }

  // ── Explanation modal dismissed ───────────────────────────────────────
  const dismissExplanation = useCallback((wasCorrect) => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setExplanationData(null);

    // Apply +1 bonus for correct explanation (capped at 4)
    const adjustedResult = {
      ...pending.result,
      score: wasCorrect
        ? Math.min(4, pending.result.score + 1)
        : pending.result.score,
      explanationCorrect: wasCorrect,
    };

    _applyScoreAndContinue(pending.san, adjustedResult, wasCorrect, pending.hadHintPenalty ?? false);
  }, []);

  // ── Apply score, show popup, then hand off to Black ───────────────────
  function _applyScoreAndContinue(san, result, explanationCorrect, hadHintPenalty = false) {
    const g = gameRef.current;
    const isCheckmate = g.isCheckmate();
    const isGameOver  = g.isGameOver() || g.isDraw() || g.isStalemate();

    // Hint penalty: when hint was used, always award exactly 3 points
    const cappedScore = hadHintPenalty ? 3 : result.score;

    // Trap escape / fell — evaluated once on the first White move after Black plays the trap.
    // Escape: score >= 3 → +3 bonus points + 'trap_escaped' commentary.
    // Fell:   score < 3  → 'trap_fell' commentary, no bonus.
    let trapCommentaarOverride = null;
    let trapEscapeBonus = 0;
    if (trapKey && !trapEvaluatedRef.current) {
      trapEvaluatedRef.current = true;
      if (cappedScore >= 3) {
        setTrapEscaped(true);
        trapEscapeBonus = 3;
        trapCommentaarOverride = 'trap_escaped';
      } else {
        trapCommentaarOverride = 'trap_fell';
      }
    }

    const scoreThisMove = cappedScore + (isCheckmate ? MATE_BONUS : 0) + trapEscapeBonus;

    // Update variation name announcement
    if (result.variationName) {
      setVariationName(result.variationName);
      setVariationsHit(prev => { const s = new Set(prev); s.add(result.variationName); return s; });
    }

    // Update layer status — detect if this move completed a new layer
    const newLayer = detectLayerComplete(g.history());
    const layerJustComplete = newLayer > layerStatus ? newLayer : null;
    setLayerStatus(prev => Math.max(prev, newLayer));

    // Update consecutive perfect streak
    setConsecutivePerfect(prev =>
      cappedScore === 4 ? prev + 1 : 0
    );

    // When hint was used, or for the first 3 moves: no Giacomo commentary
    const commentaarKey = trapCommentaarOverride ?? (isCheckmate ? 'celebrating' : String(cappedScore));
    const silentMove = hadHintPenalty || whiteMovesPlayed < 3;
    const commentaar = silentMove ? null : getGiacomoLine(commentaarKey);
    const expression = hadHintPenalty ? 'neutral'
      : trapCommentaarOverride === 'trap_escaped' ? 'ecstatic'
      : trapCommentaarOverride === 'trap_fell'    ? 'frustrated'
      : scoreToExpression(cappedScore, isCheckmate);

    // From move 30 onwards: focus mode — score only, no text distractions
    const focusMode = whiteMovesPlayed >= 29;

    // Mid-game theme panel — fires at most once per theme per game.
    // Suppressed in focus mode and when a layer announcement takes the popup.
    const newMidgamePanelId = detectNewMidgamePanel(g.history(), g, announcedPanelsRef.current, cappedScore);
    if (newMidgamePanelId) {
      announcedPanelsRef.current = new Set([...announcedPanelsRef.current, newMidgamePanelId]);
    }
    const midgamePanel = (!focusMode && !layerJustComplete && newMidgamePanelId)
      ? (MIDGAME_PANELS[newMidgamePanelId] ?? null) : null;

    // Option C easter egg: 1-in-300 chance of an Italy fact appearing in the popup.
    // Only on desktop (pointer:fine), not during focus mode, not on checkmate.
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    const italyFact = (!focusMode && !isCheckmate && isDesktop && Math.random() < 1 / 300)
      ? getRandomItalyFact() : null;

    // Build popup data
    const popup = {
      san,
      score:               cappedScore,
      scoreThisMove,
      label:               result.label,
      variationName:       focusMode ? null : result.variationName,
      commentaar:          focusMode ? null : commentaar,
      expression:          focusMode ? null : expression,
      isCheckmate,
      explanationCorrect,
      hadHintPenalty,
      source:              result.source,
      layerAnnouncement:   (focusMode || !layerJustComplete) ? null : LAYER_ANNOUNCEMENTS[layerJustComplete],
      midgamePanel,
      italyFact,
      focusMode,
      duration:            layerJustComplete && !focusMode ? 28000 : midgamePanel ? 28000 : italyFact ? 20000 : focusMode ? 3000 : POPUP_DURATION,
    };
    setPopupData(popup);
    if (cappedScore < 4 && result.bestMoveSan) setLastBestMove(result.bestMoveSan);

    // Update running totals
    setTotalScore(prev => Math.min(MAX_SCORE, prev + scoreThisMove));
    setWhiteMovesPlayed(prev => prev + 1);
    setMoveLog(prev => [...prev, {
      moveNumber: prev.length + 1,
      san,
      score:  cappedScore,
      fen:    g.fen(),
      label:  result.label,
    }]);

    // Notify badge hook (caller provides onBadgeUnlock callback)
    if (onBadgeUnlock) {
      onBadgeUnlock({
        history:            g.history(),
        moveLog:            [], // will be stale here; badge hook manages its own state
        layerStatus:        newLayer,
        consecutivePerfect: result.score === 4 ? 1 : 0, // hook accumulates this itself
        trapEscaped,
        trapKey,
        mateDelivered:      isCheckmate,
      });
    }

    if (isCheckmate) setMateDelivered(true);

    setPhase(PHASES.POPUP);
    const movesAfterThisMove = whiteMovesPlayed + 1;
    popupAfterRef.current = { isCheckmate, isGameOver, movesAfterThisMove };

    // Auto-dismiss popup — timer stored so the click handler can cancel it early.
    // movesAfterThisMove is captured here (stale closure) so both paths use the same value.
    clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => {
      setPopupData(null);
      _afterPopup(isCheckmate, isGameOver, movesAfterThisMove);
    }, popup.duration);
  }

  function dismissPopup() {
    clearTimeout(popupTimerRef.current);
    setPopupData(null);
    if (popupAfterRef.current) {
      const { isCheckmate, isGameOver, movesAfterThisMove } = popupAfterRef.current;
      popupAfterRef.current = null;
      _afterPopup(isCheckmate, isGameOver, movesAfterThisMove);
    }
  }

  // ── After popup auto-dismisses ────────────────────────────────────────
  function _afterPopup(isCheckmate, wasGameOver, movesAfterThisMove) {
    const g = gameRef.current;

    if (isCheckmate) {
      _endGame('checkmate_white');
      return;
    }
    if (wasGameOver) {
      const reason = g.isStalemate() ? 'stalemate' : 'draw';
      _endGame(reason);
      return;
    }
    if (movesAfterThisMove >= MAX_WHITE_MOVES) {
      _endGame('moves_complete');
      return;
    }

    // Black's turn
    _playBlackMove();
  }

  // ── Black's move ──────────────────────────────────────────────────────
  async function _playBlackMove() {
    const g = gameRef.current;
    setPhase(PHASES.BLACK_THINKING);

    // Capture synchronously
    const fen           = g.fen();
    const history       = g.history();
    const blackMoveNum  = Math.ceil(history.length / 2); // Black's move number

    // Check trap trigger
    const trapMove = checkTrapTrigger(trapConfigRef.current, history);
    if (trapMove) {
      // Warn player before Black plays the trap
      // (Trap warning is shown via a brief popup — handled by UI reading popupData.trapWarning)
      setPopupData(prev => ({
        ...(prev || {}),
        trapWarning: trapConfigRef.current?.giacomoWarn,
        expression: 'warning',
      }));
      // Short pause to show warning
      await new Promise(resolve => setTimeout(resolve, 1200));
      setPopupData(null);
    }

    const imp = imperfectionsRef.current ?? {};
    const forceRandom     = blackMoveNum === imp.randomAt || blackMoveNum === (imp.lateRandomAt ?? 40);
    const forceSuboptimal = !forceRandom && (blackMoveNum === imp.suboptimalAt || blackMoveNum === imp.earlySuboptimalAt);

    // Dynamic difficulty overrides the scheduled depth profile
    const scheduledDepth = (blackMoveNum >= 25 && blackMoveNum < 30) ? 4
                         : (blackMoveNum >= 30 && blackMoveNum <= 35) ? 5
                         : 12;
    const depth = blackModeRef.current === 'fighting' ? 15
                : blackModeRef.current === 'coasting'  ? 5
                : scheduledDepth;

    // Thinking schedule:
    //   1–4 : 3s (opening book, fast)
    //   5   : 10–20s (tournament pace)
    //   6–10: 7s (early middlegame, still brisk)
    //  11–30: 10–20s (full tournament pace)
    //  31–39: 1–10s (endgame urgency)
    //  40+  : instant (BLACK_THINK_CUTOFF)
    const thinkDelay = blackMoveNum <= 4
      ? new Promise(r => setTimeout(r, 3000))
      : blackMoveNum >= 6 && blackMoveNum <= 10
        ? new Promise(r => setTimeout(r, 7000))
        : blackMoveNum <= 30
          ? new Promise(r => setTimeout(r, BLACK_THINK_MIN + Math.random() * (BLACK_THINK_MAX - BLACK_THINK_MIN)))
          : blackMoveNum < BLACK_THINK_CUTOFF
            ? new Promise(r => setTimeout(r, 1000 + Math.random() * 9000))
            : Promise.resolve();

    let san;
    try {
      [san] = await Promise.all([
        selectBlackMove(fen, blackMoveNum, trapMove || null, { forceRandom, forceSuboptimal, depth }),
        thinkDelay,
      ]);
    } catch {
      await thinkDelay;
      const legal = g.moves();
      san = legal[0] ?? null;
    }

    if (!san) {
      _endGame('no_legal_moves');
      return;
    }

    const blackResult = g.move(san);
    if (!blackResult) {
      // Move rejected — play any legal move
      const legal = g.moves();
      if (legal.length > 0) g.move(legal[0]);
    }

    // Check if Black's trap move was played and whether player responded correctly
    // (The response is evaluated on White's NEXT move via the opening tree trap entries)
    if (trapMove && blackResult?.san === trapMove) {
      setTrapKey(trapConfigRef.current?.key ?? null);
    }

    setPosition(g.fen());
    setLastMove({ from: (blackResult || {}).from, to: (blackResult || {}).to });
    setPhase(PHASES.BLACK_MOVING);

    // Check if Black delivered checkmate
    if (g.isCheckmate()) {
      setTimeout(() => _endGame('checkmate_black'), BLACK_MOVE_DELAY);
      return;
    }
    if (g.isGameOver() || g.isStalemate() || g.isDraw()) {
      setTimeout(() => _endGame('draw'), BLACK_MOVE_DELAY);
      return;
    }

    // Background eval for dynamic difficulty — fires while player thinks
    // Only meaningful after move 20; result updates blackModeRef for Black's next turn
    if (blackMoveNum > 20) {
      const fenForEval = g.fen(); // White to move — cp sign = White's absolute perspective
      evalFen(fenForEval).then(cp => {
        if (cp === null) return;
        if (cp > 500) {
          // White up 5+ → Black fights at full strength
          blackModeRef.current = 'fighting';
        } else if (cp < -500) {
          // Black up 5+ → Black coasts at depth 5 (covers both: initial trigger and
          // recovering from fighting mode when Black swings back to 5+ advantage)
          blackModeRef.current = 'coasting';
        } else {
          // Position normalised (−500 ≤ cp ≤ +500) → back to normal scheduled depth
          blackModeRef.current = null;
        }
      }).catch(() => {});
    }

    setTimeout(() => setPhase(PHASES.PLAYER_TURN), BLACK_MOVE_DELAY);
  }

  // ── Game end ──────────────────────────────────────────────────────────
  function _endGame(reason) {
    setGameOverReason(reason);
    setPhase(PHASES.GAME_OVER);
    if (onGameEnd) {
      onGameEnd({
        reason,
        totalScore,
        moveLog,
        mateDelivered: reason === 'checkmate_white',
        trapEscaped,
        trapKey,
        layerStatus,
      });
    }
  }

  // ── Trap escape detection ─────────────────────────────────────────────
  // Called by _applyScoreAndContinue when the tree flags a trap-related move
  const markTrapEscaped = useCallback(() => {
    setTrapEscaped(true);
  }, []);

  // ── Public API ────────────────────────────────────────────────────────
  return {
    // State
    position,
    phase,
    PHASES,
    selectedSquare,
    legalSquares,
    lastMove,
    whiteMovesPlayed,
    totalScore,
    MAX_SCORE,
    moveLog,
    layerStatus,
    variationName,
    variationsHit,
    consecutivePerfect,
    trapEscaped,
    trapKey,
    mateDelivered,
    gameOverReason,
    popupData,
    explanationData,
    lastBestMove,
    game: gameRef.current,

    // Hint system
    hintTreeMove,
    hintEngineMove,
    hintLoading,
    hintUsed,
    hintActive,

    // Take-back
    undoUsed,

    // Actions
    startGame,
    onSquareClick,
    dismissExplanation,
    dismissPopup,
    markTrapEscaped,
    useHint,
    drieSkuiweTerug,
  };
}
