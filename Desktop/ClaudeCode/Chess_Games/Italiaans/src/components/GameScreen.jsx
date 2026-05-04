import React, { useEffect, useRef, useState } from 'react';
import { useGame, PHASES } from '../hooks/useGame.js';
import { useBadges } from '../hooks/useBadges.js';
import { scoreToExpression, getGiacomoLine } from '../data/giacomoLines.js';
import GameTitle    from './GameTitle.jsx';
import ScoreBar     from './ScoreBar.jsx';
import Board        from './Board.jsx';
import BadgePanel   from './BadgePanel.jsx';
import MovePopup        from './MovePopup.jsx';
import ExplanationModal from './ExplanationModal.jsx';
import SuggestionBox    from './SuggestionBox.jsx';

export default function GameScreen({ profileData, onGameEnd, onAddBadges, onRemoveBadges, onExplanationAnswered }) {
  const {
    position, phase, selectedSquare, legalSquares, lastMove,
    whiteMovesPlayed, totalScore, MAX_SCORE, moveLog,
    layerStatus, variationName, consecutivePerfect,
    trapEscaped, trapKey, mateDelivered, gameOverReason,
    popupData, explanationData, lastBestMove,
    hintTreeMove, hintEngineMove, hintLoading, hintUsed, hintActive,
    game,
    startGame, onSquareClick, dismissExplanation, useHint,
  } = useGame({ explanationsAnswered: profileData?.uitlegtellings ?? 0 });

  const { sessionBadges, resetSession, checkMoveBadges, checkGameEndBadges } = useBadges();
  const [badgeHoverText, setBadgeHoverText] = useState(null);
  const [thinkingComment, setThinkingComment] = useState('Swart dink...');
  const [motivMsg, setMotivMsg] = useState(null);
  const motivTriggers = useRef([]);
  const shownMotivRef = useRef(new Set());
  const motivTimerRef = useRef(null);

  // Pick a fresh random thinking comment each time Black starts thinking
  useEffect(() => {
    if (phase === PHASES.BLACK_THINKING) {
      setThinkingComment(getGiacomoLine('black_thinking'));
    }
  }, [phase]);

  // Start game on mount — pick 3 random motivational trigger move numbers (8–42)
  useEffect(() => {
    resetSession();
    startGame();
    const nums = new Set();
    while (nums.size < 3) nums.add(8 + Math.floor(Math.random() * 35));
    motivTriggers.current = [...nums];
    shownMotivRef.current = new Set();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Begin oor" — restarts mid-game; session badges earned so far are forfeited
  function handleRestart() {
    if (sessionBadges.length > 0) onRemoveBadges?.(sessionBadges);
    resetSession();
    startGame();
    const nums = new Set();
    while (nums.size < 3) nums.add(8 + Math.floor(Math.random() * 35));
    motivTriggers.current = [...nums];
    shownMotivRef.current = new Set();
  }

  // Motivational messages — fire at trigger move numbers during player's turn
  useEffect(() => {
    if (phase !== PHASES.PLAYER_TURN) {
      clearTimeout(motivTimerRef.current);
      setMotivMsg(null);
      return;
    }
    const trigger = motivTriggers.current.find(
      t => t === whiteMovesPlayed && !shownMotivRef.current.has(t)
    );
    if (!trigger) return;
    shownMotivRef.current.add(trigger);
    setMotivMsg(getGiacomoLine('motivational'));
    clearTimeout(motivTimerRef.current);
    motivTimerRef.current = setTimeout(() => setMotivMsg(null), 5000);
  }, [phase, whiteMovesPlayed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Badge checks ───────────────────────────────────────────────────────
  // After each move popup appears, check move-time badges
  const prevPopupRef = useRef(null);
  useEffect(() => {
    if (!popupData || popupData === prevPopupRef.current) return;
    prevPopupRef.current = popupData;

    const ctx = buildBadgeCtx();
    const newBadges = checkMoveBadges(ctx, profileData);
    if (newBadges.length > 0) onAddBadges(newBadges);
  }, [popupData]); // eslint-disable-line react-hooks/exhaustive-deps

  // When game ends, check end-game badges, then linger 5s before transitioning
  useEffect(() => {
    if (phase !== PHASES.GAME_OVER) return;

    const ctx = buildBadgeCtx();
    const newBadges = checkGameEndBadges(ctx, profileData);
    if (newBadges.length > 0) onAddBadges(newBadges);

    const result = {
      reason:        gameOverReason,
      totalScore,
      moveLog,
      mateDelivered,
      trapEscaped,
      trapKey,
      layerStatus,
      sessionBadges: [...sessionBadges, ...newBadges],
      e4WasCorrect:  profileData?.e4CorrectStreak >= 0,
    };

    const timer = setTimeout(() => onGameEnd(result), 5000);
    return () => clearTimeout(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function buildBadgeCtx() {
    return {
      history:            game.history(),
      moveLog,
      finalScore:         totalScore,
      mateDelivered,
      trapEscaped,
      trapKey,
      layerStatus,
      consecutivePerfect,
      variationsHit:      variationName ? new Set([variationName]) : new Set(),
    };
  }

  // ── Giacomo display logic ──────────────────────────────────────────────
  const giacomoExpression = popupData
    ? (popupData.expression ?? 'neutral')
    : scoreToExpression(0, false, phase === 'scoring' || phase === 'black_thinking');

  // ── Hint arrows for the board ─────────────────────────────────────────
  const hintArrows = [];
  if (hintActive) {
    if (hintTreeMove) {
      hintArrows.push([hintTreeMove.from, hintTreeMove.to, 'rgba(0,190,100,0.9)']);
    }
    if (hintEngineMove) {
      const sameAsTree = hintTreeMove
        && hintEngineMove.from === hintTreeMove.from
        && hintEngineMove.to   === hintTreeMove.to;
      if (!sameAsTree) {
        hintArrows.push([hintEngineMove.from, hintEngineMove.to, 'rgba(220,110,20,0.9)']);
      }
    }
  }

  // ── Giacomo comment — hint legend overrides everything while active ───
  const hintComment = (() => {
    if (!hintActive) return null;
    if (hintLoading && !hintEngineMove) return '🟢 Italianer wenk getoon... masjien laai nog ⏳';
    const sameMove = hintTreeMove && hintEngineMove
      && hintTreeMove.from === hintEngineMove.from
      && hintTreeMove.to   === hintEngineMove.to;
    if (sameMove)               return 'Die Italianer en die masjien stem saam! 🤝';
    if (hintTreeMove && hintEngineMove) return '🟢 Italianer aanbeveling  |  🟠 Masjien se beste';
    if (hintTreeMove)           return '🟢 Hier is die Italianer se wenk!';
    return 'Kyk na die pyle op die bord...';
  })();

  const giacomoComment = hintComment
    ?? badgeHoverText
    ?? motivMsg
    ?? popupData?.commentaar
    ?? (phase === 'scoring'         ? 'Giacomo evalueer... 🤔'
      : phase === 'black_thinking'  ? thinkingComment
      : phase === 'black_moving'    ? 'Swart speel...'
      : 'Jou skuif...');

  const isDisabled = phase !== PHASES.PLAYER_TURN;

  // Show hint button: player's turn, first 5 moves, not yet used, no popup showing
  const showHintBtn = phase === PHASES.PLAYER_TURN
    && whiteMovesPlayed < 10
    && !hintUsed
    && !popupData;

  // Show suggestion only during player's turn, not while popup is showing
  const showSuggestion = phase === PHASES.PLAYER_TURN && lastBestMove && !popupData;

  return (
    <div className="game-screen">
      <GameTitle />
      {/* Top bar */}
      <ScoreBar
        profileName={profileData?.naam ?? ''}
        totalScore={totalScore}
        maxScore={MAX_SCORE}
        whiteMovesPlayed={whiteMovesPlayed}
        maxMoves={50}
        layerStatus={layerStatus}
        variationName={variationName}
        phase={phase}
      />

      {/* Main content: badge panel + board */}
      <div className="game-screen__main">
        <BadgePanel
          earnedBadges={profileData?.badges ?? []}
          sessionBadges={sessionBadges}
          onBadgeHover={setBadgeHoverText}
        />

        <Board
          position={position}
          selectedSquare={selectedSquare}
          legalSquares={legalSquares}
          lastMove={lastMove}
          game={game}
          onSquareClick={onSquareClick}
          giacomoExpression={giacomoExpression}
          giacomoComment={giacomoComment}
          phase={phase}
          disabled={isDisabled}
          hintArrows={hintArrows}
          showHintBtn={showHintBtn}
          hintLoading={hintLoading}
          onUseHint={useHint}
        />
      </div>

      {/* Restart button — only during player's turn, safe to restart with no async ops in flight */}
      {phase === PHASES.PLAYER_TURN && (
        <div className="game-screen__restart-bar">
          <button className="btn-restart" onClick={handleRestart}>
            ↺ Begin oor
          </button>
        </div>
      )}

      {/* Overlays */}
      {explanationData && (
        <ExplanationModal
          data={explanationData}
          onDismiss={(wasCorrect) => {
            dismissExplanation(wasCorrect);
            onExplanationAnswered?.();
          }}
        />
      )}

      {popupData && (
        <MovePopup
          data={popupData}
          onDismiss={() => {/* auto-dismiss handled by useGame timeout */}}
        />
      )}

      <SuggestionBox bestMove={showSuggestion ? lastBestMove : null} />
    </div>
  );
}
