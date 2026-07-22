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
  function evaluateGameResult(state, result) {
    if (!result.reachedEndOrWon) return null;
    let achieved = TIER.GEEN;

    if (result.emeraldsTotal >= 10) {
      achieved = TIER.REDSTONE;
    }
    if (result.theoryMovesFound >= 5) {
      achieved = TIER.KOPER;
    }
    if (result.allTheoryCorrect && result.hintEscalations <= 2) {
      achieved = TIER.BRONS;
    }
    const silwerEmeralds = result.emeraldsTotal + result.diamondsTotal * SCORE.ENGINE_BEST;
    if (silwerEmeralds >= 12 && !result.hadBlunder) {
      if (TIER_ORDER.indexOf(TIER.SILWER) > TIER_ORDER.indexOf(achieved)) achieved = TIER.SILWER;
    }
    if (result.won || (result.finalEvalForBlack >= 150 && result.diamondsTotal >= 2)) {
      achieved = TIER.GOUD;
    }

    if (achieved !== TIER.GEEN) upgradeTier(state, result.pathId, achieved);
    return achieved;
  }

  return { load, save, defaultState, woudTier, tierOf, upgradeTier, pickBiome, recordBiomePlayed, evaluateGameResult };
})();

if (typeof module !== 'undefined') {
  module.exports = KKMastery;
}
