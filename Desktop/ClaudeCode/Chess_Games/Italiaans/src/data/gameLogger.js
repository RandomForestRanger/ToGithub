// Game log — persists all completed games to localStorage on this machine.
// Data is never auto-cleared; the TrophyRoom export button downloads everything.
//
// Storage key : 'italiaans_gamelog'
// Format      : JSON array, newest first, capped at MAX_GAMES entries.

const STORAGE_KEY = 'italiaans_gamelog';
const MAX_GAMES   = 500;

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLog(games) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch { /* storage full — silently skip */ }
}

// Append one game record. Called from App.jsx after each game ends.
// result: the object passed to onGameEnd from useGame
// playerName: string (activeProfile)
export function logGame(result, playerName) {
  const {
    totalScore = 0,
    reason     = 'unknown',
    moveLog    = [],
    mateDelivered  = false,
    trapEscaped    = false,
    trapKey        = null,
    layerStatus    = 0,
    sessionBadges  = [],
  } = result;

  const entry = {
    id:          Date.now().toString(),
    datum:       new Date().toISOString(),
    speler:      playerName ?? 'Onbekend',
    telling:     totalScore,
    maxTelling:  200,
    persentasie: Math.round((totalScore / 200) * 100),
    rede:        reason,
    matGelewer:  mateDelivered,
    valOntsnap:  trapEscaped,
    valSleutel:  trapKey,
    laagBereik:  layerStatus,
    nuweKentekens: sessionBadges,
    skuiwe: moveLog.map(m => ({
      nr:     m.moveNumber,
      san:    m.san,
      punt:   m.score,
      etiket: m.label ?? null,
    })),
  };

  const existing = loadLog();
  const updated  = [entry, ...existing].slice(0, MAX_GAMES);
  saveLog(updated);
  return entry;
}

// Return all logged games (newest first).
export function getAllGames() {
  return loadLog();
}

// Download all games as a .json file.
export function downloadGameLog() {
  const games = loadLog();
  if (games.length === 0) {
    alert('Geen spele opgeskryf nie.');
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10); // "2026-04-22"
  const filename = `italiaans_spele_${dateStr}.json`;
  const blob     = new Blob([JSON.stringify(games, null, 2)], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Clear all logs (use with care).
export function clearGameLog() {
  localStorage.removeItem(STORAGE_KEY);
}
