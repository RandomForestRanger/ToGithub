// Lichess API wrapper with 5-minute cache.
//
// Two endpoints:
//   Explorer  — popularity-ranked moves for a position (Black's move selection)
//   Cloud Eval — engine-ranked top moves for a position (White's move scoring)
//
// Both require the auth header (without it Explorer returns 401).
// Token: Lichess user J_P_B, no scopes needed.

const TOKEN = 'LICHESS_TOKEN_REDACTED';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 50;

const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  if (_cache.size >= CACHE_MAX) {
    _cache.delete(_cache.keys().next().value); // evict oldest
  }
  _cache.set(key, { data, ts: Date.now() });
}

async function apiFetch(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Lichess HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Explorer ────────────────────────────────────────────────────────────
// Returns moves sorted by total games (most popular first).
// Used by moveSelector.js to pick Black's reply.
export async function fetchExplorerMoves(fen) {
  const key = `exp:${fen}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const url =
    `https://explorer.lichess.ovh/lichess` +
    `?fen=${encodeURIComponent(fen)}` +
    `&speeds=blitz,rapid,classical&ratings=1600,1800,2000`;

  const data = await apiFetch(url, 4000);

  // Sort by total games descending
  if (Array.isArray(data?.moves)) {
    data.moves.sort(
      (a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black)
    );
  }

  cacheSet(key, data);
  return data;
}

// ── Cloud Eval ──────────────────────────────────────────────────────────
// Returns { pvs: [{moves, cp?, mate?}], depth, fen }
// pvs[i].moves starts with the UCI of the i-th best move (space-separated).
// Used by scoringRules.js to rank White's move against engine recommendation.
export async function fetchCloudEval(fen, multiPv = 4) {
  const key = `eval:${fen}:${multiPv}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const url =
    `https://lichess.org/api/cloud-eval` +
    `?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`;

  const data = await apiFetch(url, 4000);
  cacheSet(key, data);
  return data;
}
