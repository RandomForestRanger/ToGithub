// Badge unlock logic.
//
// checkMoveBadges(ctx)    → string[]  call after each White move
// checkGameEndBadges(ctx) → string[]  call once when game ends
//
// Returns arrays of newly-unlocked badge IDs (not previously earned).
// The caller (useGame) is responsible for persisting them via useProfile.addBadges().

import { useState, useCallback } from 'react';
import { BADGES } from '../data/badges.js';

// Build the criterion context expected by badge definitions
function buildCtx(gameState, profile) {
  return {
    history:            gameState.history,
    moveLog:            gameState.moveLog,
    finalScore:         gameState.finalScore ?? 0,
    mateDelivered:      gameState.mateDelivered ?? false,
    trapEscaped:        gameState.trapEscaped ?? false,
    trapKey:            gameState.trapKey ?? null,
    layerStatus:        gameState.layerStatus ?? 0,
    variationsHit:      gameState.variationsHit ?? new Set(),
    consecutivePerfect: gameState.consecutivePerfect ?? 0,
    profile: {
      speleGespeel:    (profile?.speleGespeel ?? 0) + 1, // +1 because this game counts
      badges:          profile?.badges ?? [],
      besteTelling:    profile?.besteTelling ?? 0,
      e4CorrectStreak: profile?.e4CorrectStreak ?? 0,
    },
  };
}

function evaluate(badges, when, ctx, alreadyEarned) {
  return badges
    .filter(b => b.when === when && !alreadyEarned.includes(b.id))
    .filter(b => {
      try { return b.criterion(ctx); }
      catch { return false; }
    })
    .map(b => b.id);
}

export function useBadges() {
  // Track which badges were unlocked THIS game session (for PostGame display)
  const [sessionBadges, setSessionBadges] = useState([]);

  const resetSession = useCallback(() => setSessionBadges([]), []);

  // Called after every White move
  const checkMoveBadges = useCallback((gameState, profile) => {
    const ctx = buildCtx(gameState, profile);
    const alreadyEarned = [
      ...(profile?.badges ?? []),
      ...sessionBadges,
    ];
    const newBadges = evaluate(BADGES, 'move', ctx, alreadyEarned);
    if (newBadges.length > 0) {
      setSessionBadges(prev => [...prev, ...newBadges]);
    }
    return newBadges;
  }, [sessionBadges]);

  // Called once when game ends
  const checkGameEndBadges = useCallback((gameState, profile) => {
    const ctx = buildCtx(gameState, profile);
    const alreadyEarned = [
      ...(profile?.badges ?? []),
      ...sessionBadges,
    ];
    const newBadges = evaluate(BADGES, 'game_end', ctx, alreadyEarned);
    if (newBadges.length > 0) {
      setSessionBadges(prev => [...prev, ...newBadges]);
    }
    return newBadges;
  }, [sessionBadges]);

  return {
    sessionBadges,   // all badges unlocked this game (for PostGame + BadgePanel glow)
    resetSession,
    checkMoveBadges,
    checkGameEndBadges,
  };
}
