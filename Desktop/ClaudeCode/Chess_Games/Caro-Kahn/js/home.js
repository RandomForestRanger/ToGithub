/* Die Caro-Kann in Blokkie-wêreld — home/spawn screen. Depends on data.js, mastery.js. */

(function () {
  const CURRENT_PLAYER_KEY = `${GAME_PREFIX}_currentPlayer`;

  const select = document.getElementById('player-select');
  const beginBtn = document.getElementById('begin-btn');
  const bubble = document.getElementById('home-bubble');
  const progressMap = document.getElementById('progress-map');

  function currentPlayer() {
    return select.value;
  }

  function populatePlayers() {
    PLAYERS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      select.appendChild(opt);
    });
    const saved = localStorage.getItem(CURRENT_PLAYER_KEY);
    select.value = (saved && PLAYERS.includes(saved)) ? saved : PLAYERS[0];
  }

  function tierLabel(tier) {
    return { geen: 'Nog niks', redstone: 'Redstone', koper: 'Koper', brons: 'Brons', silwer: 'Silwer', goud: 'Goud' }[tier] || 'Nog niks';
  }

  function renderProgress() {
    const state = KKMastery.load(currentPlayer());
    progressMap.innerHTML = '';
    ['vlakte', 'muur', 'woud', 'nether'].forEach(id => {
      const biome = BIOMES[id];
      const tier = KKMastery.tierOf(state, id);
      const slot = document.createElement('div');
      slot.className = 'badge-slot ' + (tier === 'geen' ? 'locked' : 'unlocked tier-' + tier);
      let subInfo = '';
      if (id === 'woud') {
        subInfo = `Bospad: ${tierLabel(state.tiers.bospad)} · Karpov: ${tierLabel(state.tiers.karpov)}`;
      }
      slot.innerHTML = `
        <img class="ore-icon" src="images/${biome.bg}?v=${ASSET_V}" alt="${biome.name}">
        <div class="tier-label">${tierLabel(tier)}</div>
        <div class="tooltip">${biome.name}${subInfo ? ' — ' + subInfo : ''}</div>
      `;
      progressMap.appendChild(slot);
    });
  }

  select.addEventListener('change', () => {
    localStorage.setItem(CURRENT_PLAYER_KEY, currentPlayer());
    renderProgress();
  });

  beginBtn.addEventListener('click', () => {
    localStorage.setItem(CURRENT_PLAYER_KEY, currentPlayer());
    window.location.href = 'game.html';
  });

  populatePlayers();
  renderProgress();
  bubble.textContent = REISIGER.loadingKarpov[Math.floor(Math.random() * REISIGER.loadingKarpov.length)];
})();
