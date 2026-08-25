// Philidor & Old Indian Defence Trainer
// Computer plays White, student plays Black — 30 moves

// ==================== STOCKFISH ENGINE ====================

let stockfishEngine = null;
let stockfishReady = false;

// Job-ID isolation for the local worker: only ONE UCI job is ever "active" at a
// time, and every engine message is routed to that job alone. Concurrent callers
// (e.g. Black's move-analysis query and White's own move-selection query) queue
// up and run strictly one-after-another, so a late/mismatched engine line can
// never get attributed to the wrong FEN/request. See root CLAUDE.md pitfall #4.
let stockfishJobCounter  = 0;
let stockfishActiveJob   = null; // { id, callback }
let stockfishRequestQueue = [];  // [{ fen, depth, multipv, resolve }]

function initStockfish() {
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(r => r.text())
        .then(code => {
            try {
                const blob = new Blob([code], { type: 'application/javascript' });
                stockfishEngine = new Worker(URL.createObjectURL(blob));
                stockfishEngine.onmessage = function(event) {
                    const line = event.data;
                    if (line === 'uciok' || line === 'readyok') stockfishReady = true;
                    if (stockfishActiveJob && stockfishActiveJob.callback) stockfishActiveJob.callback(line);
                };
                stockfishEngine.onerror = e => { console.error('SF worker error:', e); };
                stockfishEngine.postMessage('uci');
            } catch (e) {
                console.error('Failed to create SF worker:', e);
                stockfishEngine = null;
            }
        })
        .catch(e => { console.error('Failed to fetch SF:', e); stockfishEngine = null; });
}

function getLocalStockfishEval(fen, depth = 12, multipv = 2) {
    return new Promise(resolve => {
        if (!stockfishEngine) { resolve(null); return; }
        stockfishRequestQueue.push({ fen, depth, multipv, resolve });
        pumpStockfishQueue();
    });
}

// Starts the next queued request only once no job is currently active — this is
// what guarantees a single in-flight FEN/depth/multipv per engine message.
function pumpStockfishQueue() {
    if (stockfishActiveJob || stockfishRequestQueue.length === 0) return;

    const { fen, depth, multipv, resolve } = stockfishRequestQueue.shift();
    const jobId = ++stockfishJobCounter;
    let results = [], resolved = false;

    const finish = value => {
        if (resolved) return;
        resolved = true;
        if (stockfishActiveJob && stockfishActiveJob.id === jobId) stockfishActiveJob = null;
        resolve(value);
        pumpStockfishQueue(); // hand the engine to the next queued caller, if any
    };

    const callback = line => {
        // Belt-and-braces: ignore anything arriving after this job already resolved
        // (e.g. a straggling 'info' line racing the timeout).
        if (resolved || !stockfishActiveJob || stockfishActiveJob.id !== jobId) return;
        if (line.startsWith && line.startsWith('info') && line.includes(' pv ')) {
            const depthM = line.match(/depth (\d+)/);
            const mpvM   = line.match(/multipv (\d+)/);
            const scoreM = line.match(/score (cp|mate) (-?\d+)/);
            const pvM    = line.match(/ pv (.+)/);
            if (depthM && pvM && scoreM && parseInt(depthM[1]) >= depth - 2) {
                const mpv = mpvM ? parseInt(mpvM[1]) : 1;
                const res = { multipv: mpv, moves: pvM[1].split(' ')[0],
                              cp: scoreM[1]==='cp' ? parseInt(scoreM[2]) : undefined,
                              mate: scoreM[1]==='mate' ? parseInt(scoreM[2]) : undefined };
                const idx = results.findIndex(r => r.multipv === mpv);
                if (idx >= 0) results[idx] = res; else results.push(res);
            }
        }
        if (line.startsWith && line.startsWith('bestmove')) {
            results.sort((a, b) => a.multipv - b.multipv);
            finish(results.length > 0 ? results : null);
        }
    };

    stockfishActiveJob = { id: jobId, callback };
    stockfishEngine.postMessage('ucinewgame');
    stockfishEngine.postMessage(`setoption name MultiPV value ${multipv}`);
    stockfishEngine.postMessage(`position fen ${fen}`);
    stockfishEngine.postMessage(`go depth ${depth}`);

    setTimeout(() => {
        if (resolved || !stockfishActiveJob || stockfishActiveJob.id !== jobId) return;
        results.sort((a, b) => a.multipv - b.multipv);
        finish(results.length > 0 ? results : null);
    }, 8000);
}

// ==================== CANVAS ARROW SYSTEM ====================

let arrowCanvas = null;
let arrowCtx    = null;

function initArrowCanvas() {
    arrowCanvas = document.getElementById('board-arrows');
    arrowCtx    = arrowCanvas ? arrowCanvas.getContext('2d') : null;
    resizeArrowCanvas();
}

function resizeArrowCanvas() {
    const boardEl = document.getElementById('board');
    if (!boardEl || !arrowCanvas) return;
    const size = boardEl.offsetWidth;
    arrowCanvas.width  = size;
    arrowCanvas.height = size;
    arrowCanvas.style.width  = size + 'px';
    arrowCanvas.style.height = size + 'px';
}

function clearArrows() {
    if (!arrowCtx || !arrowCanvas) return;
    arrowCtx.clearRect(0, 0, arrowCanvas.width, arrowCanvas.height);
}

// Convert algebraic square name to pixel centre (for flipped board — Black at bottom).
// Flipped board: file 'a' is on the RIGHT, rank 8 is at the BOTTOM.
function squareToXY(square) {
    const squareSize = arrowCanvas ? arrowCanvas.width / 8 : 60;
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0=a … 7=h
    const rank = parseInt(square[1]);                        // 1–8
    // In Black-perspective (flipped):
    //   file 'a' appears at column 7 (rightmost)  → x = (7 - file) * s + s/2
    //   rank 8 appears at row 7 (bottommost)       → y = (rank - 1) * s + s/2
    return {
        x: (7 - file) * squareSize + squareSize / 2,
        y: (rank - 1) * squareSize + squareSize / 2
    };
}

// Hawk-Eye-style hint: a dotted trajectory ending in a small seamed "ball"
// on the target square, instead of a plain arrowhead.
function drawArrow(from, to, color) {
    if (!arrowCtx || !arrowCanvas) return;
    const squareSize = arrowCanvas.width / 8;
    const fp = squareToXY(from);
    const tp = squareToXY(to);

    const dx    = tp.x - fp.x;
    const dy    = tp.y - fp.y;
    const angle = Math.atan2(dy, dx);

    const ballRadius = squareSize * 0.16;
    const lineWidth   = squareSize * 0.085;
    const startOff    = squareSize * 0.20; // offset from source centre
    const endOff      = ballRadius * 1.35;

    const sx = fp.x + Math.cos(angle) * startOff;
    const sy = fp.y + Math.sin(angle) * startOff;
    const ex = tp.x - Math.cos(angle) * endOff;
    const ey = tp.y - Math.sin(angle) * endOff;

    arrowCtx.save();
    arrowCtx.globalAlpha = 0.88;
    arrowCtx.strokeStyle = color;
    arrowCtx.fillStyle   = color;
    arrowCtx.lineWidth   = lineWidth;
    arrowCtx.lineCap     = 'round';
    arrowCtx.setLineDash([lineWidth * 0.4, lineWidth * 2.1]);

    // Dotted trajectory
    arrowCtx.beginPath();
    arrowCtx.moveTo(sx, sy);
    arrowCtx.lineTo(ex, ey);
    arrowCtx.stroke();
    arrowCtx.setLineDash([]);

    // Ball at the target square, with a small seam mark
    arrowCtx.beginPath();
    arrowCtx.arc(tp.x, tp.y, ballRadius, 0, Math.PI * 2);
    arrowCtx.fill();
    arrowCtx.strokeStyle = 'rgba(10,10,10,0.55)';
    arrowCtx.lineWidth   = ballRadius * 0.22;
    arrowCtx.beginPath();
    arrowCtx.moveTo(tp.x - ballRadius * 0.55, tp.y - ballRadius * 0.35);
    arrowCtx.quadraticCurveTo(tp.x, tp.y, tp.x - ballRadius * 0.55, tp.y + ballRadius * 0.35);
    arrowCtx.stroke();

    arrowCtx.restore();
}

// Resolve a SAN string to { from, to } using chess.js.
function sanToFromTo(fen, san) {
    try {
        const tmp   = new Chess(fen);
        const moves = tmp.moves({ verbose: true });
        const m     = moves.find(mv => mv.san === san);
        return m ? { from: m.from, to: m.to } : null;
    } catch (e) { return null; }
}

// ==================== GAME STATE ====================

let game               = new Chess();
let board              = null;
let currentMoveNumber  = 1;
let score              = 0;
let gameOver           = false;
let gameEndReason      = 'moves'; // 'moves' | 'checkmate-white-wins' | 'checkmate-black-wins' | 'draw'
let moveHistory        = [];
let positionHistory    = [];
let bestMove           = null;   // { san, from, to, source }
let isThinking         = false;
let isReviewMode       = false;
let reviewPosition     = 0;
let selectedSquare     = null;
let highScore          = 0;
let unlockedBadges     = new Set();
let badgesEarnedThisGame = [];
let perfectMovesThisGame = 0;
let currentPlayer      = 'Debora';
let lastWhiteMoveSan   = null;
let lastWhiteFenBefore = null;
let antoshinExd4Played = false;

const TARGET_SCORE   = 165; // a real, reachable target -- not the flawless 180 (30 x 6) max
const MAX_MOVES      = 30;
const WHITE_POOL_SIZES = [20, 16, 8, 4, 2, 2];
// Flat win bonus for delivering checkmate -- not full marks. Full marks would
// let a fast forced mate trivialise the 165-run target (a handful of decent
// moves + one mate = "perfect game"); a bonus instead rewards the win as its
// own achievement on top of whatever move-quality was actually earned.
const MATE_BONUS     = 30;

// ==================== STORAGE KEYS ====================

function getHighScoreKey() { return `philidorOldIndian_${currentPlayer}_highScore`; }
function getBadgesKey()    { return `philidorOldIndian_${currentPlayer}_badges`; }

// ==================== WISDOM & BADGE DATA ====================

const WISDOM_QUOTES = [
    "...d6 is soos 'n vertroude verdedigende bal — dit werk teen vinnige boulwerk (e4) én stadige spin (d4).",
    "Philidor het gesê pionne is die siel van skaak — d6 is die eerste bal van daardie beurt.",
    "Bou jou posisie soos 'n goeie beurt — lopie vir lopie, nie roekeloos nie.",
    "Die Hanham-opstelling speel soos 'n verdedigende kolwer: Nd7, Ngf6, Be7, dan rokade — paaltjies in die hand.",
    "In die Ou-Indiër ontwikkel jou loper na e7 — nie 'n groot slag nie, maar 'n betroubare enkelloop.",
    "Moheschunder Bannerjee het hierdie idees in Calcutta gespeel — dieselfde stad waar krieket-koors al vir 200 jaar brand.",
    "Tartakower het die naam 'Indiër' voorgestel uit respek — 'n eerbewys, soos 'n gehoor wat vir 'n goeie kolwer opstaan.",
    "Chigorin het die Ou-Indiër ontwikkel — soliede tegniek bo flambojante slae.",
    "'n Fianchetto na g7 verander jou hele beurt-plan — weet watter pad jy kies voor jy swaai.",
    "Philidor self was aggressief: hy het ...f5 aanbeveel — soms moet jy vir die grens slaan, nie net verdedig nie.",
    "Morphy se opponente in die Opera-spel het roekeloos ...Bg4 gespeel — 'n wanhopige slag wat 'n paaltjie gekos het.",
    "Geduld bou 'n groot telling; haas bou net 'n vroeë paaltjie.",
    "'n Perd op d7 lyk passief, maar soos 'n goeie veldwagter hou dit al die belangrike velde dop.",
    "Speel nooit vir die grens voor jou ontwikkeling reg is nie — bou eers jou beurt, val dan aan.",
    "Die Tsjeggiese Variasie (...c6) is 'n stil enkelloop — geen groot slag nie, maar geen fout ook nie.",
    "Janowski het ...Bf5 gespeel om sy loper betyds uit te kry — soos 'n kolwer wat vroeg sy skoot kies.",
    "Elke groot beurt begin met een bal wat reg gespeel is.",
    "'n Koningin gevang is soos 'n groot paaltjie — maar 'n goeie beurt wen die meeste wedstryde."
];

const BADGE_DESCRIPTIONS = {
    'd6-boumeester':          "Bereik 165 lopies of meer in een spel — 'n uitstekende beurt!",
    'philidor-verdediger':    "Voltooi 'n spel in die Philidor-tak (1.e4 was Wit se eerste skuif).",
    'ou-indier-boumeester':   "Voltooi 'n spel in die Ou-Indiër-tak (1.d4 of 1.c4 was Wit se eerste skuif).",
    'hanham-vesting':         "Bereik die Hanham-opstelling: Nd7, Ngf6 (of Nf6), Be7, en rokade op g8.",
    'antoshin-blok':          "Speel ...exd4 en bereik dan Be7 plus rokade — die Antoshin-variasie.",
    'philidors-eie-keuse':    "Speel die gewaagde ...f5-stoot in die Philidor-tak — Philidor se eie aanbeveling!",
    'opera-spook':            "Speel ...Bg4 in die Philidor-tak — die Hertog van Brunswick se lyn teen Morphy.",
    'chigorin-hoofline':      "Bereik die Ou-Indiër hooflyn: ...Nbd7 met ...e5 en Wit se pion op e4.",
    'janowski-blok':          "Speel ...Bf5 in die Ou-Indiër-tak voor die pion die loper toemaak.",
    'tsjeggiese-fondament':   "Speel ...c6 in die Ou-Indiër-tak — die Tsjeggiese Variasie.",
    'tartakower-indier':      "Speel ...Bg4 in die Ou-Indiër-tak — die Tartakower-stelsel.",
    'koning-indier-oorgang':  "Fianchetto met ...g6 + ...Bg7 i.p.v. ...Be7 — oorgang na Koning-Indiër idees.",
    'koningin-jagter':        "Vang Wit se koningin tydens die spel. 'n Seldsame en groot trofee!",
    'teoretikus':             "Bereik 15 of meer perfekte skuiwe (6 lopies elk) in een spel.",
    'grootmeester':           "Bereik 21 of meer perfekte skuiwe (6 lopies elk) in een spel.",
    'oorheersend':            "Eindig die spel met 'n evaluasie van -2.0 of beter (in Swart se guns)."
};

const BADGES = {
    'd6-boumeester':          { icon: '🏆',  name: 'd6-Boumeester' },
    'philidor-verdediger':    { icon: '🛡️',  name: 'Philidor Verdediger' },
    'ou-indier-boumeester':   { icon: '🏟️',  name: 'Ou-Indiër Boumeester' },
    'hanham-vesting':         { icon: '🏰',  name: 'Hanham Vesting' },
    'antoshin-blok':          { icon: '🧱',  name: 'Antoshin Blok' },
    'philidors-eie-keuse':    { icon: '⚔️',  name: "Philidor se Eie Keuse" },
    'opera-spook':            { icon: '🎭',  name: 'Opera-spook' },
    'chigorin-hoofline':      { icon: '♞',   name: 'Chigorin Hooflyn' },
    'janowski-blok':          { icon: '💎',  name: 'Janowski Blok' },
    'tsjeggiese-fondament':   { icon: '🏗️',  name: 'Tsjeggiese Fondament' },
    'tartakower-indier':      { icon: '📖',  name: 'Tartakower-Indiër' },
    'koning-indier-oorgang':  { icon: '👑',  name: 'Koning-Indiër Oorgang' },
    'koningin-jagter':        { icon: '♛',   name: 'Koningin Jagter' },
    'teoretikus':             { icon: '📚',  name: 'Teoretikus' },
    'grootmeester':           { icon: '🥇',  name: 'Grootmeester' },
    'oorheersend':            { icon: '🔥',  name: 'Oorheersend' }
};

let currentWisdom = '';

// ==================== BADGE TOOLTIP SYSTEM ====================

function selectRandomWisdom() {
    currentWisdom = WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
    showWisdom();
}

function showWisdom() {
    const tooltip = document.getElementById('badge-tooltip');
    const text    = document.getElementById('tooltip-text');
    tooltip.classList.remove('badge-hover');
    text.textContent = currentWisdom;
}

function showBadgeDescription(badgeId) {
    const tooltip = document.getElementById('badge-tooltip');
    const text    = document.getElementById('tooltip-text');
    const desc    = BADGE_DESCRIPTIONS[badgeId];
    if (desc) {
        tooltip.classList.add('badge-hover');
        text.textContent = desc;
    }
}

function setupBadgeHovers() {
    document.querySelectorAll('.badge-item').forEach(item => {
        const badgeId = item.dataset.badge;
        item.addEventListener('mouseenter', () => showBadgeDescription(badgeId));
        item.addEventListener('mouseleave', () => showWisdom());
    });
}

// ==================== BADGE SYSTEM ====================

function resetAllBadgesIfNeeded() {
    const BADGE_VERSION = 'v2';
    if (localStorage.getItem('philidorOldIndian_badgeVersion') !== BADGE_VERSION) {
        ['Debora','Jack','Jacobus','Sammy','Thomas','Martin','Coach Corno','Birdman']
            .forEach(p => localStorage.removeItem(`philidorOldIndian_${p}_badges`));
        localStorage.setItem('philidorOldIndian_badgeVersion', BADGE_VERSION);
    }
}

function loadBadges() {
    try { unlockedBadges = new Set(JSON.parse(localStorage.getItem(getBadgesKey()) || '[]')); }
    catch (e) { unlockedBadges = new Set(); }
    updateBadgeDisplay();
}

function saveBadges() {
    localStorage.setItem(getBadgesKey(), JSON.stringify([...unlockedBadges]));
}

function unlockBadge(badgeId) {
    if (unlockedBadges.has(badgeId)) return false;
    unlockedBadges.add(badgeId);
    badgesEarnedThisGame.push(badgeId);
    saveBadges();
    updateBadgeDisplay(badgeId);
    showBadgeNotification(badgeId);
    return true;
}

function updateBadgeDisplay(justUnlockedId = null) {
    Object.keys(BADGES).forEach(badgeId => {
        const el = document.getElementById(`badge-${badgeId}`);
        if (!el) return;
        if (unlockedBadges.has(badgeId)) {
            el.classList.remove('locked');
            el.classList.add('unlocked');
            if (badgeId === justUnlockedId) {
                el.classList.add('just-unlocked');
                setTimeout(() => el.classList.remove('just-unlocked'), 500);
            }
        } else {
            el.classList.add('locked');
            el.classList.remove('unlocked');
        }
    });
}

function showBadgeNotification(badgeId) {
    const badge = BADGES[badgeId];
    if (!badge) return;
    document.getElementById('notif-icon').textContent = badge.icon;
    document.getElementById('notif-text').textContent = badge.name;
    const notif = document.getElementById('badge-notification');
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 4000);
}

// ==================== BADGE CONDITION CHECKS ====================

function getCurrentBranch() {
    const h = game.history();
    if (h.includes('e4')) return 'philidor';
    if (h.includes('d4') || h.includes('c4')) return 'oldindian';
    return 'unknown';
}

function checkBadges() {
    const h      = game.history();
    const b      = game.board();
    const branch = getCurrentBranch();

    if (branch === 'philidor') {
        if (h.includes('f5'))  unlockBadge('philidors-eie-keuse');
        if (h.includes('Bg4')) unlockBadge('opera-spook');
    }
    if (branch === 'oldindian') {
        if (h.includes('Bg4')) unlockBadge('tartakower-indier');
        if (h.includes('Bf5')) unlockBadge('janowski-blok');
        if (h.includes('c6'))  unlockBadge('tsjeggiese-fondament');
    }

    // Fianchetto → King's Indian transition
    const g6pawn = b[2]?.[6]?.type === 'p' && b[2][6].color === 'b';
    const bg7    = b[1]?.[6]?.type === 'b' && b[1][6].color === 'b';
    if (g6pawn && bg7) unlockBadge('koning-indier-oorgang');

    checkHanhamSetup(b);
    checkChigorinSetup(b);
    checkAntoshinSetup(h, b);
}

function checkHanhamSetup(b) {
    // Nd7, Nf6, Be7, king castled (g8)
    if (b[1]?.[3]?.type==='n' && b[1][3].color==='b' &&
        b[2]?.[5]?.type==='n' && b[2][5].color==='b' &&
        b[1]?.[4]?.type==='b' && b[1][4].color==='b' &&
        b[0]?.[6]?.type==='k' && b[0][6].color==='b') {
        unlockBadge('hanham-vesting');
    }
}

function checkChigorinSetup(b) {
    // Nd7 + Black pawn on e5 + White pawn on e4
    if (b[1]?.[3]?.type==='n' && b[1][3].color==='b' &&
        b[3]?.[4]?.type==='p' && b[3][4].color==='b' &&
        b[4]?.[4]?.type==='p' && b[4][4].color==='w') {
        unlockBadge('chigorin-hoofline');
    }
}

function checkAntoshinSetup(h, b) {
    if (h.some(m => m === 'exd4' || m === 'exd4+')) antoshinExd4Played = true;
    if (!antoshinExd4Played) return;
    if (b[1]?.[4]?.type==='b' && b[1][4].color==='b' &&
        b[0]?.[6]?.type==='k' && b[0][6].color==='b') {
        unlockBadge('antoshin-blok');
    }
}

async function checkEndGameBadges() {
    const branch = getCurrentBranch();
    if (score >= TARGET_SCORE) unlockBadge('d6-boumeester');
    if (branch === 'philidor')  unlockBadge('philidor-verdediger');
    if (branch === 'oldindian') unlockBadge('ou-indier-boumeester');
    if (perfectMovesThisGame >= 15) unlockBadge('teoretikus');
    if (perfectMovesThisGame >= 21) unlockBadge('grootmeester');

    // Dominant: eval <= -200 from White's frame (Black winning by 2 pawns) at game end.
    // Game ends after Black's last move → White to move → positive cp = White winning.
    try {
        const data = await fetchStockfishEval(game.fen());
        if (data && data.pvs && data.pvs[0]) {
            const pv = data.pvs[0];
            // White to move: negate cp to get Black's perspective
            const cpBlack = pv.cp !== undefined ? -pv.cp : undefined;
            if ((cpBlack !== undefined && cpBlack >= 200) ||
                (pv.mate !== undefined && pv.mate < 0)) {
                unlockBadge('oorheersend');
            }
        }
    } catch (e) { console.error('checkEndGameBadges eval error:', e); }
}

// ==================== TARGET POSITION TRACKER ====================
// Target: Black pawn on d6, knight on f6, knight on e5, bishop on e7, king castled (g8)

function updateTargetDisplay() {
    const b = game.board();

    // Board index reference (row 0 = rank 8, row 7 = rank 1):
    // d6 = row 2, col 3 | f6 = row 2, col 5 | e5 = row 3, col 4
    // e7 = row 1, col 4 | g8 = row 0, col 6
    const targets = {
        'd6': b[2]?.[3]?.type==='p' && b[2][3].color==='b',
        'f6': b[2]?.[5]?.type==='n' && b[2][5].color==='b',
        'e5': b[3]?.[4]?.type==='n' && b[3][4].color==='b',
        'e7': b[1]?.[4]?.type==='b' && b[1][4].color==='b',
        'g8': b[0]?.[6]?.type==='k' && b[0][6].color==='b'
    };

    Object.entries(targets).forEach(([sq, achieved]) => {
        const el = document.getElementById(`target-${sq}`);
        if (el) el.classList.toggle('achieved', achieved);
    });
}

function resetTargetDisplay() {
    ['d6','f6','e5','e7','g8'].forEach(sq => {
        const el = document.getElementById(`target-${sq}`);
        if (el) el.classList.remove('achieved');
    });
}

// ==================== HIGH SCORE ====================

function loadHighScore() {
    highScore = parseInt(localStorage.getItem(getHighScoreKey()) || '0', 10);
    updateHighScoreDisplay();
}

function saveHighScore(s) {
    if (s > highScore) {
        highScore = s;
        localStorage.setItem(getHighScoreKey(), highScore.toString());
        updateHighScoreDisplay(true);
        return true;
    }
    return false;
}

function updateHighScoreDisplay(isNew = false) {
    const el  = document.getElementById('highscore');
    const box = document.querySelector('.highscore-box');
    el.textContent = highScore;
    if (isNew) {
        box.classList.add('new-record');
        setTimeout(() => box.classList.remove('new-record'), 2000);
    }
}

// ==================== BOARD INIT ====================

function initBoard() {
    board = Chessboard('board', {
        draggable: false,
        position: 'start',
        orientation: 'black',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        // Explicit, slower-than-default speeds so White's move reads as a
        // visible glide rather than an instant snap — board.position(fen)
        // animates by default, but the default speed is fast enough (~200ms)
        // to barely register.
        moveSpeed:     500,
        appearSpeed:   400,
        snapbackSpeed: 300,
        snapSpeed:     150
    });
    positionHistory = [game.fen()];
}

// ==================== WHITE AUTO-MOVE ====================

function showEngineTransitionPopup() {
    const el = document.getElementById('engine-popup');
    if (!el) return;
    el.style.display = 'block';
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 600);
    }, 3500);
}

async function makeWhiteMove() {
    isThinking = true;
    lastWhiteFenBefore = game.fen();

    // First Stockfish move — announce the transition out of the book
    if (currentMoveNumber === 7) {
        showEngineTransitionPopup();
        showMessage("Powerplay verby — nou raak dit ernstig!", "thinking");
        await new Promise(r => setTimeout(r, 1200));
    } else {
        showMessage("Wit dink...", "thinking");
    }

    try {
        if (currentMoveNumber === 1)         await makeWhiteFirstMove();
        else if (currentMoveNumber <= 6)     await makeWhitePopularityMove();
        else                                  await makeWhiteStockfishMove();
    } catch (e) {
        console.error('makeWhiteMove error:', e);
        const moves = game.moves();
        if (moves.length > 0) {
            const m = game.move(moves[Math.floor(Math.random() * moves.length)]);
            if (m) lastWhiteMoveSan = m.san;
        }
    }

    board.position(game.fen());
    positionHistory.push(game.fen());

    // White may have just delivered mate (or the position is a draw) —
    // check before showing hints for a Black move that will never happen.
    if (await checkGameTermination()) return;

    updateBranchInfo();
    updateMoveCounter();
    updateWhitePoolInfo();
    updatePhaseInfo();
    updateTargetDisplay();

    // Fetched ONCE and shared by the coach tip, the auto-hint arrows, and the
    // "Wys Beste Skuif" button -- previously each of the latter two ran its
    // own identical Lichess+Stockfish query for the same position; adding a
    // third caller (coaching) without sharing would have tripled that load.
    // undefined (not fetched) for move 1 -- forced move, and for anything
    // past the guided window, where hintsActiveNow() is false anyway.
    const guidance = (hintsActiveNow() && currentMoveNumber > 1)
        ? await fetchGuidanceData(game.fen())
        : null;

    showProactiveCoaching(guidance);
    await showAutoHints(guidance);
    await fetchBestMove(guidance);

    isThinking = false;
    showMessage("Jou beurt — speel as Swart!", "info");
}

function makeWhiteFirstMove() {
    const r = Math.random();
    const san = r < 0.45 ? 'e4' : r < 0.85 ? 'd4' : r < 0.95 ? 'c4' : 'Nf3';
    const m = game.move(san);
    if (m) { lastWhiteMoveSan = m.san; showMessage(`Wit speel ${m.san}`, "info"); }
}

async function makeWhitePopularityMove() {
    const poolSize = WHITE_POOL_SIZES[currentMoveNumber - 1] || 2;
    try {
        const data = await fetchLichessData(game.fen());
        if (data && data.moves && data.moves.length > 0) {
            let sorted = data.moves.sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
            sorted = applyWhiteBoosts(sorted);
            const sel = selectWeightedMove(sorted.slice(0, Math.min(poolSize, sorted.length)));
            const m   = game.move(sel.san);
            if (m) { lastWhiteMoveSan = m.san; showMessage(`Wit speel ${m.san}`, "info"); return; }
        }
    } catch (e) { console.error('makeWhitePopularityMove error:', e); }
    await makeWhiteStockfishMove();
}

function applyWhiteBoosts(sorted) {
    const h = game.history();
    // After 1.e4 d6: boost 2.d4 to ~60%
    if (h.length === 2 && h[0] === 'e4' && h[1] === 'd6') return boostMove(sorted, 'd4', 0.60);
    // After 1.d4 d6: boost 2.c4 to ~55%
    if (h.length === 2 && h[0] === 'd4' && h[1] === 'd6') return boostMove(sorted, 'c4', 0.55);
    return sorted;
}

function boostMove(moves, targetSan, prob) {
    const idx = moves.findIndex(m => m.san === targetSan);
    if (idx < 0) return moves;
    const othersTotal = moves.reduce((s, m, i) => i !== idx ? s + m.white + m.draws + m.black : s, 0);
    if (othersTotal <= 0) return moves;
    const boosted = Math.round(othersTotal * prob / (1 - prob));
    const res = [...moves];
    res[idx] = { ...res[idx], white: boosted, draws: 0, black: 0 };
    return res.sort((a, b) => (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
}

async function makeWhiteStockfishMove() {
    try {
        // Depth 6 keeps White's moves quick and age-appropriate for young
        // players -- bumped from 5 (2026-08-24) since 5 was a smidge too easy.
        const data = await fetchStockfishEval(game.fen(), 6);
        if (data && data.pvs && data.pvs[0]) {
            const uci = data.pvs[0].moves.split(' ')[0];
            const m   = game.move({ from: uci.slice(0,2), to: uci.slice(2,4),
                                    promotion: uci.length > 4 ? uci[4] : undefined });
            if (m) { lastWhiteMoveSan = m.san; showMessage(`Wit speel ${m.san}`, "info"); return; }
        }
    } catch (e) { console.error('makeWhiteStockfishMove error:', e); }
    const moves = game.moves();
    if (moves.length > 0) {
        const m = game.move(moves[Math.floor(Math.random() * moves.length)]);
        if (m) lastWhiteMoveSan = m.san;
    }
}

// ==================== SCORING (BLACK'S MOVES) ====================

async function scoreMove(fen, move) {
    try {
        const uciMove = move.from + move.to + (move.promotion || '');
        const [lichessData, sfData] = await Promise.all([fetchLichessData(fen), fetchStockfishEval(fen)]);

        let popularMoves = [], totalGames = 0;
        if (lichessData && lichessData.moves && lichessData.moves.length > 0) {
            popularMoves = lichessData.moves.sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
            totalGames = popularMoves.reduce((s, m) => s + m.white + m.draws + m.black, 0);
        }

        let engineTopMoves = [];
        if (sfData && sfData.pvs) {
            for (const pv of sfData.pvs) {
                const uci = pv.moves.split(' ')[0];
                const tmp = new Chess(fen);
                const em  = tmp.move({ from: uci.slice(0,2), to: uci.slice(2,4),
                                       promotion: uci.length>4 ? uci[4] : undefined });
                if (em) engineTopMoves.push({ san: em.san, uci });
            }
        }

        if (totalGames < MIN_POPULARITY_SAMPLE) return scoreByStockfishOnly(move.san, uciMove, engineTopMoves, sfData, fen);

        // findIndex() returns -1 when the move isn't found — and -1 <= 1 is
        // true in JS, so an unguarded "pi <= 1" would silently score every
        // unranked move as a top-2 move. Must check "found" explicitly.
        const pi = popularMoves.findIndex(m => m.san === move.san);
        const ei = engineTopMoves.findIndex(m => m.san === move.san);
        const piOk = pi !== -1, eiOk = ei !== -1;

        if ((piOk && pi <= 1) || (eiOk && ei <= 1)) return 6; // SES! — top tier scores 6, like a real six
        if ((piOk && pi <= 3) || (eiOk && ei <= 3)) return 4;
        if ((piOk && pi === 4) || (eiOk && ei === 4)) return 3;
        if ((piOk && pi === 5) || (eiOk && ei === 5)) return 2;
        return 1;

    } catch (e) { console.error('scoreMove error:', e); return 3; }
}

async function scoreByStockfishOnly(moveSan, uciMove, engineTopMoves, sfData, fen) {
    if (engineTopMoves.length > 0) {
        // -1 (not found) must never satisfy "<= 1" — see scoreMove() for the
        // same bug. Only take these tier shortcuts when the move was actually
        // found and ranked; otherwise fall through to the centipawn-loss
        // fallback below, same as when it's ranked worse than 6th.
        const ei = engineTopMoves.findIndex(m => m.san === moveSan || m.uci === uciMove);
        if (ei !== -1) {
            if (ei <= 1) return 6; // SES! — top tier scores 6, like a real six
            if (ei <= 3) return 4;
            if (ei === 4) return 3;
            if (ei === 5) return 2;
        }

        // Centipawn-loss fallback
        // fen is Black to move; positive cp = good for Black (side to move)
        if (sfData && sfData.pvs && sfData.pvs[0] && sfData.pvs[0].cp !== undefined) {
            const bestEval = sfData.pvs[0].cp;
            try {
                const gAfter = new Chess(fen);
                gAfter.move(moveSan);
                const evalAfter = await fetchStockfishEval(gAfter.fen());
                if (evalAfter && evalAfter.pvs && evalAfter.pvs[0] && evalAfter.pvs[0].cp !== undefined) {
                    // After Black's move → White to move; negate to get Black's perspective
                    const ourEval = -(evalAfter.pvs[0].cp);
                    const diff    = bestEval - ourEval;
                    if (diff <= 10)  return 6; // SES! — top tier scores 6, like a real six
                    if (diff <= 30)  return 4;
                    if (diff <= 60)  return 3;
                    if (diff <= 100) return 2;
                    return 1;
                }
            } catch (e) { /* ignore */ }
        }
        return 1;
    }
    return 3;
}

// ==================== BAL-VIR-BAL COMMENTARY ====================
// Template bank, no live API — same deterministic-random-pick pattern as
// WISDOM_QUOTES and the SES!/VIER! score labels. Placeholders filled from
// the move chess.js just returned, plus lastWhiteMoveSan for lines that
// react to White's preceding move.

const PIECE_NAMES_AF = { p: 'Pion', n: 'Perd', b: 'Loper', r: 'Toring', q: 'Koningin', k: 'Koning' };

const COMMENTARY_BANK = {
    6: [
        "SES! Swart skuif {san} — die {piece} vind die perfekte veld op {square}!",
        "SES! Wat 'n slag! {san} stuur die bal reg oor die tou.",
        "SES! Swart se {piece} land op {square} — die skare spring op!",
        "SES! Presies reg gelees — {san} is 'n meesterlike keuse.",
        "SES! Die {piece} na {square} — suiwer, kalm, korrek.",
        "Wit speel {white}, maar Swart sien die bal kom en antwoord met {san} — SES!",
        "SES! Na Wit se {white}, vind Swart die perfekte teenslag: {san}!"
    ],
    4: [
        "VIER! Swart speel {san} en die skare hou daarvan.",
        "VIER! Die {piece} na {square} — 'n mooi, skoon slag.",
        "VIER! {san} vind die grens met gemak.",
        "VIER! Swart se {piece} beweeg na {square} — vier lopies vir 'n gewilde keuse.",
        "VIER! 'n Solide {san} — presies wat die boek voorstel.",
        "Wit probeer {white}; Swart antwoord doodluiters met {san} — VIER!",
        "VIER! {san} — die veld het geen kans gehad nie.",
        "VIER! {san} — 'n gehalte-slag wat die veld werklik onder druk sit.",
        "VIER! Die {piece} vind {square} met styl — presies wat 'n Indiese kolfblad graag wys."
    ],
    3: [
        "Drie lopies! {san} — 'n stewige lopie tussen die paaltjies.",
        "Drie lopies! Die {piece} na {square} — nie flambojant nie, maar bruikbaar.",
        "Drie lopies! Swart hardloop hard met {san}.",
        "Drie lopies! {san} hou die beurt aan die gang.",
        "Drie lopies! Die {piece} op {square} — solied genoeg.",
        "Drie lopies! Goeie besluit — {san} bou stadig voort.",
        "Drie lopies! Deeglik, maar nie fantasties vir 'n Indiese kolfblad nie — {san} kry darem die werk gedoen.",
        "Drie lopies! Swart vergeet amper hierdie is 'n Indiese kolfblad — {san} is veilig, maar broos.",
        "Drie lopies! Swart sien {white} en kap terug met {san}, dalk 'n bietjie te vinnig gespeel. Hier kom die volgende bal."
    ],
    2: [
        "Twee lopies. {san} — niks spesiaals nie, maar veilig.",
        "Twee lopies. Die {piece} skuif na {square}, kalm en stil.",
        "Twee lopies. {san} hou die telbord aan die beweeg.",
        "Twee lopies. Nie die beste keuse nie, maar {san} werk nog steeds.",
        "Twee lopies. Die {piece} na {square} — 'n bietjie versigtig."
    ],
    1: [
        "Enkelloop. {san} — 'n stil bal, geen risiko geneem nie.",
        "Geen lopie. {san} laat lopies op tafel.",
        "Enkelloop. Die {piece} na {square} — kon dalk beter gewees het.",
        "Enkelloop. Swart speel veilig met {san}, maar mis die kans.",
        "Enkelloop. Die {piece} op {square} — tyd om weer te dink oor jou plan."
    ]
};

// Checkmate is a separate category from the 1-5 score tiers — triggered by
// checkGameTermination(), not by scoreMove().
const MATE_COMMENTARY = {
    blackMated: [
        "Uitgeboul! Daar spat Swart se penne!",
        "Uitgeboul! Swart se koning het nêrens om te loop nie.",
        "Uitgeboul! Die enjin sluit die beurt af — geen ontsnapping vir Swart nie."
    ],
    whiteMated: [
        "Uitgeboul! Daar spat Wit se penne! Bonus: +{bonus} lopies vir die wen-slag!",
        "UITGEBOUL! Swart vang Wit se koning — wat 'n beurt! +{bonus} bonuslopies!",
        "Uitgeboul! Wit se verdediging val plat — Swart wen die wedstryd! (+{bonus} lopies bonus)"
    ]
};

function fillTemplate(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{${key}}`);
}

function showCommentary(move, tier) {
    const el = document.getElementById('commentary-line');
    if (!el) return;
    const bank = COMMENTARY_BANK[tier] || COMMENTARY_BANK[1];
    const tpl  = bank[Math.floor(Math.random() * bank.length)];
    el.textContent = fillTemplate(tpl, {
        san:    move.san,
        piece:  PIECE_NAMES_AF[move.piece] || 'stuk',
        square: move.to,
        white:  lastWhiteMoveSan || '...'
    });
    el.style.display = 'block';
}

function showMateCommentary(matedSide) {
    const el = document.getElementById('commentary-line');
    if (!el) return;
    const lines = matedSide === 'b' ? MATE_COMMENTARY.blackMated : MATE_COMMENTARY.whiteMated;
    const tpl   = lines[Math.floor(Math.random() * lines.length)];
    // fillTemplate() is a no-op on text with no {placeholders}, so this is
    // safe to call for the blackMated lines too, which have none.
    el.textContent = fillTemplate(tpl, { bonus: MATE_BONUS });
    el.style.display = 'block';
}

// ==================== PROACTIVE COACHING (moves 1-7) ====================
// COMMENTARY_BANK above is reactive -- it comments on a move Black already
// played. This is proactive: shown right after White moves, BEFORE Black
// replies, walking the student toward the plan for the guided-theory window
// (moves 1-7) instead of only judging them after the fact.
//
// v1 (2026-08-24) hand-scripted a fixed "d6 → Nf6 → Nbd7 → e5 → Be7 → O-O"
// line keyed purely by move NUMBER + top-level branch. Feedback (2026-08-25):
// it wasn't actually aware of the moves played -- it kept reciting the next
// step in that one anticipated sequence even when the real game had already
// done it, or had gone a different (also legitimate -- Bg4, Bf5, a King's
// Indian fianchetto all have their own badges) way. The proposed fix was a
// hand-authored tree keyed on the actual move sequence (4x4x3x3 = 144+
// branches by move 4) -- rejected: unbounded authoring effort, and *any*
// line outside the anticipated tree reintroduces the exact same staleness,
// including transpositions and the alternate lines this app already
// celebrates.
//
// v2 replaces the scripted "next move" entirely with two dynamic pieces,
// assembled onto a short move-number/branch-flavoured opener below:
//   1. REAL candidate moves for the exact current position -- the same
//      `guidance` (Lichess-popularity top move + engine top move) that the
//      hint arrows and "Wys Beste Skuif" button already use (see
//      fetchGuidanceData() in the hint system, shared rather than re-fetched
//      here). Correct for literally any position reached, not just the ones
//      anticipated in a hand-built tree.
//   2. "What to work toward" from getCoachingProgress()/nextSuggestedIdea()
//      below, which reads the ACTUAL board (has the bishop left c8 at all,
//      regardless of which square it went to? has the king moved at all?)
//      instead of a move-number assumption -- so it can never recommend
//      something already done, and it recognises the alternate setups this
//      app's own badges reward instead of contradicting them.
const COACHING_BANK = {
    1: {
        generic: [
            "Wit open met {white}. Maak nie saak wat Wit speel nie — ons antwoord is amper altyd d6. Dit hou die deur oop vir sowel die Philidor (teen e4) as die Ou-Indiër (teen d4/c4/Nf3).",
            "Wit begin met {white}. Ons plan verander nie: d6 eerste, altyd. Dis die een bal wat teen byna elke boulwerk werk."
        ]
    },
    2: {
        philidor:  ["Wit het die Philidor-deur oopgemaak, en speel nou {white}.", "Ons is in Philidor-gebied na {white}."],
        oldindian: ["Wit bly by die Ou-Indiër-plan met {white}.", "Na {white} bly ons in Ou-Indiër-gebied."],
        unknown:   ["Wit hou sy planne geheim met {white} — nog nie duidelik of dit 'n Philidor of 'n Ou-Indiër word nie."]
    },
    3: {
        philidor:  ["Wit speel {white} in hierdie Philidor-lyn.", "Teen {white} bou ons solied voort."],
        oldindian: ["Wit antwoord met {white} in die Ou-Indiër.", "Na {white} bly die plan dieselfde: stadig en stewig."],
        unknown:   ["Wit speel {white} en ons bly buigsaam."]
    },
    4: {
        philidor:  ["Wit reageer met {white}.", "Na {white}, steeds in Philidor-gebied."],
        oldindian: ["Wit speel {white} in die Ou-Indiër.", "Teen {white} bly ons plan stewig."],
        unknown:   ["Wit speel {white}."]
    },
    5: {
        philidor:  ["Wit antwoord {white}.", "Na {white}, steeds in die Hanham-gees."],
        oldindian: ["Wit speel {white}.", "Teen {white} bou ons voort."],
        unknown:   ["Wit speel {white}."]
    },
    6: {
        philidor:  ["Wit speel {white}.", "Na {white} — amper klaar gebou."],
        oldindian: ["Wit speel {white}.", "Teen {white} — amper klaar."],
        unknown:   ["Wit speel {white}."]
    },
    7: {
        philidor:  ["Wit speel {white} — Wit se eerste enjin-gedrewe skuif, die Powerplay is verby.",
                    "Na {white}: die openingsboek is nou agter ons."],
        oldindian: ["Wit speel {white} — en vanaf hier dink die enjin vir homself.",
                    "Na {white}: die Powerplay is verby."],
        unknown:   ["Wit speel {white} — die enjin-oorgang het nou plaasgevind."]
    }
};

// Reads the ACTUAL board (not the move counter) to decide what Black still
// needs to do. bishopOut/kingMoved deliberately check "left home at all"
// rather than "reached e7"/"reached g8" specifically, so a legitimate
// alternate development (Bg4, Bf5, a g6+Bg7 fianchetto, queenside castling)
// is recognised as done instead of being nagged about forever.
function getCoachingProgress() {
    const b = game.board();
    const h = game.history();
    return {
        f6:        b[2]?.[5]?.type === 'n' && b[2][5].color === 'b',                    // Nf6 played
        e5Push:    h.includes('e5'),                                                     // central break attempted
        bishopOut: !(b[0]?.[2] && b[0][2].type === 'b' && b[0][2].color === 'b'),        // c8-bishop has moved (any square)
        kingMoved: !(b[0]?.[4] && b[0][4].type === 'k' && b[0][4].color === 'b')         // king left e8 (castled either side, or walked)
    };
}

function nextSuggestedIdea() {
    const p = getCoachingProgress();
    if (!p.f6)        return "ontwikkel Nf6";
    if (!p.e5Push)    return "speel Nbd7, met die oog op 'n latere e5-stoot";
    if (!p.bishopOut) return "ontwikkel jou loper (Be7 is die stewigste, maar Bg4/Bf5/'n fianchetto werk ook)";
    if (!p.kingMoved) return "rokade (O-O) om jou koning veilig te kry";
    return "jou eie plan — oorweeg c6 of Re8 om te konsolideer voor die middelspel";
}

function showProactiveCoaching(guidance) {
    const el = document.getElementById('coach-line');
    if (!el) return;
    const bank = COACHING_BANK[currentMoveNumber];
    if (!bank) { el.style.display = 'none'; return; }
    const branch   = getCurrentBranch();
    const variants = bank[branch] || bank.generic || bank.unknown || Object.values(bank)[0];
    if (!variants || variants.length === 0) { el.style.display = 'none'; return; }
    const opener = fillTemplate(variants[Math.floor(Math.random() * variants.length)],
                                 { white: lastWhiteMoveSan || '...' });

    // Move 1 is forced -- the opener already says it all, no options/idea to add.
    if (currentMoveNumber === 1) { el.textContent = opener; el.style.display = 'block'; return; }

    const bits = [];
    if (guidance?.popTop && guidance.popTotal >= MIN_POPULARITY_SAMPLE) bits.push(`gewild: ${guidance.popTop.san}`);
    if (guidance?.engineTop) bits.push(`enjin verkies: ${guidance.engineTop.san}`);
    const optionsText = bits.length ? ` (${bits.join(' — ')})` : '';

    el.textContent = `${opener}${optionsText} Ons plan: ${nextSuggestedIdea()}.`;
    el.style.display = 'block';
}

function hideCoaching() {
    const el = document.getElementById('coach-line');
    if (el) el.style.display = 'none';
}

// ==================== SIX-CELEBRATION PHOTOS ====================
// Shown on a perfect move (score 5, "SES!"). A per-game shuffled pool with
// no repeats until every photo has been shown once, then it reshuffles —
// so a long high-scoring game never runs dry, but you never see the same
// photo twice in a row either.
//
// Deliberately excludes three images pending a likeness call (celebrate4_6,
// Celebrate16__6, Celebrate10_6 — see CLAUDE.md §14): the branding on those
// is fine, but the batter's face/stance reads as a specific real cricketer.
// Add their filenames back into this list once that's decided.

const CELEBRATION_IMAGES = [
    'six-celebrations/Celebrate_6.jpg',
    'six-celebrations/Celebrate2_6.jpg',
    'six-celebrations/Celebrate3_6.jpg',
    'six-celebrations/Celebrate5_6.jpg',
    'six-celebrations/Celebrate6_6.jpg',
    'six-celebrations/Celebrate7_6.jpg',
    'six-celebrations/Celebrate8_6.jpg',
    'six-celebrations/Celebrate9_6.jpg',
    'six-celebrations/Celebrate11_6.jpg',
    'six-celebrations/Celebrate12_6.jpg',
    'six-celebrations/Celebrate13_6.jpg',
    'six-celebrations/Celebrate14_6.jpg',
    'six-celebrations/Celebrate15_6.jpg',
    'six-celebrations/C1.jpg',
    'six-celebrations/C2.jpg',
    'six-celebrations/C3.jpg',
    'six-celebrations/C4.jpg'
];

// Boundary-hoarding sponsors — all invented, no real brands. Two are picked
// at random each game (see pickBoardSponsors(), called from newGame()) and
// shown next to a fixed "Geborg deur:" label plate.
const SPONSOR_POOL = [
    'd6 Bank',
    'Fondament Motors',
    'Son Sonneblom Olie',
    'Luilekker Kerries',
    'Pensmens se Rys',
    'Lawwehaas Kaasmakery',
    'Njam-njam Kitskos'
];

function pickBoardSponsors() {
    const pool = [...SPONSOR_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const [a, b] = pool;
    const el1 = document.getElementById('sponsor-1');
    const el2 = document.getElementById('sponsor-2');
    if (el1) el1.textContent = a;
    if (el2) el2.textContent = b;
}

let celebrationPool = [];

// Warm the browser's image cache for the whole celebration pool up front,
// rather than letting the first "SES!" trigger a cold fetch. Called once on
// page load and again at the start of every match -- by the time a six can
// actually land (move 7+, see the currentMoveNumber gate below), White has
// already made several moves' worth of "Wit dink..." idle time for these
// small JPEGs to finish loading quietly in the background, so the polaroid
// pops in fully rendered instead of painting in half-loaded.
let preloadedCelebrationImgs = [];

function preloadCelebrationImages() {
    preloadedCelebrationImgs = CELEBRATION_IMAGES.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });
}

// Shutter sound, primed once up front instead of `new Audio()` per shot --
// a freshly-constructed Audio element has to start buffering from scratch
// before it can play, which can desync the click from the visual flash on
// first use. One persistent element with preload='auto', rewound before
// each play, avoids that stall. Falls back to the synthesized click if the
// file itself fails to load (not just if playback is blocked).
let shutterAudio = null;
let shutterAudioFailed = false;

function primeShutterSound() {
    try {
        shutterAudio = new Audio('camera_sound.mp3');
        shutterAudio.preload = 'auto';
        shutterAudio.volume  = 0.7;
        shutterAudio.addEventListener('error', () => { shutterAudioFailed = true; });
        shutterAudio.load();
    } catch (e) { shutterAudioFailed = true; }
}

function refillCelebrationPool() {
    celebrationPool = [...CELEBRATION_IMAGES];
    // Fisher-Yates shuffle
    for (let i = celebrationPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [celebrationPool[i], celebrationPool[j]] = [celebrationPool[j], celebrationPool[i]];
    }
}

function nextCelebrationImage() {
    if (celebrationPool.length === 0) refillCelebrationPool(); // exhausted — reshuffle fresh
    return celebrationPool.pop();
}

// Old-school camera-shutter click. Plays the user-supplied camera_sound.mp3;
// falls back to a synthesized noise-burst click if the file fails to load
// or the browser blocks audio without a prior user gesture — either way
// this is a non-essential flourish, so failures are silent and the visual
// flash always plays regardless.
function playShutterSound() {
    if (shutterAudioFailed || !shutterAudio) { playSynthShutterSound(); return; }
    try {
        shutterAudio.currentTime = 0; // rewind the primed element rather than building a new one
        const played = shutterAudio.play();
        if (played && typeof played.catch === 'function') {
            played.catch(() => playSynthShutterSound());
        }
    } catch (e) { playSynthShutterSound(); }
}

function playSynthShutterSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const bufferSize = Math.floor(ctx.sampleRate * 0.06);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        noise.connect(gain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
    } catch (e) { /* non-essential flourish — ignore */ }
}

let celebrationHideTimer = null;

function showCelebrationPhoto() {
    const backdrop = document.getElementById('camera-flash'); // dim lightbox backdrop, not a white flash
    const wrap      = document.getElementById('celebration-photo');
    const img       = document.getElementById('celebration-photo-img');
    if (!wrap || !img) return;

    // Guard against a stomped transition if this fires again before the
    // previous photo finished its hide timer (two quick sixes, or a new
    // game started mid-animation) -- without this the two setTimeouts race
    // and can yank the class off mid-transition, reading as a flicker.
    if (celebrationHideTimer) clearTimeout(celebrationHideTimer);

    img.src = nextCelebrationImage();
    playShutterSound();

    // Backdrop and photo show/hide together — the backdrop stays dim for
    // the whole time the photo is up, then both clear together.
    if (backdrop) backdrop.classList.add('show');
    wrap.classList.add('show');
    celebrationHideTimer = setTimeout(() => {
        if (backdrop) backdrop.classList.remove('show');
        wrap.classList.remove('show');
        celebrationHideTimer = null;
    }, 2800);
}

// ==================== GAME TERMINATION (checkmate / draw) ====================
// Previously the game only ever ended via MAX_MOVES — a mid-game checkmate
// (either side) wasn't detected at all. Checked after every move, both
// Black's (processBlackMove) and White's (makeWhiteMove).

async function checkGameTermination() {
    if (gameOver) return false;
    if (game.in_checkmate()) {
        const matedSide = game.turn(); // side to move when checkmated
        await endGameByCheckmate(matedSide);
        return true;
    }
    if (game.game_over()) {
        await endGameByDraw();
        return true;
    }
    return false;
}

async function endGameByCheckmate(matedSide) {
    gameOver = true;
    isThinking = false;
    gameEndReason = matedSide === 'b' ? 'checkmate-white-wins' : 'checkmate-black-wins';
    clearHighlights();
    clearArrows();
    updatePhaseInfo();

    // matedSide === 'w' means Black delivered mate -- the student won the
    // match outright, on top of whatever move-quality score they'd banked.
    if (matedSide === 'w') {
        score += MATE_BONUS;
        updateDisplay();
    }

    showMateCommentary(matedSide);
    showMessage(matedSide === 'b' ? "Uitgeboul! Swart is skaakmat."
                                  : `Uitgeboul! Wit is skaakmat! +${MATE_BONUS} bonuslopies!`,
                matedSide === 'b' ? 'error' : 'info');
    setTimeout(async () => { await showEndGameModal(); }, 3500);
}

async function endGameByDraw() {
    gameOver = true;
    isThinking = false;
    gameEndReason = 'draw';
    clearHighlights();
    clearArrows();
    updatePhaseInfo();
    showMessage("Gelykop! Die beurt eindig sonder 'n wenner.", "info");
    setTimeout(async () => { await showEndGameModal(); }, 3500);
}

// ==================== PROCESS BLACK'S MOVE ====================

async function processBlackMove(move, fenBeforeBlack) {
    // Move 1 forced to d6
    if (currentMoveNumber === 1 && !(move.piece === 'p' && move.to === 'd6')) {
        game.undo();
        board.position(game.fen());
        showMessage("Speel d6 — dit werk teen amper alles!", "error");
        clearSelection();
        isThinking = false;
        return;
    }

    isThinking = true;
    clearArrows();   // clear hint arrows once Black plays
    hideCoaching();  // the proactive tip for this move is done; reactive commentary takes over below

    // scoreMove() below runs the full Lichess+Stockfish eval waterfall, which
    // can take several seconds with zero other feedback on screen -- give an
    // immediate acknowledgment so that wait reads as "the app is working",
    // not "the app is stuck", especially since celebration-eligible positions
    // (move 7+) are exactly the ones least likely to be Lichess-cloud-cached.
    showMessage("🎥 Analiseer jou skuif...", "thinking");

    // fenBeforeBlack comes from the caller, captured BEFORE game.move() ran — using
    // game.fen() here instead would already reflect the position AFTER Black's move
    // (White to move), which silently broke scoring/analysis against White's replies.

    let moveScore = currentMoveNumber > 1 ? await scoreMove(fenBeforeBlack, move) : 6;
    if (moveScore === 6) perfectMovesThisGame++;
    score += moveScore;

    // Trigger the six-celebration photo as early as possible once the score is
    // known -- before the heavier synchronous DOM work below (history-list
    // rebuild, badge board-scans) -- so its opening transition gets a clean
    // first paint instead of competing with other layout work in the same
    // frame. Held back during the Powerplay (moves 1-6) — the photo pop-up is
    // a middlegame flourish, not a distraction during the guided theory phase.
    if (moveScore === 6 && currentMoveNumber >= 7) showCelebrationPhoto();

    positionHistory.push(game.fen());
    moveHistory.push({
        moveNum:        currentMoveNumber,
        white:          lastWhiteMoveSan,
        whiteFenBefore: lastWhiteFenBefore,
        black:          move.san,
        blackScore:     moveScore,
        blackFenBefore: fenBeforeBlack
    });

    if (move.captured === 'q') unlockBadge('koningin-jagter');

    updateDisplay(moveScore);
    updateHistory();
    updateTargetDisplay();
    checkBadges();
    showCommentary(move, moveScore);

    // Black may have just delivered mate (or the position is a draw) — check
    // before running analysis on what would otherwise be a terminal FEN.
    if (await checkGameTermination()) return;

    await showMoveAnalysis(fenBeforeBlack, move.san);
    await updatePositionEval();

    await new Promise(r => setTimeout(r, 2000));
    clearHighlights();

    if (currentMoveNumber >= MAX_MOVES) { await endGame(); return; }

    currentMoveNumber++;
    await makeWhiteMove();
}

// ==================== LICHESS & STOCKFISH FETCH ====================

async function fetchStockfishEval(fen, depth = 12) {
    const ef = encodeURIComponent(fen);

    // 1. Lichess Cloud Eval (depth not user-controlled — fast cache)
    try {
        const r = await fetch(`https://lichess.org/api/cloud-eval?fen=${ef}&multiPv=5`,
            { headers: window.LICHESS_TOKEN ? { 'Authorization': 'Bearer ' + window.LICHESS_TOKEN } : {} });
        if (r.ok) {
            const d = await r.json();
            if (d && d.pvs && d.pvs.length > 0) return d;
        }
    } catch (e) { /* fallthrough */ }

    // 2. Stockfish.online (cap at 15 per API limit)
    try {
        const r = await fetch(`https://stockfish.online/api/s/v2.php?fen=${ef}&depth=${Math.min(depth, 15)}`);
        if (r.ok) {
            const d = await r.json();
            if (d && d.success && d.data) {
                const sm = d.data.match(/score (cp|mate) (-?\d+)/);
                const pm = d.data.match(/ pv (.+)/);
                if (sm && pm) return { pvs: [{ moves: pm[1].trim().split(' ')[0],
                    cp: sm[1]==='cp' ? parseInt(sm[2]) : undefined,
                    mate: sm[1]==='mate' ? parseInt(sm[2]) : undefined }] };
            }
        }
    } catch (e) { /* fallthrough */ }

    // 3. Local Stockfish.js blob worker
    if (stockfishEngine) {
        try {
            const res = await getLocalStockfishEval(fen, depth, 5);
            if (res && res.length > 0) return { pvs: res };
        } catch (e) { /* ignore */ }
    }

    return null;
}

async function fetchLichessData(fen) {
    const ef  = encodeURIComponent(fen);
    const url = `https://explorer.lichess.ovh/lichess?fen=${ef}&ratings=1600,1800,2000,2200,2500&speeds=rapid,classical`;
    try {
        const r = await fetch(url,
            { headers: window.LICHESS_TOKEN ? { 'Authorization': 'Bearer ' + window.LICHESS_TOKEN } : {} });
        if (!r.ok) throw new Error('Lichess API ' + r.status);
        return await r.json();
    } catch (e) { console.error('fetchLichessData error:', e); return null; }
}

// ==================== HINT SYSTEM ====================

// Hints and arrows are available on moves 1–7 -- widened from 3–6 (2026-08-24)
// so the student is guided from the very first move through the end of the
// guided theory window, not just its middle stretch.
function hintsActiveNow() {
    return currentMoveNumber <= 7;
}

// Below this many total games in the Lichess pool, popularity data is too
// thin to trust -- same threshold scoreMove()/scoreByStockfishOnly() already
// use to decide when to fall back to pure engine ranking.
const MIN_POPULARITY_SAMPLE = 20;

// Single shared fetch for "what's good here" -- top Lichess-popular move and
// the engine's top choice for one exact FEN. Called once per move (2026-08-25)
// from makeWhiteMove() and handed to fetchBestMove(), showAutoHints(), AND
// showProactiveCoaching(), which previously either ran this same query
// redundantly (the first two) or would have needed a third redundant copy
// (coaching). One fetch now serves all three, and guarantees they can never
// disagree with each other since they're reading the same data.
async function fetchGuidanceData(fen) {
    let popTop = null, popTotal = 0, engineTop = null;

    try {
        const d = await fetchLichessData(fen);
        if (d && d.moves && d.moves.length > 0) {
            const sorted = d.moves.sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
            popTotal = sorted.reduce((s, m) => s + m.white + m.draws + m.black, 0);
            const top = sorted[0];
            popTop = { san: top.san, games: top.white + top.draws + top.black };
        }
    } catch (e) { /* ignore */ }

    try {
        const d = await fetchStockfishEval(fen);
        if (d && d.pvs && d.pvs[0]) {
            const uci = d.pvs[0].moves.split(' ')[0];
            const tmp = new Chess(fen);
            const m   = tmp.move({ from: uci.slice(0,2), to: uci.slice(2,4),
                                   promotion: uci.length>4 ? uci[4] : undefined });
            if (m) engineTop = { san: m.san, from: m.from, to: m.to };
        }
    } catch (e) { /* ignore */ }

    return { popTop, popTotal, engineTop };
}

async function fetchBestMove(guidance) {
    if (game.turn() !== 'b') return;
    if (!hintsActiveNow()) { bestMove = null; return; }
    const fen = game.fen();

    // Move 1 is always forced to d6 (see processBlackMove) regardless of what
    // popularity/engine data says -- querying either here could suggest a
    // different move and contradict the forced rule, so short-circuit.
    if (currentMoveNumber === 1) {
        const ft = sanToFromTo(fen, 'd6');
        bestMove = { san: 'd6', from: ft?.from, to: ft?.to, source: 'forced' };
        return;
    }

    if (guidance?.popTop) {
        const ft = sanToFromTo(fen, guidance.popTop.san);
        bestMove = { san: guidance.popTop.san, from: ft?.from, to: ft?.to, source: 'popularity' };
        return;
    }
    if (guidance?.engineTop) {
        bestMove = { san: guidance.engineTop.san, from: guidance.engineTop.from,
                     to: guidance.engineTop.to, source: 'engine' };
        return;
    }
    bestMove = null;
}

function showHint() {
    if (!bestMove || gameOver || isThinking) return;
    if (!hintsActiveNow()) {
        showMessage("Geen wenke hier nie — dink self!", "error");
        return;
    }

    clearArrows();
    if (bestMove.from && bestMove.to) {
        drawArrow(bestMove.from, bestMove.to, 'rgba(46,196,182,0.92)'); // floodlight teal
    }
    showMessage(`Wenk: ${bestMove.san}`, "hint");
    setTimeout(() => clearArrows(), 4000);
}

// Clear square CSS highlights (tap-to-move UI — NOT arrows)
function clearHighlights() {
    $('#board .square-55d63').removeClass('highlight-selected highlight-legal-move');
}

// ==================== AUTO-HINTS (board arrows for Black's best moves) ====================

async function showAutoHints(guidance) {
    if (gameOver || game.turn() !== 'b') return;
    if (!hintsActiveNow()) return; // auto-arrows only on moves 1–7 (guided theory window)
    clearArrows();

    const fen = game.fen(); // capture synchronously

    // Move 1 is forced to d6 -- draw a single confirming arrow rather than
    // querying popularity/engine data, which could point somewhere else and
    // contradict the forced rule in processBlackMove().
    if (currentMoveNumber === 1) {
        const ft = sanToFromTo(fen, 'd6');
        if (ft) drawArrow(ft.from, ft.to, 'rgba(255,201,74,0.92)'); // trophy gold
        return;
    }

    const popMove    = guidance?.popTop    ? sanToFromTo(fen, guidance.popTop.san) : null;
    const engineMove = guidance?.engineTop ? { from: guidance.engineTop.from, to: guidance.engineTop.to } : null;

    if (popMove && engineMove && popMove.from === engineMove.from && popMove.to === engineMove.to) {
        // Both agree → trophy gold
        drawArrow(popMove.from, popMove.to, 'rgba(255,201,74,0.92)');
    } else {
        // Floodlight teal for popularity, ball red for engine
        if (popMove)    drawArrow(popMove.from,    popMove.to,    'rgba(46,196,182,0.88)');
        if (engineMove) drawArrow(engineMove.from, engineMove.to, 'rgba(230,57,70,0.88)');
    }
}

// ==================== TAP-TO-MOVE (BLACK PIECES) ====================

function clearSelection() {
    selectedSquare = null;
    $('#board .square-55d63').removeClass('highlight-selected highlight-legal-move');
}

function showLegalMoves(square) {
    game.moves({ square, verbose: true }).forEach(m =>
        $(`#board .square-${m.to}`).addClass('highlight-legal-move'));
}

function attemptTapMove(from, to) {
    const piece = game.get(from);
    // Black pawns promote on rank 1 (from their perspective they move "down" to rank 1)
    const isPromotion = piece && piece.type === 'p' && to[1] === '1';
    const fenBeforeMove = game.fen(); // capture BEFORE game.move() mutates state
    const move = game.move({ from, to, promotion: isPromotion ? 'q' : undefined });
    clearSelection();
    if (move === null) return;
    board.position(game.fen());
    processBlackMove(move, fenBeforeMove);
}

function setupTapToMove() {
    $('#board').on('click', '.square-55d63', function() {
        if (gameOver || isThinking || isReviewMode || game.turn() !== 'b') return;

        let clickedSquare = null;
        for (const cls of $(this).attr('class').split(/\s+/)) {
            const m = cls.match(/^square-([a-h][1-8])$/);
            if (m) { clickedSquare = m[1]; break; }
        }
        if (!clickedSquare) return;

        const clickedPiece = game.get(clickedSquare);

        if (selectedSquare) {
            if (clickedSquare === selectedSquare) { clearSelection(); return; }
            if (clickedPiece && clickedPiece.color === 'b') {
                clearSelection();
                selectedSquare = clickedSquare;
                $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
                showLegalMoves(clickedSquare);
                return;
            }
            attemptTapMove(selectedSquare, clickedSquare);
            return;
        }

        if (clickedPiece && clickedPiece.color === 'b') {
            selectedSquare = clickedSquare;
            $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
            showLegalMoves(clickedSquare);
        }
    });
}

// ==================== MOVE ANALYSIS PANEL ====================

async function showMoveAnalysis(fenBeforeMove, playedMove) {
    const sfDiv     = document.getElementById('stockfish-moves');
    const lichDiv   = document.getElementById('lichess-moves');
    const yourSec   = document.getElementById('your-move-section');
    const yourInfo  = document.getElementById('your-move-info');

    sfDiv.innerHTML   = '<p class="analysis-placeholder">Laai...</p>';
    lichDiv.innerHTML = '<p class="analysis-placeholder">Laai...</p>';

    let sfMoves = [], lichMoves = [];

    // fenBeforeMove is Black to move; positive cp = good for Black
    try {
        const d = await fetchStockfishEval(fenBeforeMove);
        if (d && d.pvs) {
            for (const pv of d.pvs.slice(0, 2)) {
                const uci = pv.moves.split(' ')[0];
                const tmp = new Chess(fenBeforeMove);
                const m   = tmp.move({ from: uci.slice(0,2), to: uci.slice(2,4),
                                       promotion: uci.length>4 ? uci[4] : undefined });
                if (m) {
                    const eval_ = pv.mate !== undefined
                        ? (pv.mate > 0 ? `#${pv.mate}` : `#${pv.mate}`)
                        : `${(pv.cp||0)>=0 ? '+' : ''}${((pv.cp||0)/100).toFixed(1)}`;
                    sfMoves.push({ san: m.san, eval: eval_ });
                }
            }
        }
    } catch (e) { /* ignore */ }

    try {
        const d = await fetchLichessData(fenBeforeMove);
        if (d && d.moves && d.moves.length > 0) {
            const sorted = d.moves.sort((a, b) =>
                (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
            for (const m of sorted.slice(0, 2)) {
                const games   = m.white + m.draws + m.black;
                const winRate = games > 0 ? ((m.black / games) * 100).toFixed(0) : 0;
                lichMoves.push({ san: m.san, games, winRate });
            }
        }
    } catch (e) { /* ignore */ }

    sfDiv.innerHTML = sfMoves.length > 0
        ? sfMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i+1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.eval}</span>
            </div>`).join('')
        : `<p class="analysis-placeholder">${!stockfishEngine ? 'Enjin laai...' : 'Geen data'}</p>`;

    lichDiv.innerHTML = lichMoves.length > 0
        ? lichMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i+1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.games.toLocaleString()} spele (${m.winRate}% sw.)</span>
            </div>`).join('')
        : '<p class="analysis-placeholder">Geen data</p>';

    if (playedMove) {
        yourSec.style.display = 'block';
        const inSF   = sfMoves.some(m => m.san === playedMove);
        const inLich = lichMoves.some(m => m.san === playedMove);
        let cls, text;
        if (inSF && inLich) {
            cls = 'your-move-good'; text = `<strong>${playedMove}</strong> — Uitstekend! Top in beide.`;
        } else if (inSF) {
            cls = 'your-move-good'; text = `<strong>${playedMove}</strong> — Top enjin skuif!`;
        } else if (inLich) {
            cls = 'your-move-ok'; text = `<strong>${playedMove}</strong> — Gewilde keuse.`;
        } else if (!sfMoves.length && !lichMoves.length) {
            cls = 'your-move-ok'; text = `<strong>${playedMove}</strong> — Geen vergelykingsdata.`;
        } else {
            cls = 'your-move-weak'; text = `<strong>${playedMove}</strong> — Nie in top 2 nie.`;
        }
        yourInfo.innerHTML = `<span class="${cls}">${text}</span>`;
    }
}

// ==================== EVAL DISPLAY ====================

async function updatePositionEval() {
    const evalEl     = document.getElementById('position-eval');
    const sideToMove = game.turn(); // capture synchronously
    evalEl.textContent = '...';
    evalEl.className   = 'stat-value';

    try {
        const d = await fetchStockfishEval(game.fen());
        if (d && d.pvs && d.pvs[0]) {
            const pv = d.pvs[0];
            // Convert to Black's perspective (positive = good for student)
            let evalText, evalClass;
            if (pv.mate !== undefined) {
                // Black to move: positive mate = Black delivers mate
                // White to move: positive mate = White delivers mate (bad for Black)
                const blackMate = sideToMove === 'b' ? pv.mate : -pv.mate;
                evalText  = blackMate > 0 ? `#${blackMate}` : `#${blackMate}`;
                evalClass = blackMate > 0 ? 'eval-winning' : 'eval-losing';
            } else if (pv.cp !== undefined) {
                const cpBlack = sideToMove === 'b' ? pv.cp : -pv.cp;
                const pawns   = cpBlack / 100;
                evalText  = pawns >= 0 ? `+${pawns.toFixed(1)}` : `${pawns.toFixed(1)}`;
                evalClass = pawns >= 0.5 ? 'eval-winning' : pawns <= -0.5 ? 'eval-losing' : 'eval-equal';
            } else {
                evalText = '0.0'; evalClass = 'eval-equal';
            }
            evalEl.textContent = evalText;
            evalEl.className   = `stat-value ${evalClass}`;
        } else { evalEl.textContent = '?'; }
    } catch (e) { evalEl.textContent = '?'; }
}

// ==================== DISPLAY UPDATES ====================

function updateDisplay(lastScore) {
    document.getElementById('score').textContent = `${score}/${TARGET_SCORE}`;
    document.getElementById('progress-fill').style.width =
        `${Math.min((score / TARGET_SCORE) * 100, 100)}%`;

    const scoreDisplay = document.getElementById('move-score-display');
    const scoreText    = document.getElementById('last-move-score');
    if (lastScore !== undefined) {
        scoreDisplay.style.display = 'block';
        scoreDisplay.className     = `move-score score-${lastScore}`;
        const labels = { 6:'SES! (+6)', 4:'VIER! (+4)',
                         3:'Drie lopies! (+3)', 2:'Twee lopies (+2)', 1:'Enkelloop (+1)' };
        scoreText.textContent = labels[lastScore] || `+${lastScore}`;
    }
}

function updateMoveCounter() {
    document.getElementById('move-counter').textContent = `${currentMoveNumber}/${MAX_MOVES}`;
}

function updateWhitePoolInfo() {
    const el = document.getElementById('white-pool');
    if (currentMoveNumber >= 7) {
        el.textContent = 'Beste enjin skuif';
        el.style.color = '#FF9B4D';
    } else {
        const size = WHITE_POOL_SIZES[currentMoveNumber - 1] || 2;
        el.textContent = `Top ${size} skuiwe`;
        el.style.color = '#2EC4B6';
    }
}

// Doodsbeurte ("death overs") — a hot-red pill for the final stretch of the
// beurt (moves 26-30), mirroring T20's tense final overs. Purely a mood
// cue: White's move-selection logic is unaffected.
function updatePhaseInfo() {
    const el = document.getElementById('phase-pill');
    if (!el) return;
    el.classList.toggle('show', currentMoveNumber >= 26 && !gameOver);
}

function updateBranchInfo() {
    const branch = getCurrentBranch();
    const row    = document.getElementById('branch-row');
    const label  = document.getElementById('branch-label');
    if (branch === 'unknown') { row.style.display = 'none'; return; }
    row.style.display = 'flex';
    label.textContent = branch === 'philidor'
        ? '🛡️ Philidor-verdediging'
        : '🏟️ Ou-Indiër-verdediging';
}

function updateHistory() {
    const div = document.getElementById('history-list');
    div.innerHTML = '';
    moveHistory.forEach(e => {
        const item = document.createElement('div');
        item.className = 'history-item';
        let html = `<span class="move-num">${e.moveNum}.</span>`;
        if (e.white) html += `<span class="white-move">${e.white}</span>`;
        if (e.black) {
            html += `<span class="black-move">${e.black}</span>`;
            html += `<span class="score-badge s${e.blackScore}">+${e.blackScore}</span>`;
        }
        item.innerHTML = html;
        div.appendChild(item);
    });
    div.scrollTop = div.scrollHeight;
}

function showMessage(text, type) {
    const el = document.getElementById('game-message');
    el.textContent = text;
    switch (type) {
        case 'error':    el.style.color = '#E63946'; break;
        case 'thinking': el.style.color = '#2EC4B6'; break;
        case 'hint':     el.style.color = '#FFC94A'; break;
        default:         el.style.color = '#2EC4B6';
    }
}

function selectWeightedMove(moves) {
    const total = moves.reduce((s, m) => s + m.white + m.draws + m.black, 0);
    let rand = Math.random() * total;
    for (const m of moves) { rand -= (m.white + m.draws + m.black); if (rand <= 0) return m; }
    return moves[0];
}

// ==================== GAME END ====================

function getEndMessage(pct) {
    if (pct >= 97) return "Perfekte beurt! Jy het die d6-verdedigings volledig bemeester!";
    if (pct >= 90) return "Uitstekende beurt! Jy ken hierdie verdedigings baie goed.";
    if (pct >= 80) return "Baie goed gespeel! 'n Sterk beurt met mooi vordering.";
    if (pct >= 70) return "Goeie werk! Bly oefen vir daardie fynere lopies.";
    if (pct >= 60) return "Nie sleg nie! Elke wedstryd leer jou meer.";
    if (pct >= 50) return "Mooi probeer! Die d6-stelsel verg oefening — soos enige goeie kolfwerk.";
    if (pct >= 40) return "Hou aan oefen — jy verbeter elke wedstryd!";
    return "Moenie moed verloor nie — elke groot kolwer het stadig begin. Probeer weer!";
}

async function endGame() {
    gameOver = true;
    gameEndReason = 'moves';
    isThinking = false;
    clearHighlights();
    clearArrows();
    showMessage("Wedstryd verby! Besigtig jou finale posisie...", "info");
    setTimeout(async () => { await showEndGameModal(); }, 5000);
}

const MODAL_TITLES = {
    'moves':               'Wedstryd Verby!',
    'checkmate-white-wins':'Uitgeboul!',              // White mated Black — student lost
    'checkmate-black-wins':'Uitgeboul! Swart Wen!',    // Black mated White — student won!
    'draw':                'Gelykop!'
};

async function showEndGameModal() {
    await checkEndGameBadges();
    const isNew = saveHighScore(score);

    document.getElementById('modal-title').textContent = MODAL_TITLES[gameEndReason] || MODAL_TITLES.moves;

    // Outcome photo: Victory.jpg on a checkmate win or a perfect score,
    // OUT.jpg on a checkmate loss. Silent on every other ending (draw, or
    // just running out of moves without either) — no image is shown.
    const photoEl = document.getElementById('modal-outcome-photo');
    let outcomePhoto = null;
    if (gameEndReason === 'checkmate-black-wins' || score >= TARGET_SCORE) {
        outcomePhoto = 'Victory.jpg';
    } else if (gameEndReason === 'checkmate-white-wins') {
        outcomePhoto = 'OUT.jpg';
    }
    if (outcomePhoto) {
        photoEl.src = outcomePhoto;
        photoEl.alt = outcomePhoto === 'Victory.jpg' ? 'Victory!' : 'Out!';
        photoEl.style.display = 'block';
    } else {
        photoEl.style.display = 'none';
    }

    // Fair rating for an early-ended game (checkmate/draw before move 30):
    // percentage of the points actually possible in the moves played, not
    // always against the full 30-move TARGET_SCORE.
    const movesPlayed  = moveHistory.length;
    const maxPossible  = movesPlayed * 6;
    const pct          = maxPossible > 0 ? (score / maxPossible) * 100 : 0;

    document.getElementById('modal-score').textContent   = `${score}/${TARGET_SCORE} lopies`;
    document.getElementById('modal-rating').textContent  = getEndMessage(pct);

    const hsMsgEl = document.getElementById('modal-highscore-msg');
    if (isNew) { hsMsgEl.textContent = "NUWE BESTE TELLING!"; hsMsgEl.style.display = 'block'; }
    else       { hsMsgEl.style.display = 'none'; }

    const earned = document.getElementById('modal-badges-earned');
    const list   = document.getElementById('badges-earned-list');
    if (badgesEarnedThisGame.length > 0) {
        earned.style.display = 'block';
        list.innerHTML = badgesEarnedThisGame.map(id => `<span class="earned-badge">${BADGES[id].icon}</span>`).join('');
    } else { earned.style.display = 'none'; }

    document.getElementById('game-over-modal').classList.add('show');
    showMessage("Wedstryd verby! Kyk na jou telling.", "info");
}

// ==================== NEW GAME ====================

function newGame() {
    game = new Chess();
    board.position('start');
    board.orientation('black');

    currentMoveNumber    = 1;
    score                = 0;
    gameOver             = false;
    gameEndReason        = 'moves';
    moveHistory          = [];
    positionHistory      = [game.fen()];
    bestMove             = null;
    isThinking           = false;
    isReviewMode         = false;
    reviewPosition       = 0;
    badgesEarnedThisGame = [];
    perfectMovesThisGame = 0;
    lastWhiteMoveSan     = null;
    lastWhiteFenBefore   = null;
    antoshinExd4Played   = false;
    refillCelebrationPool();
    preloadCelebrationImages();
    primeShutterSound();
    pickBoardSponsors();

    clearSelection();
    clearArrows();
    resetTargetDisplay();

    document.getElementById('score').textContent            = '0/165';
    document.getElementById('move-counter').textContent     = '1/30';
    document.getElementById('progress-fill').style.width   = '0%';
    document.getElementById('history-list').innerHTML       = '';
    document.getElementById('move-score-display').style.display = 'none';
    document.getElementById('commentary-line').style.display = 'none';
    hideCoaching();
    document.getElementById('celebration-photo').classList.remove('show');
    document.getElementById('branch-row').style.display    = 'none';
    document.getElementById('white-pool').textContent       = 'Top 20 skuiwe';
    document.getElementById('white-pool').style.color      = '#2EC4B6';
    document.getElementById('phase-pill').classList.remove('show');
    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('review-panel').style.display  = 'none';
    document.getElementById('analysis-panel').style.display = 'flex';
    document.getElementById('stockfish-moves').innerHTML   = '<p class="analysis-placeholder">Wag vir jou skuif...</p>';
    document.getElementById('lichess-moves').innerHTML     = '<p class="analysis-placeholder">Wag vir jou skuif...</p>';
    document.getElementById('your-move-section').style.display = 'none';

    const evalEl = document.getElementById('position-eval');
    evalEl.textContent = '0.0';
    evalEl.className   = 'stat-value eval-equal';

    selectRandomWisdom();
    showMessage("Wag — Wit speel eerste...", "info");
    makeWhiteMove();
}

// ==================== REVIEW MODE ====================

function enterReviewMode() {
    if (!gameOver) return;
    isReviewMode   = true;
    reviewPosition = positionHistory.length - 1;
    clearArrows();
    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('analysis-panel').style.display = 'none';
    document.getElementById('review-panel').style.display   = 'flex';
    updateReviewDisplay();
}

function reviewBack()    { if (reviewPosition > 0) { reviewPosition--; updateReviewDisplay(); } }
function reviewForward() { if (reviewPosition < positionHistory.length - 1) { reviewPosition++; updateReviewDisplay(); } }

function exitReviewMode() {
    isReviewMode = false;
    document.getElementById('review-panel').style.display   = 'none';
    document.getElementById('analysis-panel').style.display = 'flex';
    board.position(positionHistory[positionHistory.length - 1]);
    showMessage("Wedstryd verby! Begin 'n nuwe wedstryd om weer te speel.", "info");
}

async function updateReviewDisplay() {
    const fen = positionHistory[reviewPosition];
    board.position(fen);
    updateReviewPositionLabel();
    document.getElementById('review-back-btn').disabled    = (reviewPosition === 0);
    document.getElementById('review-forward-btn').disabled = (reviewPosition === positionHistory.length - 1);
    await showBestMovesForReview(fen);
}

function updateReviewPositionLabel() {
    const posLabel    = document.getElementById('review-position');
    if (reviewPosition === 0) { posLabel.textContent = 'Beginposisie'; return; }
    const isAfterWhite = (reviewPosition % 2 === 1);
    const roundNum     = Math.ceil(reviewPosition / 2);
    const entry        = moveHistory[roundNum - 1];
    posLabel.textContent = isAfterWhite
        ? `Na ${roundNum}. ${entry?.white || '...'}`
        : `Na ${roundNum}... ${entry?.black || '...'}`;
}

async function showBestMovesForReview(fen) {
    const listEl = document.getElementById('best-moves-list');
    listEl.innerHTML = '<div class="loading"></div> Laai...';

    let playedMove = null, playerColor = null;
    if (reviewPosition > 0) {
        const isAfterWhite = (reviewPosition % 2 === 1);
        const roundNum     = Math.ceil(reviewPosition / 2);
        const entry        = moveHistory[roundNum - 1];
        if (entry) {
            if (!isAfterWhite) { playedMove = entry.black;  playerColor = 'black'; }
            else               { playedMove = entry.white;  playerColor = 'white'; }
        }
    }

    try {
        const d = await fetchLichessData(fen);
        if (!d || !d.moves || d.moves.length === 0) {
            listEl.innerHTML = '<p style="color:#6A8A6A;">Geen data vir hierdie posisie nie.</p>';
            return;
        }
        const sorted   = d.moves.sort((a, b) =>
            (b.white + b.draws + b.black) - (a.white + a.draws + a.black));
        const topMoves = sorted.slice(0, 2);

        let html = '';
        topMoves.forEach((m, i) => {
            const games   = m.white + m.draws + m.black;
            const winRate = games > 0 ? ((m.black / games) * 100).toFixed(0) : 0;
            const isYours = (playedMove === m.san && playerColor === 'black');
            html += `
                <div class="best-move-item rank-${i+1}">
                    <div>
                        <span class="best-move-san">${m.san}</span>
                        ${isYours ? '<span class="your-move-indicator">Jou skuif</span>' : ''}
                    </div>
                    <div class="best-move-stats">${games.toLocaleString()} spele (${winRate}% sw. wen)</div>
                </div>`;
        });

        if (playedMove && playerColor === 'black' && !topMoves.find(m => m.san === playedMove)) {
            const yd  = sorted.find(m => m.san === playedMove);
            if (yd) {
                const games   = yd.white + yd.draws + yd.black;
                const winRate = games > 0 ? ((yd.black / games) * 100).toFixed(0) : 0;
                const rank    = sorted.findIndex(m => m.san === playedMove) + 1;
                html += `
                    <div class="best-move-item" style="border-left:3px solid #FFC94A;margin-top:7px;">
                        <div>
                            <span class="best-move-san">${playedMove}</span>
                            <span class="your-move-indicator">Jou skuif (#${rank})</span>
                        </div>
                        <div class="best-move-stats">${games.toLocaleString()} spele (${winRate}% sw. wen)</div>
                    </div>`;
            }
        }
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = '<p style="color:#E63946;">Fout met laai van data.</p>';
    }
}

// ==================== PLAYER CHANGE ====================

function onPlayerChange() {
    currentPlayer = document.getElementById('player-select').value;
    loadHighScore();
    loadBadges();
    newGame();
}

// ==================== INITIALIZATION ====================

$(document).ready(function() {
    initStockfish();
    currentPlayer = document.getElementById('player-select').value;
    resetAllBadgesIfNeeded();
    initBoard();
    setupTapToMove();
    loadHighScore();
    loadBadges();
    selectRandomWisdom();
    setupBadgeHovers();
    preloadCelebrationImages();
    primeShutterSound();

    // Arrow canvas must be sized after board renders
    setTimeout(() => {
        initArrowCanvas();
        resizeArrowCanvas();
    }, 200);

    document.getElementById('new-game-btn').addEventListener('click', newGame);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('modal-new-game').addEventListener('click', newGame);
    document.getElementById('modal-review').addEventListener('click', enterReviewMode);
    document.getElementById('review-back-btn').addEventListener('click', reviewBack);
    document.getElementById('review-forward-btn').addEventListener('click', reviewForward);
    document.getElementById('exit-review-btn').addEventListener('click', exitReviewMode);
    document.getElementById('player-select').addEventListener('change', onPlayerChange);

    makeWhiteMove();
});

$(window).resize(function() {
    board.resize();
    resizeArrowCanvas();
});
