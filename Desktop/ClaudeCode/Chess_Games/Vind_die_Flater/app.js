// Vind die Flater — Game Logic
// =============================================================

// ── Local Stockfish (Blob-Worker approach — works from file://) ────────────
let _sfWorker = null;
let _sfWorkerReady = false;
let _sfWorkerQueue = [];
let _sfJobId = 0; // incremented on each new analysis; stale callbacks bail out

function initLocalStockfish() {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(r => r.text())
        .then(code => {
            const blob = new Blob([code], { type: 'application/javascript' });
            _sfWorker = new Worker(URL.createObjectURL(blob));
            _sfWorker.onmessage = function(e) {
                const line = e.data;
                if (line === 'uciok' || line === 'readyok') {
                    _sfWorkerReady = true;
                }
                _sfWorkerQueue.forEach(item => item && item(line));
            };
            _sfWorker.onerror = function(err) {
                console.warn('Stockfish worker error:', err);
                _sfWorker = null;
            };
            _sfWorker.postMessage('uci');
        })
        .catch(err => console.warn('Stockfish fetch failed:', err));
}

function localStockfishAnalyse(fen, depth, multipv) {
    return new Promise(resolve => {
        if (!_sfWorker) { resolve(null); return; }

        // Cancel any in-flight search and claim a new job slot
        _sfWorker.postMessage('stop');
        const myJobId = ++_sfJobId;

        let results = [];
        let done = false;
        const timeout = setTimeout(() => {
            if (!done) { done = true; cleanup(); resolve(results.length ? results : null); }
        }, 8000);
        const callback = (line) => {
            if (done) return;
            // If a newer job started, discard our results
            if (myJobId !== _sfJobId) { done = true; clearTimeout(timeout); cleanup(); resolve(null); return; }
            if (typeof line === 'string' && line.startsWith('info') && line.includes(' pv ')) {
                const depthM = line.match(/depth (\d+)/);
                const mpvM   = line.match(/multipv (\d+)/);
                const scoreM = line.match(/score (cp|mate) (-?\d+)/);
                const pvM    = line.match(/ pv (\S+)/);
                if (depthM && scoreM && pvM && parseInt(depthM[1]) >= depth - 2) {
                    const mpv = mpvM ? parseInt(mpvM[1]) : 1;
                    const entry = {
                        multipv: mpv, move: pvM[1],
                        cp:   scoreM[1] === 'cp'   ? parseInt(scoreM[2]) : undefined,
                        mate: scoreM[1] === 'mate' ? parseInt(scoreM[2]) : undefined
                    };
                    const idx = results.findIndex(r => r.multipv === mpv);
                    if (idx >= 0) results[idx] = entry; else results.push(entry);
                }
            }
            if (typeof line === 'string' && line.startsWith('bestmove')) {
                done = true;
                clearTimeout(timeout);
                cleanup();
                results.sort((a, b) => a.multipv - b.multipv);
                resolve(results.length ? results : null);
            }
        };
        const cleanup = () => {
            const i = _sfWorkerQueue.indexOf(callback);
            if (i >= 0) _sfWorkerQueue.splice(i, 1);
        };
        _sfWorkerQueue.push(callback);
        _sfWorker.postMessage('ucinewgame');
        _sfWorker.postMessage(`setoption name MultiPV value ${multipv}`);
        _sfWorker.postMessage(`position fen ${fen}`);
        _sfWorker.postMessage(`go depth ${depth}`);
    });
}

// ── Cloud Eval ─────────────────────────────────────────────
async function cloudEval(fen, multipv) {
    try {
        const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multipv}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const resp = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || !data.pvs || !data.pvs.length) return null;
        return data.pvs.slice(0, multipv).map((pv, i) => ({
            multipv: i + 1,
            move: pv.moves ? pv.moves.split(' ')[0] : null,
            cp:   pv.cp   !== undefined ? pv.cp   : undefined,
            mate: pv.mate !== undefined ? pv.mate : undefined
        })).filter(r => r.move);
    } catch { return null; }
}

// ── Stockfish Online API (any FEN, single best move only) ──
async function stockfishOnlineAnalyse(fen, depth) {
    try {
        const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${Math.min(depth, 15)}`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const resp = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data.success) return null;

        // Parse UCI move — response is "bestmove e2e4 ponder e7e5" or bare "e2e4"
        let move = data.bestmove || '';
        if (move.startsWith('bestmove ')) move = move.split(' ')[1];
        if (!move || move === '(none)') return null;

        if (data.mate !== null && data.mate !== undefined) {
            return [{ multipv: 1, move, mate: data.mate }];
        }
        // evaluation is in pawns from White's perspective — convert to cp from side-to-move
        const whiteToMove = fen.split(' ')[1] === 'w';
        const cpFromWhite = Math.round((data.evaluation || 0) * 100);
        const cp = whiteToMove ? cpFromWhite : -cpFromWhite;
        return [{ multipv: 1, move, cp }];
    } catch { return null; }
}

// ── sfAnalyse: Cloud Eval → Stockfish Online → local Stockfish ──
async function sfAnalyse(fen, depth, multipv) {
    const ce = await cloudEval(fen, multipv);
    if (ce && ce.length) return ce;
    // stockfish.online only returns 1 best move — use it when that's enough
    if (multipv === 1) {
        const so = await stockfishOnlineAnalyse(fen, depth);
        if (so && so.length) return so;
    }
    return localStockfishAnalyse(fen, depth, multipv);
}

// Convert a UCI move to SAN for a given FEN
function uciToSan(fen, uci) {
    try {
        const c = new Chess(fen);
        const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
        return m ? m.san : uci;
    } catch { return uci; }
}

function hideEngineLoading() {
    document.getElementById('engine-loading').classList.add('hidden');
}

function initStockfish() {
    hideEngineLoading();
    initLocalStockfish(); // fetch + Blob Worker in background
}

// ── Openings ───────────────────────────────────────────────
const OPENINGS = [
    {
        id: 'ruy-lopez', name: 'Spaanse Spel (Ruy Lopez)', icon: '🌶️', badge: 'ruy-lopez',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'e5' },
            { white: 'Nf3', blackExpected: 'Nc6' },
            { white: 'Bb5', blackExpected: null }
        ]
    },
    {
        id: 'italian', name: 'Italiaanse Spel (Italian Game)', icon: '🍕', badge: 'italian',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'e5' },
            { white: 'Nf3', blackExpected: 'Nc6' },
            { white: 'Bc4', blackExpected: null }
        ]
    },
    {
        id: 'scotch', name: 'Skotse Spel (Scotch Game)', icon: '🏰', badge: 'scotch',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'e5' },
            { white: 'Nf3', blackExpected: 'Nc6' },
            { white: 'd4', blackExpected: null }
        ]
    },
    {
        id: 'vienna', name: 'Weense Spel (Vienna Game)', icon: '🎭', badge: 'vienna',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'e5' },
            { white: 'Nc3', blackExpected: null }
        ]
    },
    {
        id: 'bird', name: "Bird se Opening", icon: '🎩', badge: 'bird',
        firstMove: 'f4',
        seed: [
            { white: 'f4', blackExpected: null }
        ]
    },
    {
        id: 'queens-gambit', name: "Koningin se Gambiet (Queen's Gambit)", icon: '👑', badge: 'queens-gambit',
        firstMove: 'd4',
        seed: [
            { white: 'd4', blackExpected: 'd5' },
            { white: 'c4', blackExpected: null }
        ]
    },
    {
        id: 'kings-indian', name: "Konings-Indiese Verdediging (King's Indian)", icon: '🐅', badge: 'kings-indian',
        firstMove: 'd4',
        seed: [
            { white: 'd4', blackExpected: null },
            { white: 'c4', blackExpected: null },
            { white: 'Nc3', blackExpected: null }
        ]
    },
    {
        id: 'nimzo', name: 'Nimzo-Indiese Verdediging (Nimzo-Indian)', icon: '🌀', badge: 'nimzo',
        firstMove: 'd4',
        seed: [
            { white: 'd4', blackExpected: 'Nf6' },
            { white: 'c4', blackExpected: 'e6' },
            { white: 'Nc3', blackExpected: null }
        ]
    },
    {
        id: 'english', name: 'Engelse Opening (English Opening)', icon: '🏴', badge: 'english',
        firstMove: 'c4',
        seed: [
            { white: 'c4', blackExpected: null }
        ]
    },
    {
        id: 'london', name: 'Londense Stelsel (London System)', icon: '🏙️', badge: 'london',
        firstMove: 'd4',
        seed: [
            { white: 'd4', blackExpected: null },
            { white: 'Nf3', blackExpected: null },
            { white: 'Bf4', blackExpected: null }
        ]
    },
    {
        id: 'french', name: 'Franse Verdediging (French Defense)', icon: '🥖', badge: 'french',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'e6' },
            { white: 'd4', blackExpected: null }
        ]
    },
    {
        id: 'caro-kann', name: 'Caro-Kann Verdediging', icon: '🛡️', badge: 'caro-kann',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'c6' },
            { white: 'd4', blackExpected: null }
        ]
    },
    {
        id: 'scandinavian', name: 'Skandinawiese Verdediging (Scandinavian)', icon: '🌊', badge: 'scandinavian',
        firstMove: 'e4',
        seed: [
            { white: 'e4', blackExpected: 'd5' },
            { white: 'exd5', blackExpected: null }
        ]
    },
    {
        id: 'colle', name: 'Colle-Zuckertort Stelsel', icon: '🏔️', badge: 'colle',
        firstMove: 'd4',
        seed: [
            { white: 'd4', blackExpected: null },
            { white: 'Nf3', blackExpected: null },
            { white: 'e3', blackExpected: null },
            { white: 'Bd3', blackExpected: null }
        ]
    }
];

// ── Badge descriptions (for hover tooltips) ───────────────
const BADGE_DESCRIPTIONS = {
    'ruy-lopez':         "Eindig die spel met Swart minstens 'n pion voor teen die Ruy Lopez.",
    'italian':           "Eindig die spel met Swart minstens 'n pion voor teen die Italiaanse Spel.",
    'scotch':            "Eindig die spel met Swart minstens 'n pion voor teen die Skotse Spel.",
    'vienna':            "Eindig die spel met Swart minstens 'n pion voor teen die Weense Spel.",
    'bird':              "Eindig die spel met Swart minstens 'n pion voor teen Bird se Opening.",
    'queens-gambit':     "Eindig die spel met Swart minstens 'n pion voor teen die Koningin se Gambiet.",
    'kings-indian':      "Eindig die spel met Swart minstens 'n pion voor teen die Konings-Indiese Verdediging.",
    'nimzo':             "Eindig die spel met Swart minstens 'n pion voor teen die Nimzo-Indiese Verdediging.",
    'english':           "Eindig die spel met Swart minstens 'n pion voor teen die Engelse Opening.",
    'london':            "Eindig die spel met Swart minstens 'n pion voor teen die Londense Stelsel.",
    'french':            "Eindig die spel met Swart minstens 'n pion voor teen die Franse Verdediging.",
    'caro-kann':         "Eindig die spel met Swart minstens 'n pion voor teen die Caro-Kann Verdediging.",
    'scandinavian':      "Eindig die spel met Swart minstens 'n pion voor teen die Skandinawiese Verdediging.",
    'colle':             "Eindig die spel met Swart minstens 'n pion voor teen die Colle-Zuckertort Stelsel.",
    'flater-gevind':     "Druk die flater-knoppie op die regte oomblik — direk nadat Wit die flater gemaak het.",
    '10-flaters':        "Vind die flater korrek in 10 afsonderlike speletjies (kumulatief oor alle speletjies).",
    'koningin-gevang':   "Vang Wit se koningin in enige speletjie — 'n seldsame trofee!",
    'eerste-vangskoot':  "Vang enige stuk van Wit vir die eerste keer. Elke jagter begin met die eerste skoot.",
    'skaakmat':          "Gee Wit skaakmat voor die 16de skuif. Die hoogste oorwinning!",
    '10-top-skuiwe':     "Speel 10 skuiwe wat die #1 Lichess-skuif was (kumulatief oor alle speletjies).",
    'dominant':          "Eindig die spel met Swart meer as 2 pione voor (eval ≤ -2.0). Totale oorheersing!",
    'teorie-ken':        "Speel 8 aaneenlopende skuiwe wat binne Lichess se top-2 gewildste skuiwe is."
};

function setupBadgeHovers() {
    const tooltipEl = document.getElementById('badge-tooltip');
    const tooltipText = document.getElementById('tooltip-text');
    document.querySelectorAll('.badge-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const desc = BADGE_DESCRIPTIONS[item.dataset.badge];
            if (desc) {
                tooltipEl.classList.add('badge-hover');
                tooltipText.textContent = desc;
            }
        });
        item.addEventListener('mouseleave', () => {
            tooltipEl.classList.remove('badge-hover');
            tooltipText.textContent = "Beweeg oor 'n kenteken om meer te leer.";
        });
    });
}

// ── Game State ─────────────────────────────────────────────
let game = new Chess();
let board = null;
let gameState = {
    currentOpening: null,
    blunderHalfMove: 0,      // which half-move White blunders (17,19,21,23)
    blunderPlayed: false,
    blunderSAN: null,         // SAN of the actual blunder move
    blunderCalledOut: false,
    blunderCalledCorrectly: false,
    buttonGreyedOut: false,
    moveHistory: [],          // { san, fen, isBlunder, isWhite, lichessTopMove }
    halfMoveCount: 0,
    gamePhase: 'idle',        // idle | playing | ended | review
    reviewIndex: 0,
    seedIndex: 0,             // how far we are in the seed sequence
    seedActive: true,         // are we still in seed phase?
    consecutiveTop2: 0,       // for Teoretiese Spel badge
    prevBlackFen: null,       // FEN just before Black's last move (for analysis panel)
    eersteVangskoot: false    // has Black captured yet this game?
};

// ── Player / Persistence ───────────────────────────────────
let currentPlayer = '';
let playerData = {};          // loaded from localStorage

function lsKey(suffix) { return `vindFlater2_${currentPlayer}_${suffix}`; }

function loadPlayerData() {
    playerData = {
        flatersGevind: parseInt(localStorage.getItem(lsKey('flatersGevind')) || '0'),
        topSkuiwe: parseInt(localStorage.getItem(lsKey('topSkuiwe')) || '0'),
        koninginneGevang: parseInt(localStorage.getItem(lsKey('koninginneGevang')) || '0'),
        badgesEarned: JSON.parse(localStorage.getItem(lsKey('badgesEarned')) || '[]'),
        speletjiesPerOpening: JSON.parse(localStorage.getItem(lsKey('speletjiesPerOpening')) || '{}')
    };
    updateStatsDisplay();
    renderBadges();
}

function savePlayerData() {
    if (!currentPlayer) return;
    localStorage.setItem(lsKey('flatersGevind'), playerData.flatersGevind);
    localStorage.setItem(lsKey('topSkuiwe'), playerData.topSkuiwe);
    localStorage.setItem(lsKey('koninginneGevang'), playerData.koninginneGevang);
    localStorage.setItem(lsKey('badgesEarned'), JSON.stringify(playerData.badgesEarned));
    localStorage.setItem(lsKey('speletjiesPerOpening'), JSON.stringify(playerData.speletjiesPerOpening));
}

// ── UI helpers ─────────────────────────────────────────────
function setMessage(msg) {
    document.getElementById('game-message').innerHTML = msg;
}

function updateStatsDisplay() {
    document.getElementById('flaters-gevind').textContent = playerData.flatersGevind;
    document.getElementById('badges-count').textContent = playerData.badgesEarned.length;
    const completeMoves = Math.floor(gameState.halfMoveCount / 2);
    document.getElementById('move-counter').textContent = completeMoves + '/16';
}

function setEval(cpFromWhite) {
    const score = Math.max(-100, Math.min(100, cpFromWhite / 100));
    const el = document.getElementById('position-eval');
    const who = score >= 0.3 ? ' (wit is voor)' : score <= -0.3 ? ' (swart is voor)' : ' (gelyk)';
    el.textContent = (score >= 0 ? '+' : '') + score.toFixed(1) + who;
    el.className = 'stat-value';
    return score;
}

function renderBadges() {
    document.querySelectorAll('.badge-item').forEach(el => {
        const bid = el.dataset.badge;
        if (playerData.badgesEarned.includes(bid)) {
            el.classList.remove('locked');
            el.classList.add('unlocked');
        } else {
            el.classList.add('locked');
            el.classList.remove('unlocked');
        }
    });
    document.getElementById('badges-count').textContent = playerData.badgesEarned.length;
}

function showBadgeNotification(icon, name) {
    const notif = document.getElementById('badge-notification');
    document.getElementById('notif-icon').textContent = icon;
    document.getElementById('notif-text').textContent = 'Nuwe Kenteken: ' + name;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

function showToast(msg) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function awardBadge(badgeId, icon, name) {
    if (playerData.badgesEarned.includes(badgeId)) return false;
    playerData.badgesEarned.push(badgeId);
    savePlayerData();
    renderBadges();
    showBadgeNotification(icon, name);
    return true;
}

// ── Lichess API ────────────────────────────────────────────
async function fetchLichessMoves(fen) {
    try {
        const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&moves=10&topGames=0&recentGames=0`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url, {
            signal: controller.signal,
            headers: { 'Authorization': 'Bearer LICHESS_TOKEN_REDACTED' }
        });
        clearTimeout(timer);
        if (!resp.ok) return [];
        const data = await resp.json();
        if (!data.moves || !data.moves.length) return [];
        return data.moves
            .sort((a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black))
            .map(m => ({
                san: m.san,
                uci: m.uci,
                total: m.white + m.draws + m.black,
                white: m.white,
                draws: m.draws,
                black: m.black
            }));
    } catch (e) {
        return [];
    }
}

// ── Board helpers ──────────────────────────────────────────
function clearHighlights() {
    document.querySelectorAll('.square-55d63').forEach(sq => {
        sq.classList.remove('highlight-last-move', 'highlight-blunder');
    });
}

function highlightSquares(from, to, isBlunder = false) {
    clearHighlights();
    const cls = isBlunder ? 'highlight-blunder' : 'highlight-last-move';
    const fromEl = document.querySelector(`.square-${from}`);
    const toEl = document.querySelector(`.square-${to}`);
    if (fromEl) fromEl.classList.add(cls);
    if (toEl) toEl.classList.add(cls);
}

// ── Move History UI ────────────────────────────────────────
function renderMoveHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    const hist = gameState.moveHistory;

    for (let i = 0; i < hist.length; i += 2) {
        const wMove = hist[i];
        const bMove = hist[i + 1];
        const moveNum = Math.floor(i / 2) + 1;

        const item = document.createElement('div');
        item.className = 'history-item';

        const numSpan = document.createElement('span');
        numSpan.className = 'move-num';
        numSpan.textContent = moveNum + '.';
        item.appendChild(numSpan);

        const wSpan = document.createElement('span');
        wSpan.className = 'white-move';
        wSpan.textContent = wMove.san;
        item.appendChild(wSpan);

        if (bMove) {
            const bSpan = document.createElement('span');
            bSpan.className = 'black-move';
            bSpan.textContent = ' ' + bMove.san;
            item.appendChild(bSpan);
        }

        list.appendChild(item);
    }
    list.scrollTop = list.scrollHeight;
}

// ── Analysis panel update ──────────────────────────────────
// prevFen  = FEN before Black's last move (what Black could have done)
// blackMoveSAN = the SAN Black actually played (or null if White just moved)
async function updateAnalysisPanel(prevFen, blackMoveSAN) {
    const sfEl = document.getElementById('stockfish-moves');
    const lcEl = document.getElementById('lichess-moves');
    const ymEl = document.getElementById('your-move-section');
    const ymInfo = document.getElementById('your-move-info');

    if (!prevFen) {
        sfEl.innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
        lcEl.innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
        ymEl.style.display = 'none';
        return;
    }

    sfEl.innerHTML = '<p class="analysis-placeholder">Bereken...</p>';
    lcEl.innerHTML = '<p class="analysis-placeholder">Bereken...</p>';

    const [sfResult, lcMoves] = await Promise.all([
        sfAnalyse(prevFen, 12, 2),
        fetchLichessMoves(prevFen)
    ]);

    // Stockfish best moves for Black — convert UCI to SAN
    if (sfResult && sfResult.length) {
        sfEl.innerHTML = '';
        sfResult.forEach((r, i) => {
            const san = uciToSan(prevFen, r.move);
            const div = document.createElement('div');
            div.className = `analysis-move-item rank-${i + 1}`;
            // Stockfish cp is from side-to-move (Black) perspective in prevFen
            const cpForBlack = r.cp !== undefined ? r.cp : undefined;
            const evalStr = r.mate !== undefined
                ? `#${r.mate}`
                : (cpForBlack !== undefined ? ((cpForBlack >= 0 ? '+' : '') + (cpForBlack / 100).toFixed(2)) : '?');
            div.innerHTML = `<span class="analysis-move-san">${san}</span>
                             <span class="analysis-move-info">${evalStr}</span>`;
            sfEl.appendChild(div);
        });
    } else {
        sfEl.innerHTML = '<p class="analysis-placeholder">Nie beskikbaar nie</p>';
    }

    // Lichess top moves — with engine fallback when Explorer has no data
    if (lcMoves && lcMoves.length) {
        lcEl.innerHTML = '';
        lcMoves.slice(0, 5).forEach((m, i) => {
            const div = document.createElement('div');
            div.className = `analysis-move-item rank-${Math.min(i + 1, 2)}`;
            const total = m.total || 1;
            const wPct = Math.round(m.white / total * 100);
            const dPct = Math.round(m.draws / total * 100);
            div.innerHTML = `<span class="analysis-move-san">${m.san}</span>
                             <span class="analysis-move-info">W:${wPct}% D:${dPct}%</span>`;
            lcEl.appendChild(div);
        });
    } else {
        // Explorer has no data for this position — fall back to engine top moves
        const lcFallback = await sfAnalyse(prevFen, 12, 5);
        if (lcFallback && lcFallback.length) {
            lcEl.innerHTML = '<p class="analysis-label" style="font-size:0.75em;opacity:0.6;margin:0 0 4px">Buite boek — enjin top skuiwe:</p>';
            lcFallback.forEach((r, i) => {
                const san = uciToSan(prevFen, r.move);
                const div = document.createElement('div');
                div.className = `analysis-move-item rank-${Math.min(i + 1, 2)}`;
                div.innerHTML = `<span class="analysis-move-san">${san}</span>
                                 <span class="analysis-move-info">#${i + 1}</span>`;
                lcEl.appendChild(div);
            });
        } else {
            lcEl.innerHTML = '<p class="analysis-placeholder">Buite boek</p>';
        }
    }

    // Your move quality
    if (blackMoveSAN && lcMoves) {
        ymEl.style.display = 'block';
        const rank = lcMoves.findIndex(m => m.san === blackMoveSAN) + 1;
        if (rank === 1) {
            ymInfo.innerHTML = `<span style="color:#2ecc71">✓ #1 Lichess-skuif!</span>`;
        } else if (rank === 2) {
            ymInfo.innerHTML = `<span style="color:#3498db">✓ #2 Lichess-skuif</span>`;
        } else if (rank > 0) {
            ymInfo.innerHTML = `<span style="color:#f39c12">#${rank} gewildste</span>`;
        } else {
            ymInfo.innerHTML = `<span style="color:#a0a0a0">Buite top Lichess-skuiwe</span>`;
        }
    } else {
        ymEl.style.display = 'none';
    }
}

// ── Opening hint (show after move 4) ──────────────────────
function updateOpeningHint() {
    if (gameState.halfMoveCount < 8) return; // need at least 4 complete moves
    const hintBox = document.getElementById('opening-hint-box');
    const hintText = document.getElementById('opening-hint-text');
    if (!hintBox || !hintText) return;
    hintBox.style.display = '';
    const op = gameState.currentOpening;
    hintText.textContent = `Hierdie lyk soos die ${op.name.split('(')[0].trim()} ${op.icon}`;
}

// ── Live eval ──────────────────────────────────────────────
async function updateLiveEval() {
    const fen = game.fen();
    // Capture whose turn it is NOW from the FEN — before any async gap
    // (White may move while we await, flipping game.turn())
    const whiteToMove = fen.split(' ')[1] === 'w';
    const result = await sfAnalyse(fen, 12, 1);
    if (!result || !result.length) return 0;
    const r = result[0];
    // cp from side-to-move → convert to White's perspective
    let cpFromWhite;
    if (r.mate !== undefined) {
        // r.mate > 0: side-to-move delivers mate (winning); r.mate < 0: side-to-move is mated (losing)
        cpFromWhite = r.mate > 0
            ? (whiteToMove ? 10000 : -10000)
            : (whiteToMove ? -10000 : 10000);
    } else {
        cpFromWhite = whiteToMove ? r.cp : -r.cp;
    }
    setEval(cpFromWhite);
    return cpFromWhite;
}

// ── Blunder generation ─────────────────────────────────────
async function generateBlunderMove(fen) {
    const chess = new Chess(fen);
    const allLegal = chess.moves({ verbose: true });
    if (!allLegal.length) return null;

    // Avoid top Lichess moves (fast, no per-candidate engine calls)
    const lcMoves = await fetchLichessMoves(fen);
    const lcSANs = new Set(lcMoves.slice(0, 5).map(m => m.san));

    let candidates = allLegal.filter(m => !lcSANs.has(m.san));
    if (!candidates.length) candidates = allLegal;

    // Heuristic scoring: prefer moves that lose material or move a valuable piece unnecessarily
    const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const scored = candidates.map(m => {
        let score = 0;
        // Penalise moving a valuable piece to a square that looks risky (heuristic: pure piece value)
        score += (pieceValue[m.piece] || 0);
        // Penalise hanging a piece by not capturing when we could
        score -= (m.captured ? (pieceValue[m.captured] || 0) * 2 : 0);
        score += Math.random() * 0.5;
        return { m, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const pool = scored.slice(0, Math.min(3, scored.length));
    return pool[Math.floor(Math.random() * pool.length)].m;
}

// ── White's move logic ─────────────────────────────────────
async function playWhiteMove() {
    if (gameState.gamePhase !== 'playing') return;
    if (game.turn() !== 'w') return;
    clearSelection(); // clear any lingering click highlights

    const fen = game.fen();
    const halfMove = gameState.halfMoveCount + 1; // this will be White's half-move

    // Check if this is the designated blunder turn
    if (!gameState.blunderPlayed && halfMove === gameState.blunderHalfMove) {
        const blunderMove = await generateBlunderMove(fen);
        if (blunderMove) {
            const result = game.move({ from: blunderMove.from, to: blunderMove.to, promotion: blunderMove.promotion || 'q' });
            if (result) {
                gameState.blunderPlayed = true;
                gameState.blunderSAN = result.san;
                gameState.halfMoveCount++;
                gameState.moveHistory.push({ san: result.san, fen: game.fen(), isBlunder: true, isWhite: true });
                board.position(game.fen());
                highlightSquares(blunderMove.from, blunderMove.to, false); // silent — no red highlight
                renderMoveHistory();
                updateStatsDisplay();
                setMessage('Wit het gespeel. Jou beurt.');
                updateAnalysisPanel(gameState.prevBlackFen, null);
                updateOpeningHint();
                checkGameEnd();
                return;
            }
        }
    }

    // Post-blunder: pick randomly from top 3 to vary play
    if (gameState.blunderPlayed) {
        const sfRes = await sfAnalyse(fen, 14, 3);
        if (sfRes && sfRes.length) {
            const pick = sfRes[Math.floor(Math.random() * Math.min(3, sfRes.length))];
            const uci = pick.move;
            const moved = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
            if (moved) {
                gameState.halfMoveCount++;
                gameState.moveHistory.push({ san: moved.san, fen: game.fen(), isBlunder: false, isWhite: true });
                board.position(game.fen());
                highlightSquares(uci.slice(0, 2), uci.slice(2, 4));
                renderMoveHistory();
                updateStatsDisplay();
                setMessage('Wit het gespeel. Jou beurt.');
                updateAnalysisPanel(gameState.prevBlackFen, null);
                updateOpeningHint();
                checkGameEnd();
                return;
            }
        }
    }

    // Seed phase
    if (gameState.seedActive && gameState.seedIndex < gameState.currentOpening.seed.length) {
        const seedEntry = gameState.currentOpening.seed[gameState.seedIndex];
        const moved = game.move(seedEntry.white);
        if (moved) {
            gameState.seedIndex++;
            gameState.halfMoveCount++;
            gameState.moveHistory.push({ san: moved.san, fen: game.fen(), isBlunder: false, isWhite: true });
            board.position(game.fen());
            highlightSquares(moved.from, moved.to);
            renderMoveHistory();
            updateStatsDisplay();
            setMessage('Wit het gespeel. Jou beurt.');
            updateAnalysisPanel(gameState.prevBlackFen, null);
            updateOpeningHint();
            checkGameEnd();
            return;
        }
        gameState.seedActive = false;
    }

    // Lichess top-2
    const lcMoves = await fetchLichessMoves(fen);
    if (lcMoves && lcMoves.length >= 1) {
        const top2 = lcMoves.slice(0, 2);
        const choice = top2[Math.floor(Math.random() * top2.length)];
        const moved = game.move(choice.san);
        if (moved) {
            gameState.halfMoveCount++;
            gameState.moveHistory.push({ san: moved.san, fen: game.fen(), isBlunder: false, isWhite: true });
            board.position(game.fen());
            highlightSquares(moved.from, moved.to);
            renderMoveHistory();
            updateStatsDisplay();
            setMessage('Wit het gespeel. Jou beurt.');
            updateAnalysisPanel(gameState.prevBlackFen, null);
            updateOpeningHint();
            checkGameEnd();
            return;
        }
    }

    // Stockfish fallback
    const sfRes = await sfAnalyse(fen, 14, 1);
    if (sfRes && sfRes.length) {
        const uci = sfRes[0].move;
        const moved = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
        if (moved) {
            gameState.halfMoveCount++;
            gameState.moveHistory.push({ san: moved.san, fen: game.fen(), isBlunder: false, isWhite: true });
            board.position(game.fen());
            highlightSquares(uci.slice(0, 2), uci.slice(2, 4));
            renderMoveHistory();
            updateStatsDisplay();
            setMessage('Wit het gespeel. Jou beurt.');
            updateAnalysisPanel(gameState.prevBlackFen, null);
            updateOpeningHint();
            checkGameEnd();
            return;
        }
    }

    // Last resort: random legal move (guarantees game never gets stuck)
    const allLegal = game.moves({ verbose: true });
    if (allLegal.length) {
        const pick = allLegal[Math.floor(Math.random() * allLegal.length)];
        const moved = game.move({ from: pick.from, to: pick.to, promotion: pick.promotion || 'q' });
        if (moved) {
            gameState.halfMoveCount++;
            gameState.moveHistory.push({ san: moved.san, fen: game.fen(), isBlunder: false, isWhite: true });
            board.position(game.fen());
            highlightSquares(moved.from, moved.to);
            renderMoveHistory();
            updateStatsDisplay();
            setMessage('Wit het gespeel. Jou beurt.');
            updateAnalysisPanel(gameState.prevBlackFen, null);
            updateOpeningHint();
            checkGameEnd();
        }
    }
}

// ── Black's move result handler (called after move is validated) ──
async function onBlackMoveResult(preFen, moveResult) {
    gameState.halfMoveCount++;
    gameState.prevBlackFen = preFen; // save for analysis panel

    // Check seed deviation: if Black didn't play the expected response, exit seed
    if (gameState.seedActive && gameState.seedIndex > 0) {
        const lastSeedEntry = gameState.currentOpening.seed[gameState.seedIndex - 1];
        if (lastSeedEntry && lastSeedEntry.blackExpected && moveResult.san !== lastSeedEntry.blackExpected) {
            gameState.seedActive = false;
        }
    }

    // Capture detection
    if (moveResult.captured) {
        // Eerste Vangskoot
        if (!gameState.eersteVangskoot) {
            gameState.eersteVangskoot = true;
            awardBadge('eerste-vangskoot', '⚔️', 'Eerste Vangskoot');
        }
        // Queen capture
        if (moveResult.captured === 'q') {
            playerData.koninginneGevang++;
            savePlayerData();
            awardBadge('koningin-gevang', '♛', 'Koningin Gevang');
        }
    }

    const lcCheck = await fetchLichessMoves(preFen);
    const isTop1 = lcCheck.length > 0 && lcCheck[0].san === moveResult.san;
    const isTop2 = lcCheck.length > 1 && lcCheck[1].san === moveResult.san;

    if (isTop1) {
        playerData.topSkuiwe++;
        savePlayerData();
        if (playerData.topSkuiwe >= 10) awardBadge('10-top-skuiwe', '🌟', '10 Top Skuiwe');
    }

    if (isTop1 || isTop2) {
        gameState.consecutiveTop2++;
        if (gameState.consecutiveTop2 >= 8) awardBadge('teorie-ken', '🧠', 'Teorie Ken');
    } else {
        gameState.consecutiveTop2 = 0;
    }

    gameState.moveHistory.push({
        san: moveResult.san,
        fen: game.fen(),
        isBlunder: false,
        isWhite: false,
        lichessTop1: isTop1
    });

    highlightSquares(moveResult.from, moveResult.to);
    renderMoveHistory();
    updateStatsDisplay();
    // Analysis panel first (may start a Stockfish job for prevFen),
    // then eval last — so eval always holds the newest job ID and wins.
    updateAnalysisPanel(preFen, moveResult.san);
    updateLiveEval();

    if (checkGameEnd()) return;

    // Blank eval while White is thinking — it reflects Black's last board state
    const evalEl = document.getElementById('position-eval');
    evalEl.textContent = '—';
    evalEl.className = 'stat-value';

    setMessage('Wit dink...');
    setTimeout(() => playWhiteMove(), 300);
}

// ── Game end ───────────────────────────────────────────────
function checkGameEnd() {
    const isCheckmate = game.in_checkmate();
    const isStalemate = game.in_stalemate();
    const isDraw = game.in_draw();
    const maxReached = gameState.halfMoveCount >= 32;

    if (!isCheckmate && !isStalemate && !isDraw && !maxReached) return false;

    gameState.gamePhase = 'ended';
    // Disable flater button
    const btn = document.getElementById('flater-btn');
    btn.disabled = true;
    btn.classList.add('greyed-out');

    // Rebuild move history with blunder highlighted
    renderMoveHistory();

    // Get final eval then show modal
    // Capture FEN and side-to-move NOW (synchronously) before the async gap,
    // so the callback uses the position that was actually analysed.
    const finalFen = game.fen();
    const whiteToMoveAtEnd = finalFen.split(' ')[1] === 'w';
    sfAnalyse(finalFen, 12, 1).then(sfRes => {
        let finalCpFromWhite = 0;
        if (sfRes && sfRes.length) {
            const r = sfRes[0];
            if (r.mate !== undefined) {
                finalCpFromWhite = r.mate > 0
                    ? (whiteToMoveAtEnd ? 10000 : -10000)
                    : (whiteToMoveAtEnd ? -10000 : 10000);
            } else {
                finalCpFromWhite = whiteToMoveAtEnd ? r.cp : -r.cp;
            }
        }
        if (isCheckmate && whiteToMoveAtEnd) finalCpFromWhite = -10000; // Black mated White
        if (isCheckmate && !whiteToMoveAtEnd) finalCpFromWhite = 10000; // White mated Black

        setEval(finalCpFromWhite);

        // Positive cpFromWhite = White winning; negative = Black winning
        const blackMatedWhite = isCheckmate && whiteToMoveAtEnd;
        const blackWins = finalCpFromWhite <= -100 || blackMatedWhite;

        // Award opening badge
        const opening = gameState.currentOpening;
        if (blackWins) {
            awardBadge(opening.badge, opening.icon, opening.name.split('(')[0].trim());
        }

        // Skaakmat badge
        if (blackMatedWhite) {
            awardBadge('skaakmat', '💀', 'Skaakmat!');
        }

        // Dominant badge: Black ahead by 2+ pawns
        if (finalCpFromWhite <= -200 || blackMatedWhite) {
            awardBadge('dominant', '🔥', 'Dominante Spel');
        }

        // Increment games per opening
        const oid = opening.id;
        playerData.speletjiesPerOpening[oid] = (playerData.speletjiesPerOpening[oid] || 0) + 1;
        savePlayerData();

        // Determine result text
        let resultText;
        if (isCheckmate && whiteToMoveAtEnd) resultText = '💀 Skaakmat! Swart wen!';
        else if (isCheckmate) resultText = 'Wit het Skaakmat gegee. Wit wen.';
        else if (isStalemate || isDraw) resultText = '½ Remise';
        else resultText = '16 skuiwe bereik. Spel verby.';

        // Blunder reveal
        const blunderMoveNum = Math.ceil(gameState.blunderHalfMove / 2);
        const blunderReveal = gameState.blunderSAN
            ? `Die flater was: Wit se skuif ${blunderMoveNum}: <span class="blunder-highlight">${gameState.blunderSAN}</span>. ` +
              (gameState.blunderCalledCorrectly ? '✅ Jy het dit gevind!' : gameState.blunderCalledOut ? "❌ Sterkte vir nog 'n probeerslag!" : '❌ Jy het dit gemis.')
            : 'Geen flater gespeel nie.';

        // Build eval string — cap at ±100 for checkmate display
        const evalScore = Math.max(-100, Math.min(100, finalCpFromWhite / 100));
        const evalWho = evalScore >= 0.3 ? '(Wit is voor)' : evalScore <= -0.3 ? '(Swart is voor)' : '(Gelyk)';
        const evalStr = (evalScore >= 0 ? '+' : '') + evalScore.toFixed(1) + ' ' + evalWho;
        showModal(resultText, blunderReveal, `Finale eval: ${evalStr}`);
    });

    return true;
}

function showModal(result, blunderReveal, evalText) {
    document.getElementById('modal-result').innerHTML = result;
    document.getElementById('modal-blunder-reveal').innerHTML = blunderReveal;
    document.getElementById('modal-eval').textContent = evalText;
    document.getElementById('game-over-modal').classList.add('show');
}

// ── Flater Button ──────────────────────────────────────────
function setupFlaterButton() {
    const btn = document.getElementById('flater-btn');
    btn.onclick = function () {
        if (gameState.gamePhase !== 'playing') return;
        if (gameState.blunderCalledOut) return;

        gameState.blunderCalledOut = true;

        // Correct: it's Black's turn AND halfMoveCount equals blunderHalfMove
        // (White just played the blunder, halfMoveCount was incremented to blunderHalfMove,
        //  Black hasn't moved yet so halfMoveCount is still at blunderHalfMove)
        const isCorrect = gameState.blunderPlayed &&
            game.turn() === 'b' &&
            gameState.halfMoveCount === gameState.blunderHalfMove;

        if (isCorrect) {
            gameState.blunderCalledCorrectly = true;
            playerData.flatersGevind++;
            savePlayerData();
            updateStatsDisplay();

            // First-time badge
            awardBadge('flater-gevind', '🎯', 'Flater Gevind');
            if (playerData.flatersGevind >= 10) awardBadge('10-flaters', '😂', 'Lekker Maters — dis 10 Flaters!');

            showToast('Mooi man! +1 punt! 🎯');

            // Hide button with animation
            btn.classList.add('correct-flash');
            setTimeout(() => { btn.style.display = 'none'; }, 500);
        } else {
            // Wrong guess — grey out permanently
            btn.classList.add('greyed-out');
            btn.disabled = true;
            gameState.buttonGreyedOut = true;
        }
    };
}

// ── New Game ───────────────────────────────────────────────
function newGame() {
    game = new Chess();
    gameState = {
        currentOpening: OPENINGS[Math.floor(Math.random() * OPENINGS.length)],
        blunderHalfMove: [17, 19, 21, 23][Math.floor(Math.random() * 4)],
        blunderPlayed: false,
        blunderSAN: null,
        blunderCalledOut: false,
        blunderCalledCorrectly: false,
        buttonGreyedOut: false,
        moveHistory: [],
        halfMoveCount: 0,
        gamePhase: 'playing',
        reviewIndex: 0,
        seedIndex: 0,
        seedActive: true,
        consecutiveTop2: 0,
        prevBlackFen: null,
        eersteVangskoot: false
    };

    // Reset board
    board.position('start');
    board.orientation('black');

    // Reset UI
    document.getElementById('history-list').innerHTML = '';
    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('analysis-panel').style.display = '';
    document.getElementById('review-panel').style.display = 'none';
    document.getElementById('opening-hint-box').style.display = 'none';
    document.getElementById('stockfish-moves').innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    document.getElementById('lichess-moves').innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    document.getElementById('your-move-section').style.display = 'none';
    document.getElementById('position-eval').textContent = '—';
    document.getElementById('position-eval').className = 'stat-value';

    // Reset flater button
    const btn = document.getElementById('flater-btn');
    btn.style.display = '';
    btn.disabled = false;
    btn.className = 'flater-btn';

    updateStatsDisplay();
    setMessage('Nuwe spel begin! Wit is aan die beurt...');

    // White plays first
    setTimeout(() => playWhiteMove(), 500);
}

// ── Review Mode ────────────────────────────────────────────
function enterReviewMode() {
    gameState.gamePhase = 'review';
    gameState.reviewIndex = gameState.moveHistory.length;
    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('analysis-panel').style.display = 'none';
    document.getElementById('review-panel').style.display = '';
    renderReviewPosition();
}

function renderReviewPosition() {
    const idx = gameState.reviewIndex;
    const hist = gameState.moveHistory;

    if (idx === 0) {
        board.position('start');
    } else {
        board.position(hist[idx - 1].fen);
    }

    const moveNum = Math.ceil(idx / 2);
    document.getElementById('review-position').textContent = `Skuif ${moveNum} / ${Math.ceil(hist.length / 2)}`;

    document.getElementById('review-back-btn').disabled = idx === 0;
    document.getElementById('review-forward-btn').disabled = idx >= hist.length;

    // Show analysis for this position
    const fen = idx === 0 ? new Chess().fen() : hist[idx - 1].fen;
    const list = document.getElementById('best-moves-list');
    list.innerHTML = '<p style="color:#888;font-size:0.8rem">Laai...</p>';

    Promise.all([sfAnalyse(fen, 12, 2), fetchLichessMoves(fen)]).then(([sfRes, lcMoves]) => {
        list.innerHTML = '';
        if (sfRes) {
            sfRes.forEach((r, i) => {
                const div = document.createElement('div');
                div.className = `best-move-item rank-${i + 1}`;
                const evalStr = r.mate !== undefined ? `#${r.mate}` : ((r.cp >= 0 ? '+' : '') + (r.cp / 100).toFixed(2));
                div.innerHTML = `<span class="best-move-san">${r.move}</span>
                                 <span class="best-move-stats">SF: ${evalStr}</span>`;
                list.appendChild(div);
            });
        }
        if (lcMoves && lcMoves.length) {
            lcMoves.slice(0, 3).forEach((m, i) => {
                const div = document.createElement('div');
                div.className = `best-move-item rank-${Math.min(i + 1, 2)}`;
                const total = m.total || 1;
                div.innerHTML = `<span class="best-move-san">${m.san}</span>
                                 <span class="best-move-stats">Lichess: W${Math.round(m.white/total*100)}% D${Math.round(m.draws/total*100)}%</span>`;
                list.appendChild(div);
            });
        }
        if (!sfRes && (!lcMoves || !lcMoves.length)) {
            list.innerHTML = '<p style="color:#888;font-size:0.8rem">Geen data</p>';
        }
    });
}

// ── Click-to-move (two-click system with legal move dots) ──
let selectedSquare = null;

function clearSelection() {
    selectedSquare = null;
    $('#board .square-55d63').removeClass('highlight-selected highlight-legal-move');
}

function showLegalMoves(square) {
    const moves = game.moves({ square: square, verbose: true });
    moves.forEach(m => $(`#board .square-${m.to}`).addClass('highlight-legal-move'));
}

function attemptClickMove(from, to) {
    const piece = game.get(from);
    const isPromotion = piece && piece.type === 'p' && to[1] === '1'; // Black promotes on rank 1
    const preFen = game.fen();

    const move = game.move({ from, to, promotion: isPromotion ? 'q' : undefined });
    clearSelection();
    if (!move) return;

    board.position(game.fen());
    onBlackMoveResult(preFen, move);
}

function setupClickToMove() {
    $('#board').on('click', '.square-55d63', function () {
        if (gameState.gamePhase !== 'playing') return;
        if (game.turn() !== 'b') return;

        const classList = $(this).attr('class').split(/\s+/);
        let clickedSquare = null;
        for (let i = 0; i < classList.length; i++) {
            const match = classList[i].match(/^square-([a-h][1-8])$/);
            if (match) { clickedSquare = match[1]; break; }
        }
        if (!clickedSquare) return;

        const clickedPiece = game.get(clickedSquare);

        if (selectedSquare) {
            if (clickedSquare === selectedSquare) { clearSelection(); return; }

            // Reselect another Black piece
            if (clickedPiece && clickedPiece.color === 'b') {
                clearSelection();
                selectedSquare = clickedSquare;
                $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
                showLegalMoves(clickedSquare);
                return;
            }

            // Attempt the move (will silently fail if illegal)
            attemptClickMove(selectedSquare, clickedSquare);
            return;
        }

        // First click — select a Black piece
        if (clickedPiece && clickedPiece.color === 'b') {
            selectedSquare = clickedSquare;
            $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
            showLegalMoves(clickedSquare);
        }
    });
}

// ── Board init ─────────────────────────────────────────────
function initBoard() {
    board = Chessboard('board', {
        position: 'start',
        orientation: 'black',
        draggable: false,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });
    setupClickToMove();
}


// ── Event listeners ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initStockfish();
    initBoard();
    loadPlayerData();
    setupFlaterButton();
    setupBadgeHovers();

    document.getElementById('new-game-btn').addEventListener('click', () => {
        newGame();
    });

    document.getElementById('modal-new-game').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.remove('show');
        newGame();
    });

    document.getElementById('modal-review').addEventListener('click', () => {
        enterReviewMode();
    });

    document.getElementById('review-back-btn').addEventListener('click', () => {
        if (gameState.reviewIndex > 0) {
            gameState.reviewIndex--;
            renderReviewPosition();
        }
    });

    document.getElementById('review-forward-btn').addEventListener('click', () => {
        if (gameState.reviewIndex < gameState.moveHistory.length) {
            gameState.reviewIndex++;
            renderReviewPosition();
        }
    });

    document.getElementById('exit-review-btn').addEventListener('click', () => {
        gameState.gamePhase = 'ended';
        document.getElementById('review-panel').style.display = 'none';
        document.getElementById('analysis-panel').style.display = '';
        board.position(game.fen());
    });

    document.getElementById('player-select').addEventListener('change', e => {
        currentPlayer = e.target.value;
        loadPlayerData();
    });

    setMessage('Welkom by Vind die Flater! Klik "Nuwe Spel" om te begin.');

});
