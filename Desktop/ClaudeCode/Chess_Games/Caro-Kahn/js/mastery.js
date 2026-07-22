/* Die Caro-Kann in Blokkie-wêreld — mastery persistence + weighted biome selection. Depends on data.js. */

const KKMastery = (function () {
  function key(player) { return `${GAME_PREFIX}_${player}_mastery`; }

  function defaultState() {
    return {
      tiers: { vlakte: TIER.GEEN, muur: TIER.GEEN, bospad: TIER.GEEN, karpov: TIER.GEEN, nether: TIER.GEEN },
      recentBiomes: [],
      karpovTutorialSeen: false,
      lifetimeEmeralds: 0,
      gamesPlayed: 0
    };
  }

  function load(player) {
    try {
      const raw = localStorage.getItem(key(player));
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const d = defaultState();
      return Object.assign(d, parsed, { tiers: Object.assign(d.tiers, parsed.tiers || {}) });
    } catch (e) {
      return defaultState();
    }
  }

  function save(player, state) {
    localStorage.setItem(key(player), JSON.stringify(state));
  }

  // World 3 (Woud) mastery = lower of its two dungeon tiers
  function woudTier(state) {
    const bIdx = TIER_ORDER.indexOf(state.tiers.bospad);
    const lIdx = TIER_ORDER.indexOf(state.tiers.karpov);
    return TIER_ORDER[Math.min(bIdx, lIdx)];
  }

  function tierOf(state, biomeId) {
    if (biomeId === 'woud') return woudTier(state);
    return state.tiers[biomeId];
  }

  function upgradeTier(state, pathId, achieved) {
    const cur = state.tiers[pathId];
    if (TIER_ORDER.indexOf(achieved) > TIER_ORDER.indexOf(cur)) {
      state.tiers[pathId] = achieved;
    }
  }

  // Weighted random pick among the 4 top-level biomes, biased toward least mastery.
  // Guard rail: never pick the same biome three games in a row.
  function pickBiome(state) {
    const ids = ['vlakte', 'muur', 'woud', 'nether'];
    const last2 = state.recentBiomes.slice(-2);
    const forcedExclude = (last2.length === 2 && last2[0] === last2[1]) ? last2[0] : null;

    let candidates = ids.filter(id => id !== forcedExclude);
    if (candidates.length === 0) candidates = ids.slice();

    const weights = candidates.map(id => TIER_WEIGHT[tierOf(state, id)]);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function recordBiomePlayed(state, biomeId) {
    state.recentBiomes.push(biomeId);
    if (state.recentBiomes.length > 10) state.recentBiomes.shift();
    state.gamesPlayed += 1;
  }

  // Evaluate end-of-game mastery per CLAUDE.md §7.
  // result: { pathId, reachedEndOrWon, won, allTheoryCorrect, hintEscalations,
  //           emeraldsTotal, hadBlunder, finalEvalForBlack, diamondsTotal, theoryMovesFound }
  //
  // Tiers are gates, not a single best-of-game score: no matter how well a
  // game goes, it can award at most ONE rung above whatever's already been
  // reached for this path. A flawless first game on a fresh biome earns
  // Redstone, not Goud — Koper only becomes reachable on the next game, and
  // so on up the ladder. A game that doesn't even clear the next rung's own
  // bar still earns nothing (or repeats the current tier, which upgradeTier
  // then no-ops on, same as before).
  function evaluateGameResult(state, result) {
    if (!result.reachedEndOrWon) return null;
    let naturalTier = TIER.GEEN;

    if (result.emeraldsTotal >= 10) {
      naturalTier = TIER.REDSTONE;
    }
    if (result.theoryMovesFound >= 5) {
      naturalTier = TIER.KOPER;
    }
    if (result.allTheoryCorrect && result.hintEscalations <= 2) {
      naturalTier = TIER.BRONS;
    }
    const silwerEmeralds = result.emeraldsTotal + result.diamondsTotal * SCORE.ENGINE_BEST;
    if (silwerEmeralds >= 12 && !result.hadBlunder) {
      if (TIER_ORDER.indexOf(TIER.SILWER) > TIER_ORDER.indexOf(naturalTier)) naturalTier = TIER.SILWER;
    }
    if (result.won || (result.finalEvalForBlack >= 150 && result.diamondsTotal >= 2)) {
      naturalTier = TIER.GOUD;
    }

    const currentIdx = TIER_ORDER.indexOf(state.tiers[result.pathId] || TIER.GEEN);
    const nextRungIdx = Math.min(currentIdx + 1, TIER_ORDER.length - 1);
    const achieved = TIER_ORDER[Math.min(TIER_ORDER.indexOf(naturalTier), nextRungIdx)];

    // Only a genuine upgrade over the persisted tier counts as "achieved this
    // game" — under gating, most games will land at or below the current
    // tier (repeat stats, or stats that would've qualified for a tier the
    // gate hasn't unlocked yet), and those shouldn't announce a new level.
    if (TIER_ORDER.indexOf(achieved) <= currentIdx) return null;
    upgradeTier(state, result.pathId, achieved);
    return achieved;
  }

  return { load, save, defaultState, woudTier, tierOf, upgradeTier, pickBiome, recordBiomePlayed, evaluateGameResult };
})();

if (typeof module !== 'undefined') {
  module.exports = KKMastery;
}
