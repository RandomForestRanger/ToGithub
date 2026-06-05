// Bird Opening Trainer - Main Application Logic

// Stockfish.js Engine (runs in browser)
let stockfishEngine = null;
let stockfishReady = false;
let stockfishQueue = [];

// Initialize Stockfish engine
function initStockfish() {
    // Load Stockfish.js and create worker from Blob to avoid CORS issues
    fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(response => response.text())
        .then(code => {
            try {
                const blob = new Blob([code], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                stockfishEngine = new Worker(url);

                stockfishEngine.onmessage = function(event) {
                    const line = event.data;
                    // console.log('Stockfish:', line); // Uncomment for debugging

                    if (line === 'uciok' || line === 'readyok') {
                        stockfishReady = true;
                        console.log('Stockfish.js ready!');
                    }

                    // Process queued callbacks
                    stockfishQueue.forEach(item => {
                        if (item.callback) {
                            item.callback(line);
                        }
                    });
                };

                stockfishEngine.onerror = function(error) {
                    console.error('Stockfish worker error:', error);
                };

                // Initialize UCI
                stockfishEngine.postMessage('uci');

                console.log('Stockfish.js engine loaded and starting...');
            } catch (error) {
                console.error('Failed to create Stockfish worker:', error);
                stockfishEngine = null;
            }
        })
        .catch(error => {
            console.error('Failed to fetch Stockfish.js:', error);
            stockfishEngine = null;
        });
}

// Get analysis from local Stockfish.js
function getLocalStockfishEval(fen, depth = 12, multipv = 2) {
    return new Promise((resolve) => {
        if (!stockfishEngine) {
            console.log('Stockfish engine not available');
            resolve(null);
            return;
        }

        let results = [];
        let resolved = false;

        const callback = (line) => {
            if (resolved) return;

            // Parse info lines for PV data
            if (line.startsWith && line.startsWith('info') && line.includes(' pv ')) {
                const depthMatch = line.match(/depth (\d+)/);
                const multipvMatch = line.match(/multipv (\d+)/);
                const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                const pvMatch = line.match(/ pv (.+)/);

                if (depthMatch && pvMatch && scoreMatch) {
                    const d = parseInt(depthMatch[1]);
                    const mpv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
                    const scoreType = scoreMatch[1];
                    const scoreValue = parseInt(scoreMatch[2]);
                    const pv = pvMatch[1].split(' ')[0]; // Just first move

                    if (d >= depth - 2) {
                        const result = {
                            multipv: mpv,
                            moves: pv,
                            cp: scoreType === 'cp' ? scoreValue : undefined,
                            mate: scoreType === 'mate' ? scoreValue : undefined
                        };

                        const existingIdx = results.findIndex(r => r.multipv === mpv);
                        if (existingIdx >= 0) {
                            results[existingIdx] = result;
                        } else {
                            results.push(result);
                        }
                    }
                }
            }

            // Bestmove signals end of analysis
            if (line.startsWith && line.startsWith('bestmove')) {
                resolved = true;
                // Remove callback from queue
                const idx = stockfishQueue.findIndex(q => q.callback === callback);
                if (idx >= 0) stockfishQueue.splice(idx, 1);

                if (results.length > 0) {
                    results.sort((a, b) => a.multipv - b.multipv);
                    resolve(results);
                } else {
                    resolve(null);
                }
            }
        };

        // Add to queue
        stockfishQueue.push({ callback });

        // Send commands
        stockfishEngine.postMessage('ucinewgame');
        stockfishEngine.postMessage(`setoption name MultiPV value ${multipv}`);
        stockfishEngine.postMessage(`position fen ${fen}`);
        stockfishEngine.postMessage(`go depth ${depth}`);

        // Timeout after 8 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const idx = stockfishQueue.findIndex(q => q.callback === callback);
                if (idx >= 0) stockfishQueue.splice(idx, 1);

                if (results.length > 0) {
                    results.sort((a, b) => a.multipv - b.multipv);
                    resolve(results);
                } else {
                    resolve(null);
                }
            }
        }, 8000);
    });
}

// Game State
let game = new Chess();
let board = null;
let currentMoveNumber = 1;
let score = 0;
let gameOver = false;
let moveHistory = [];
let positionHistory = []; // Store FEN positions for review
let bestMove = null;
let isThinking = false;

// Review Mode State
let isReviewMode = false;
let reviewPosition = 0;

// Tap-to-move State (for touch devices)
let selectedSquare = null;

// High Score
let highScore = 0;

// Badge State
let unlockedBadges = new Set();
let badgesEarnedThisGame = [];
let perfectMovesThisGame = 0;

// Player State
let currentPlayer = 'Debora'; // Default player

// Constants
const TARGET_SCORE = 50;
const MAX_MOVES = 10;

// Player-specific storage keys
function getHighScoreKey() {
    return `birdOpening_${currentPlayer}_highScore`;
}

function getBadgesKey() {
    return `birdOpening_${currentPlayer}_badges`;
}

// Black's response pool sizes for moves 1-10: 20, 16, 8, 4, 2, 2, 2, 2, 2, 2
const BLACK_POOL_SIZES = [20, 16, 8, 4, 2, 2, 2, 2, 2, 2];

// Bird Opening Wisdom - 20 tactical/philosophical principles (Afrikaans)
const BIRD_WISDOM = [
    "Die Bird Opening mik om e5 te beheer en 'n koningsvleuel-aanval te loods.",
    "f4 berei Nf3 voor en 'n moontlike pionstorm met g4-g5.",
    "In die Bird Opening is die f-pion 'n spies, nie 'n skild nie—gebruik dit aggressief.",
    "Beheer van e5 is die strategiese hart van die Bird Opening.",
    "Die Leningrad-opstelling (g3, Bg2, d3) bied soliede ontwikkeling.",
    "Teen From se Gambiet (1...e5), aanvaar of weier—maar hê 'n plan.",
    "Die Stonewall (d4, e3, f4) skep 'n ystergreep op e5.",
    "Fianchetto van die koningsloper versterk jou koningsvleuel-ambisies.",
    "Die Bird Opening transponeer dikwels na Hollandse Verdediging-strukture met omgeruilde kleure.",
    "Hou jou koning veilig—f4 verswak die e1-h4 diagonaal vroeg.",
    "Die Bird Opening beloon spelers wat pionstrukture diep verstaan.",
    "f4 sein aggressiewe bedoeling—omhels die aanvallende gees!",
    "Ontwikkeling voor aanval: Nf3, g3, Bg2, dan druk!",
    "Die Bird Opening kan teenstanders verras wat nie die skerp lyne ken nie.",
    "In geslote posisies, maneuvreer jou perde na sterk buiteposte.",
    "Die e5-veld is jou vuurtoring—hou dit altyd in sig.",
    "Tydige e3 ondersteun die sentrum en bevry jou donkerveld-loper.",
    "Die Bird Opening was 'n gunsteling van Bent Larsen en Henrik Danielsen.",
    "Geduld in die Bird Opening betaal—bou op voor jy slaan.",
    "Teen 1...d5, oorweeg die Staunton Gambiet (2.e4) vir skerp spel."
];

// Badge Descriptions for hover (Afrikaans)
const BADGE_DESCRIPTIONS = {
    'bird-master': "Behaal 'n perfekte 50 punte in een spel. Speel al 10 skuiwe optimaal!",
    'froms-fighter': "Trotseer From se Gambiet wanneer Swart 1...e5 speel. 'n Skerp teenaanval!",
    'classical-player': "Betree die Staunton Gambiet met 1.f4 d5 2.e4. 'n Dapper pion-opoffering!",
    'dutch-mirror': "Trotseer die simmetriese 1...d5 (Dutch Opening), waar Swart Hollandse Verdediging-idees weerspieël.",
    'gambit-acceptor': "Aanvaar From se Gambiet met 2.fxe5. Neem die pion en hou vas!",
    'gambit-decliner': "Weier From se Gambiet met 2.Nf3 of 2.e4. Solied en prinsipieel.",
    'lasker-line': "Speel deur die volle Lasker Variasie: 1.f4 e5 2.fxe5 d6 3.exd6 Bxd6 4.Nf3 g5.",
    'stonewall': "Bou die Stonewall-struktuur met pionne op d4, e3, en f4.",
    'polar-bear': "Voltooi die Ysbeer stelsel: b3, Bb2, e3, f4 pionne, Nf3, Be2/Bd3, en gerokeer.",
    'theoretician': "Bereik 5 of meer perfekte skuiwe (5 punte elk) in een spel.",
    'grandmaster': "Bereik 7 of meer perfekte skuiwe (5 punte elk) in een spel.",
    'queen-hunter': "Vang Swart se koningin tydens die spel. 'n Seldsame trofee!",
    'leningrad': "Bou die Leningrad opstelling: Nf3, g3, Bg2, en 0-0. 'n Omgekeerde Leningrad Dutch!",
    'dominant': "Eindig die spel met 'n enjin-evaluasie van +2.0 of beter. Totale beheer!",
    'sturm-gambit': "Speel die Mujannah-Sturm Gambiet: 1.f4 d5 2.c4. Réti-styl idees!",
    'flying-orangutan': "Kombineer die Bird met b4 - die Vlieënde Orang-oetan!"
};

let currentWisdom = '';

// Badge Definitions (Afrikaans)
const BADGES = {
    'bird-master': { icon: '🦅', name: 'Voëlmeester', desc: 'Perfekte 50-punt spel' },
    'froms-fighter': { icon: '🔥', name: "From se Vegter", desc: 'Trotseer 1...e5' },
    'classical-player': { icon: '🎩', name: 'Klassieke Speler', desc: 'Staunton Gambiet (1.f4 d5 2.e4)' },
    'dutch-mirror': { icon: '🏰', name: 'Hollandse Spieël', desc: 'Trotseer 1...d5 (Dutch Opening)' },
    'gambit-acceptor': { icon: '⚡', name: 'Gambiet Aanvaarder', desc: 'Speel 2.fxe5' },
    'gambit-decliner': { icon: '🛡️', name: 'Gambiet Weierer', desc: 'Weier met 2.Nf3 of 2.e4' },
    'lasker-line': { icon: '📜', name: 'Lasker Lyn', desc: 'Volle Lasker Variasie' },
    'stonewall': { icon: '🏔️', name: 'Stonewall', desc: 'Pionne op d4, e3, f4' },
    'polar-bear': { icon: '🐻', name: 'Ysbeer', desc: 'Ysbeer (Polar Bear System)' },
    'theoretician': { icon: '📚', name: 'Teoretikus', desc: '5+ perfekte skuiwe' },
    'grandmaster': { icon: '👑', name: 'Grootmeester', desc: '7+ perfekte skuiwe' },
    'queen-hunter': { icon: '♛', name: 'Koningin Jagter', desc: 'Vang die koningin' },
    'leningrad': { icon: '🌊', name: 'Leningrad', desc: 'Nf3, g3, Bg2, 0-0 opstelling' },
    'dominant': { icon: '💪', name: 'Dominant', desc: '+2.0 eval na 10 skuiwe' },
    'sturm-gambit': { icon: '⚔️', name: 'Sturm Gambiet', desc: '1.f4 d5 2.c4' },
    'flying-orangutan': { icon: '🦧', name: 'Vlieënde Orang-oetan', desc: 'Bird + b4' }
};

// ==================== BADGE TOOLTIP SYSTEM ====================

function selectRandomWisdom() {
    const index = Math.floor(Math.random() * BIRD_WISDOM.length);
    currentWisdom = BIRD_WISDOM[index];
    showWisdom();
}

function showWisdom() {
    const tooltip = document.getElementById('badge-tooltip');
    const tooltipText = document.getElementById('tooltip-text');
    tooltip.classList.remove('badge-hover');
    tooltipText.textContent = currentWisdom;
}

function showBadgeDescription(badgeId) {
    const tooltip = document.getElementById('badge-tooltip');
    const tooltipText = document.getElementById('tooltip-text');
    const description = BADGE_DESCRIPTIONS[badgeId];

    if (description) {
        tooltip.classList.add('badge-hover');
        tooltipText.textContent = description;
    }
}

function setupBadgeHovers() {
    const badgeItems = document.querySelectorAll('.badge-item');

    badgeItems.forEach(item => {
        const badgeId = item.dataset.badge;

        item.addEventListener('mouseenter', () => {
            showBadgeDescription(badgeId);
        });

        item.addEventListener('mouseleave', () => {
            showWisdom();
        });
    });
}

// ==================== BADGE SYSTEM ====================

// Reset all badges for all players (one-time reset when badges change)
function resetAllBadgesIfNeeded() {
    const BADGE_VERSION = 'v2'; // Increment this to trigger a reset
    const storedVersion = localStorage.getItem('birdOpening_badgeVersion');

    if (storedVersion !== BADGE_VERSION) {
        // Clear all badge data for all players
        const players = ['Debora', 'Jack', 'Jacobus', 'Sammy', 'Thomas', 'Martin', 'Coach Corno', 'Birdman'];
        players.forEach(player => {
            localStorage.removeItem(`birdOpening_${player}_badges`);
        });
        localStorage.setItem('birdOpening_badgeVersion', BADGE_VERSION);
        console.log('All badges have been reset due to badge system update.');
    }
}

// Load badges from localStorage (player-specific)
function loadBadges() {
    const saved = localStorage.getItem(getBadgesKey());
    if (saved) {
        try {
            unlockedBadges = new Set(JSON.parse(saved));
        } catch (e) {
            unlockedBadges = new Set();
        }
    } else {
        unlockedBadges = new Set();
    }
    updateBadgeDisplay();
}

// Save badges to localStorage (player-specific)
function saveBadges() {
    localStorage.setItem(getBadgesKey(), JSON.stringify([...unlockedBadges]));
}

// Unlock a badge
function unlockBadge(badgeId) {
    if (unlockedBadges.has(badgeId)) return false; // Already unlocked

    unlockedBadges.add(badgeId);
    badgesEarnedThisGame.push(badgeId);
    saveBadges();
    updateBadgeDisplay(badgeId);
    showBadgeNotification(badgeId);
    return true;
}

// Update badge display
function updateBadgeDisplay(justUnlockedId = null) {
    Object.keys(BADGES).forEach(badgeId => {
        const el = document.getElementById(`badge-${badgeId}`);
        if (!el) return;

        if (unlockedBadges.has(badgeId)) {
            el.classList.remove('locked');
            el.classList.add('unlocked');
            if (badgeId === justUnlockedId) {
                el.classList.add('just-unlocked');
                setTimeout(() => el.classList.remove('just-unlocked'), 600);
            }
        } else {
            el.classList.add('locked');
            el.classList.remove('unlocked');
        }
    });
}

// Show badge notification
function showBadgeNotification(badgeId) {
    const badge = BADGES[badgeId];
    if (!badge) return;

    const notif = document.getElementById('badge-notification');
    const iconEl = document.getElementById('notif-icon');
    const textEl = document.getElementById('notif-text');

    iconEl.textContent = badge.icon;
    textEl.textContent = `${badge.name} Ontsluit!`;

    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

// Check all badge conditions
function checkBadges() {
    const history = game.history();

    // From's Fighter: Black played 1...e5
    if (history.length >= 2 && history[0] === 'f4' && history[1] === 'e5') {
        unlockBadge('froms-fighter');
    }

    // Dutch Mirror: Black played 1...d5
    if (history.length >= 2 && history[0] === 'f4' && history[1] === 'd5') {
        unlockBadge('dutch-mirror');
    }

    // Classical Player: Staunton Gambit (1.f4 d5 2.e4)
    if (history.length >= 3 && history[0] === 'f4' && history[1] === 'd5' && history[2] === 'e4') {
        unlockBadge('classical-player');
    }

    // Gambit Acceptor: Play 2.fxe5 (after 1.f4 e5)
    if (history.length >= 3 && history[0] === 'f4' && history[1] === 'e5' && history[2] === 'fxe5') {
        unlockBadge('gambit-acceptor');
    }

    // Gambit Decliner: After 1.f4 e5, play 2.Nf3 or 2.e4
    if (history.length >= 3 && history[0] === 'f4' && history[1] === 'e5') {
        if (history[2] === 'Nf3' || history[2] === 'e4') {
            unlockBadge('gambit-decliner');
        }
    }

    // Lasker Line: 1.f4 e5 2.fxe5 d6 3.exd6 Bxd6 4.Nf3 g5
    if (history.length >= 8) {
        const laskerSequence = ['f4', 'e5', 'fxe5', 'd6', 'exd6', 'Bxd6', 'Nf3', 'g5'];
        let isLasker = true;
        for (let i = 0; i < 8; i++) {
            if (history[i] !== laskerSequence[i]) {
                isLasker = false;
                break;
            }
        }
        if (isLasker) {
            unlockBadge('lasker-line');
        }
    }

    // Polar Bear: Strict check - actual piece positions
    checkPolarBearSetup();

    // Leningrad Setup: Nf3, g3, Bg2, 0-0
    checkLeningradSetup();

    // Sturm Gambit: 1.f4 d5 2.c4
    if (history.length >= 3 && history[0] === 'f4' && history[1] === 'd5' && history[2] === 'c4') {
        unlockBadge('sturm-gambit');
    }

    // Flying Orangutan: Bird (f4) + b4 at some point
    if (history.includes('f4') && history.includes('b4')) {
        unlockBadge('flying-orangutan');
    }

    // Stonewall Setup: Pawns on d4, e3, f4
    checkStonewallSetup();
}

// Check for Stonewall pawn structure
function checkStonewallSetup() {
    const board = game.board();

    // board[row][col] - row 0 is rank 8, row 7 is rank 1
    // d4 = row 4, col 3; e3 = row 5, col 4; f4 = row 4, col 5
    const hasD4Pawn = board[4]?.[3]?.type === 'p' && board[4][3].color === 'w';
    const hasE3Pawn = board[5]?.[4]?.type === 'p' && board[5][4].color === 'w';
    const hasF4Pawn = board[4]?.[5]?.type === 'p' && board[4][5].color === 'w';

    if (hasD4Pawn && hasE3Pawn && hasF4Pawn) {
        unlockBadge('stonewall');
    }
}

// Check for Polar Bear System - strict piece placement
// Requires: b3 pawn, Bb2, e3 pawn, f4 pawn, Nf3, Be2 or Bd3, and castled kingside
function checkPolarBearSetup() {
    const board = game.board();
    const history = game.history();

    // Check pawns: b3, e3, f4
    const hasB3Pawn = board[5]?.[1]?.type === 'p' && board[5][1].color === 'w';
    const hasE3Pawn = board[5]?.[4]?.type === 'p' && board[5][4].color === 'w';
    const hasF4Pawn = board[4]?.[5]?.type === 'p' && board[4][5].color === 'w';

    // Check Bb2 (dark-squared bishop)
    const hasBb2 = board[6]?.[1]?.type === 'b' && board[6][1].color === 'w';

    // Check Nf3
    const hasNf3 = board[5]?.[5]?.type === 'n' && board[5][5].color === 'w';

    // Check Be2 or Bd3 (light-squared bishop developed)
    const hasBe2 = board[6]?.[4]?.type === 'b' && board[6][4].color === 'w';
    const hasBd3 = board[5]?.[3]?.type === 'b' && board[5][3].color === 'w';
    const hasLightBishopDeveloped = hasBe2 || hasBd3;

    // Check if castled kingside (king on g1)
    const hasCastled = board[7]?.[6]?.type === 'k' && board[7][6].color === 'w';

    if (hasB3Pawn && hasE3Pawn && hasF4Pawn && hasBb2 && hasNf3 && hasLightBishopDeveloped && hasCastled) {
        unlockBadge('polar-bear');
    }
}

// Check for Leningrad Setup - Nf3, g3, Bg2, and 0-0
function checkLeningradSetup() {
    const board = game.board();

    // Check g3 pawn
    const hasG3Pawn = board[5]?.[6]?.type === 'p' && board[5][6].color === 'w';

    // Check Bg2 (fianchettoed bishop)
    const hasBg2 = board[6]?.[6]?.type === 'b' && board[6][6].color === 'w';

    // Check Nf3
    const hasNf3 = board[5]?.[5]?.type === 'n' && board[5][5].color === 'w';

    // Check if castled kingside (king on g1)
    const hasCastled = board[7]?.[6]?.type === 'k' && board[7][6].color === 'w';

    if (hasG3Pawn && hasBg2 && hasNf3 && hasCastled) {
        unlockBadge('leningrad');
    }
}

// Check end-game badges
async function checkEndGameBadges() {
    // Bird Master: Perfect 50-point game
    if (score === TARGET_SCORE) {
        unlockBadge('bird-master');
    }

    // Theoretician: 5+ perfect moves (score 5)
    if (perfectMovesThisGame >= 5) {
        unlockBadge('theoretician');
    }

    // Grandmaster: 7+ perfect moves
    if (perfectMovesThisGame >= 7) {
        unlockBadge('grandmaster');
    }

    // Dominant: +2.0 (200 centipawns) or better at end of game
    try {
        const evalData = await fetchStockfishEval(game.fen());
        if (evalData && evalData.pvs && evalData.pvs[0]) {
            const cp = evalData.pvs[0].cp;
            const mate = evalData.pvs[0].mate;
            // +200cp for White, or mate in X for White (positive mate)
            if ((cp !== undefined && cp >= 200) || (mate !== undefined && mate > 0)) {
                unlockBadge('dominant');
            }
        }
    } catch (error) {
        console.error('Error checking dominant badge:', error);
    }
}

// ==================== HIGH SCORE ====================

function loadHighScore() {
    const saved = localStorage.getItem(getHighScoreKey());
    if (saved !== null) {
        highScore = parseInt(saved, 10);
    } else {
        highScore = 0;
    }
    updateHighScoreDisplay();
}

function saveHighScore(newScore) {
    if (newScore > highScore) {
        highScore = newScore;
        localStorage.setItem(getHighScoreKey(), highScore.toString());
        updateHighScoreDisplay(true);
        return true;
    }
    return false;
}

function updateHighScoreDisplay(isNewRecord = false) {
    const highscoreEl = document.getElementById('highscore');
    const highscoreBox = document.querySelector('.highscore-box');

    highscoreEl.textContent = highScore;

    if (isNewRecord) {
        highscoreBox.classList.add('new-record');
        setTimeout(() => highscoreBox.classList.remove('new-record'), 2000);
    }
}

// ==================== GAME LOGIC ====================

function getBlackPoolSize(moveNumber) {
    return BLACK_POOL_SIZES[moveNumber - 1] || 2;
}

function initBoard() {
    const config = {
        draggable: false,
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    board = Chessboard('board', config);
    positionHistory = [game.fen()];
}

function onSnapEnd() {
    board.position(game.fen());
}

async function processWhiteMove(move) {
    if (currentMoveNumber === 1 && move.san !== 'f4') {
        game.undo();
        board.position(game.fen());
        showMessage("Jy moet 1. f4 speel om die Bird Opening te begin!", "error");
        return;
    }

    isThinking = true;

    const positionBeforeMove = new Chess();
    const history = game.history();
    for (let i = 0; i < history.length - 1; i++) {
        positionBeforeMove.move(history[i]);
    }

    let moveScore = 5;
    if (currentMoveNumber > 1) {
        // New unified scoring system for all moves
        moveScore = await scoreMove(positionBeforeMove.fen(), move);
    }

    // Track perfect moves for Theoretician badge
    if (moveScore === 5) {
        perfectMovesThisGame++;
    }

    score += moveScore;

    positionHistory.push(game.fen());

    moveHistory.push({
        moveNum: currentMoveNumber,
        white: move.san,
        whiteScore: moveScore,
        whiteFenBefore: positionBeforeMove.fen(),
        black: null,
        blackFenBefore: null
    });

    updateDisplay(moveScore);
    updateHistory();

    // Check badges after each move
    checkBadges();

    // Show move analysis panel with best moves comparison
    await showMoveAnalysis(positionBeforeMove.fen(), move.san);

    // Show what the best move WAS (after White played)
    await showAutoHints();

    // Wait 2 seconds so player can see the hints
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear highlights before Black moves
    clearHighlights();

    // Black plays (even after move 10)
    await makeBlackMove();

    positionHistory.push(game.fen());
    moveHistory[moveHistory.length - 1].blackFenBefore = positionHistory[positionHistory.length - 2];

    // Update position evaluation display
    updatePositionEval();

    // Check badges after black's move too
    checkBadges();

    // End game after move 10 (after Black has responded)
    if (currentMoveNumber >= MAX_MOVES) {
        endGame();
        return;
    }

    currentMoveNumber++;
    updateMoveCounter();
    updateBlackPoolInfo();
    updateScoringMethodInfo();

    await fetchBestMove();

    isThinking = false;
}

// Unified scoring system
// If >= 20 games: 5 pts for top 2 popular OR top 2 engine, then popularity ladder
// If < 20 games: Pure Stockfish ranking
async function scoreMove(fen, move) {
    try {
        const uciMove = move.from + move.to + (move.promotion || '');

        // Fetch both Lichess and Stockfish data
        const [lichessData, stockfishData] = await Promise.all([
            fetchLichessData(fen),
            fetchStockfishEval(fen)
        ]);

        // Calculate total games from Lichess
        let totalGames = 0;
        let popularMoves = [];

        if (lichessData && lichessData.moves && lichessData.moves.length > 0) {
            popularMoves = lichessData.moves.sort((a, b) => {
                const totalA = a.white + a.draws + a.black;
                const totalB = b.white + b.draws + b.black;
                return totalB - totalA;
            });
            totalGames = popularMoves.reduce((sum, m) => sum + m.white + m.draws + m.black, 0);
        }

        // Get Stockfish top moves (convert UCI to SAN)
        let engineTopMoves = [];
        if (stockfishData && stockfishData.pvs && stockfishData.pvs.length > 0) {
            for (const pv of stockfishData.pvs) {
                const uci = pv.moves.split(' ')[0];
                const testGame = new Chess(fen);
                const engineMove = testGame.move({
                    from: uci.slice(0, 2),
                    to: uci.slice(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
                if (engineMove) {
                    engineTopMoves.push({ san: engineMove.san, uci: uci });
                }
            }
        }

        // If < 20 games, use pure Stockfish scoring
        if (totalGames < 20) {
            return scoreByStockfishOnly(move.san, uciMove, engineTopMoves, stockfishData, fen);
        }

        // >= 20 games: Combined scoring
        // Both Lichess popularity AND Stockfish rankings count for all tiers
        const popularityIndex = popularMoves.findIndex(m => m.san === move.san);
        const engineIndex = engineTopMoves.findIndex(m => m.san === move.san);

        // 5 points: Top 2 popular OR top 2 engine
        if (popularityIndex === 0 || popularityIndex === 1 ||
            engineIndex === 0 || engineIndex === 1) {
            return 5;
        }

        // 4 points: 3rd-4th popular OR 3rd-4th engine
        if (popularityIndex === 2 || popularityIndex === 3 ||
            engineIndex === 2 || engineIndex === 3) {
            return 4;
        }

        // 3 points: 5th popular OR 5th engine
        if (popularityIndex === 4 || engineIndex === 4) {
            return 3;
        }

        // 2 points: 6th popular OR 6th engine
        if (popularityIndex === 5 || engineIndex === 5) {
            return 2;
        }

        // 1 point: Everything else
        return 1;

    } catch (error) {
        console.error('Error scoring move:', error);
        return 3;
    }
}

// Pure Stockfish scoring when < 20 games
async function scoreByStockfishOnly(moveSan, uciMove, engineTopMoves, stockfishData, fen) {
    // If we have engine data with multiple PVs
    if (engineTopMoves.length > 0) {
        const engineIndex = engineTopMoves.findIndex(m => m.san === moveSan || m.uci === uciMove);

        if (engineIndex === 0 || engineIndex === 1) return 5;  // Top 2
        if (engineIndex === 2 || engineIndex === 3) return 4;  // Next 2
        if (engineIndex === 4) return 3;                        // Position 5
        if (engineIndex === 5) return 2;                        // Position 6

        // If not in top moves, try to evaluate by centipawn loss
        if (stockfishData && stockfishData.pvs && stockfishData.pvs[0]) {
            const bestEval = stockfishData.pvs[0].cp || 0;

            try {
                const gameAfter = new Chess(fen);
                gameAfter.move(moveSan);
                const evalAfter = await fetchStockfishEval(gameAfter.fen());

                if (evalAfter && evalAfter.pvs && evalAfter.pvs[0]) {
                    const ourEval = -(evalAfter.pvs[0].cp || 0);
                    const evalDiff = bestEval - ourEval;

                    if (evalDiff <= 10) return 5;
                    if (evalDiff <= 30) return 4;
                    if (evalDiff <= 60) return 3;
                    if (evalDiff <= 100) return 2;
                    return 1;
                }
            } catch (e) {
                console.error('Error evaluating move:', e);
            }
        }

        return 1;  // Not a top engine move
    }

    return 3;  // Default if no data available
}

async function fetchStockfishEval(fen) {
    const encodedFen = encodeURIComponent(fen);

    // First try Lichess Cloud Eval (fast, cached positions)
    try {
        const url = `https://lichess.org/api/cloud-eval?fen=${encodedFen}&multiPv=5`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data && data.pvs && data.pvs.length > 0) {
                console.log('Using Lichess cloud eval');
                return data;
            }
        }
        console.log('Lichess returned no data for this position');
    } catch (error) {
        console.log('Lichess cloud eval error:', error.message);
    }

    // Fallback to local Stockfish.js (runs in browser)
    if (stockfishEngine) {
        try {
            console.log('Trying local Stockfish.js...');
            const results = await getLocalStockfishEval(fen, 10, 2);
            if (results && results.length > 0) {
                console.log('Using local Stockfish.js, got', results.length, 'moves');
                results.sort((a, b) => a.multipv - b.multipv);
                return { pvs: results };
            } else {
                console.log('Local Stockfish returned no results');
            }
        } catch (error) {
            console.error('Local Stockfish.js error:', error);
        }
    } else {
        console.log('Local Stockfish engine not initialized');
    }

    return null;
}

async function makeBlackMove() {
    showMessage("Swart dink...", "thinking");

    const history = game.history();

    // Special case: After 1.f4, 20% chance of From's Gambit (1...e5)
    if (currentMoveNumber === 1 && Math.random() < 0.20) {
        const move = game.move('e5');
        if (move) {
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = 'e5';
            showMessage("Swart speel e5 (From se Gambiet!)", "info");
            return;
        }
    }

    // Polar Bear system boosted probabilities
    // After 1.f4, 30% chance of d5 (to start Polar Bear path)
    if (currentMoveNumber === 1 && Math.random() < 0.30) {
        const move = game.move('d5');
        if (move) {
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = 'd5';
            showMessage("Swart speel d5", "info");
            return;
        }
    }

    // After 1.f4 d5 2.Nf3, 40% chance of Nf6
    if (currentMoveNumber === 2 && history.length >= 2 &&
        history[0] === 'f4' && history[1] === 'd5' && history[2] === 'Nf3' &&
        Math.random() < 0.40) {
        const move = game.move('Nf6');
        if (move) {
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = 'Nf6';
            showMessage("Swart speel Nf6", "info");
            return;
        }
    }

    // After 1.f4 d5 2.Nf3 Nf6 3.e3, 50% chance of g6
    if (currentMoveNumber === 3 && history.length >= 4 &&
        history[0] === 'f4' && history[1] === 'd5' &&
        history[2] === 'Nf3' && history[3] === 'Nf6' && history[4] === 'e3' &&
        Math.random() < 0.50) {
        const move = game.move('g6');
        if (move) {
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = 'g6';
            showMessage("Swart speel g6", "info");
            return;
        }
    }

    // From move 7 onwards, Black plays the best Stockfish move
    if (currentMoveNumber >= 7) {
        const stockfishMove = await getBlackStockfishMove();
        if (stockfishMove) {
            const move = game.move(stockfishMove);
            if (move) {
                board.position(game.fen());
                moveHistory[moveHistory.length - 1].black = stockfishMove;
                showMessage(`Swart speel ${stockfishMove} (enjin)`, "info");
                return;
            }
        }
        // Fallback to popularity if Stockfish fails
    }

    const poolSize = getBlackPoolSize(currentMoveNumber);

    try {
        const data = await fetchLichessData(game.fen());

        if (!data || !data.moves || data.moves.length === 0) {
            const moves = game.moves();
            if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                game.move(randomMove);
                board.position(game.fen());
                moveHistory[moveHistory.length - 1].black = randomMove;
                showMessage(`Swart speel ${randomMove}`, "info");
            }
            return;
        }

        const sortedMoves = data.moves.sort((a, b) => {
            const totalA = a.white + a.draws + a.black;
            const totalB = b.white + b.draws + b.black;
            return totalB - totalA;
        });

        const candidateMoves = sortedMoves.slice(0, Math.min(poolSize, sortedMoves.length));
        const selectedMove = selectWeightedMove(candidateMoves);

        const move = game.move(selectedMove.san);
        if (move) {
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = selectedMove.san;
            showMessage(`Swart speel ${selectedMove.san}`, "info");
        }

    } catch (error) {
        console.error('Error making black move:', error);
        const moves = game.moves();
        if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            game.move(randomMove);
            board.position(game.fen());
            moveHistory[moveHistory.length - 1].black = randomMove;
        }
    }
}

// Get best Stockfish move for Black
async function getBlackStockfishMove() {
    try {
        const data = await fetchStockfishEval(game.fen());
        if (data && data.pvs && data.pvs[0]) {
            const uciMove = data.pvs[0].moves.split(' ')[0];
            // Convert UCI to SAN
            const testGame = new Chess(game.fen());
            const move = testGame.move({
                from: uciMove.slice(0, 2),
                to: uciMove.slice(2, 4),
                promotion: uciMove.length > 4 ? uciMove[4] : undefined
            });
            if (move) {
                return move.san;
            }
        }
    } catch (error) {
        console.error('Error getting Stockfish move for Black:', error);
    }
    return null;
}

function selectWeightedMove(moves) {
    const totalGames = moves.reduce((sum, m) => sum + m.white + m.draws + m.black, 0);
    let random = Math.random() * totalGames;

    for (const move of moves) {
        const weight = move.white + move.draws + move.black;
        random -= weight;
        if (random <= 0) {
            return move;
        }
    }

    return moves[0];
}

async function fetchLichessData(fen) {
    const encodedFen = encodeURIComponent(fen);
    const url = `https://explorer.lichess.ovh/lichess?fen=${encodedFen}&ratings=1600,1800,2000,2200,2500&speeds=rapid,classical`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + (window.LICHESS_TOKEN || '') }
        });
        if (!response.ok) {
            throw new Error('Lichess API error');
        }
        return await response.json();
    } catch (error) {
        console.error('Lichess API error:', error);
        return null;
    }
}

async function fetchBestMove() {
    if (game.turn() !== 'w') return;

    // From move 5 onwards, use Stockfish for hints
    if (currentMoveNumber >= 5) {
        try {
            const data = await fetchStockfishEval(game.fen());
            if (data && data.pvs && data.pvs[0]) {
                const uciMove = data.pvs[0].moves.split(' ')[0];
                const testGame = new Chess(game.fen());
                const move = testGame.move({
                    from: uciMove.slice(0, 2),
                    to: uciMove.slice(2, 4),
                    promotion: uciMove.length > 4 ? uciMove[4] : undefined
                });
                if (move) {
                    bestMove = { san: move.san, source: 'engine' };
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching engine best move:', error);
        }
    }

    try {
        const data = await fetchLichessData(game.fen());
        if (data && data.moves && data.moves.length > 0) {
            const sortedMoves = data.moves.sort((a, b) => {
                const totalA = a.white + a.draws + a.black;
                const totalB = b.white + b.draws + b.black;
                return totalB - totalA;
            });
            bestMove = { san: sortedMoves[0].san, source: 'popularity' };
        } else {
            bestMove = null;
        }
    } catch (error) {
        bestMove = null;
    }
}

function showHint() {
    if (!bestMove || gameOver || isThinking) return;

    // Only allow hints for moves 3-6
    const disabledMoves = [1, 2, 7, 8, 9, 10];
    if (disabledMoves.includes(currentMoveNumber)) {
        showMessage(`Wenke is nie beskikbaar vir skuif ${currentMoveNumber} nie.`, "error");
        return;
    }

    const hintType = bestMove.source === 'engine' ? 'enjin beste skuif' : 'gewildste skuif';
    showMessage(`Wenk: Die ${hintType} is ${bestMove.san}`, "hint");

    const san = bestMove.san;
    const match = san.match(/[a-h][1-8]/g);
    if (match && match.length > 0) {
        const targetSquare = match[match.length - 1];
        highlightSquare(targetSquare);
        setTimeout(() => clearHighlights(), 2000);
    }
}

function highlightSquare(square) {
    const $square = $(`#board .square-${square}`);
    $square.addClass('highlight-hint');
}

function clearHighlights() {
    $('#board .square-55d63').removeClass('highlight-hint highlight-popularity highlight-engine highlight-both');
}

// ==================== TAP-TO-MOVE (TOUCH DEVICES) ====================

function clearSelection() {
    selectedSquare = null;
    $('#board .square-55d63').removeClass('highlight-selected highlight-legal-move');
}

function showLegalMoves(square) {
    const moves = game.moves({ square: square, verbose: true });
    moves.forEach(function(m) {
        $(`#board .square-${m.to}`).addClass('highlight-legal-move');
    });
}

function attemptTapMove(from, to) {
    const piece = game.get(from);
    const isPromotion = piece && piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') ||
         (piece.color === 'b' && to[1] === '1'));

    const move = game.move({
        from: from,
        to: to,
        promotion: isPromotion ? 'q' : undefined
    });

    clearSelection();

    if (move === null) return;

    board.position(game.fen());

    if (move.captured === 'q') {
        unlockBadge('queen-hunter');
    }

    processWhiteMove(move);
}

function setupTapToMove() {
    $('#board').on('click', '.square-55d63', function() {
        if (gameOver || isThinking || isReviewMode || game.turn() !== 'w') return;

        // Determine which square was clicked
        const classList = $(this).attr('class').split(/\s+/);
        let clickedSquare = null;
        for (let i = 0; i < classList.length; i++) {
            const match = classList[i].match(/^square-([a-h][1-8])$/);
            if (match) {
                clickedSquare = match[1];
                break;
            }
        }
        if (!clickedSquare) return;

        const clickedPiece = game.get(clickedSquare);

        if (selectedSquare) {
            // Clicked same square — deselect
            if (clickedSquare === selectedSquare) {
                clearSelection();
                return;
            }

            // Clicked another white piece — reselect
            if (clickedPiece && clickedPiece.color === 'w') {
                clearSelection();
                selectedSquare = clickedSquare;
                $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
                showLegalMoves(clickedSquare);
                return;
            }

            // Try to move to the clicked square
            attemptTapMove(selectedSquare, clickedSquare);
            return;
        }

        // No piece selected — select a white piece
        if (clickedPiece && clickedPiece.color === 'w') {
            selectedSquare = clickedSquare;
            $(`#board .square-${clickedSquare}`).addClass('highlight-selected');
            showLegalMoves(clickedSquare);
        }
    });
}

// Show move analysis panel with best moves after White plays
async function showMoveAnalysis(fenBeforeMove, playedMove) {
    const stockfishDiv = document.getElementById('stockfish-moves');
    const lichessDiv = document.getElementById('lichess-moves');
    const yourMoveSection = document.getElementById('your-move-section');
    const yourMoveInfo = document.getElementById('your-move-info');

    stockfishDiv.innerHTML = '<p class="analysis-placeholder">Laai...</p>';
    lichessDiv.innerHTML = '<p class="analysis-placeholder">Laai...</p>';

    let stockfishMoves = [];
    let lichessMoves = [];

    // Fetch Stockfish best moves
    try {
        const stockfishData = await fetchStockfishEval(fenBeforeMove);
        if (stockfishData && stockfishData.pvs && stockfishData.pvs.length > 0) {
            for (const pv of stockfishData.pvs.slice(0, 2)) {
                const uci = pv.moves.split(' ')[0];
                const testGame = new Chess(fenBeforeMove);
                const move = testGame.move({
                    from: uci.slice(0, 2),
                    to: uci.slice(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
                if (move) {
                    const evalText = pv.mate !== undefined
                        ? `#${pv.mate}`
                        : `${pv.cp >= 0 ? '+' : ''}${(pv.cp / 100).toFixed(1)}`;
                    stockfishMoves.push({ san: move.san, eval: evalText });
                }
            }
        }
    } catch (error) {
        console.error('Error fetching Stockfish for analysis:', error);
    }

    // Fetch Lichess popular moves
    try {
        const lichessData = await fetchLichessData(fenBeforeMove);
        if (lichessData && lichessData.moves && lichessData.moves.length > 0) {
            const sortedMoves = lichessData.moves.sort((a, b) => {
                const totalA = a.white + a.draws + a.black;
                const totalB = b.white + b.draws + b.black;
                return totalB - totalA;
            });

            for (const move of sortedMoves.slice(0, 2)) {
                const games = move.white + move.draws + move.black;
                const winRate = games > 0 ? ((move.white / games) * 100).toFixed(0) : 0;
                lichessMoves.push({
                    san: move.san,
                    games: games,
                    winRate: winRate
                });
            }
        }
    } catch (error) {
        console.error('Error fetching Lichess for analysis:', error);
    }

    // Display Stockfish moves
    if (stockfishMoves.length > 0) {
        let html = stockfishMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i + 1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.eval}</span>
            </div>
        `).join('');

        stockfishDiv.innerHTML = html;
    } else {
        // Show more helpful message
        if (!stockfishEngine) {
            stockfishDiv.innerHTML = '<p class="analysis-placeholder">Enjin laai nog...</p>';
        } else {
            stockfishDiv.innerHTML = '<p class="analysis-placeholder">Geen data beskikbaar</p>';
        }
    }

    // Display Lichess moves
    if (lichessMoves.length > 0) {
        lichessDiv.innerHTML = lichessMoves.map((m, i) => `
            <div class="analysis-move-item rank-${i + 1}">
                <span class="analysis-move-san">${m.san}</span>
                <span class="analysis-move-info">${m.games.toLocaleString()} spele (${m.winRate}%)</span>
            </div>
        `).join('');
    } else {
        lichessDiv.innerHTML = '<p class="analysis-placeholder">Geen data</p>';
    }

    // Show how the player's move compares
    if (playedMove) {
        yourMoveSection.style.display = 'block';

        // Check if move is in top Stockfish moves (could be 1 or 2 depending on API)
        const isStockfishBest = stockfishMoves.length > 0 && stockfishMoves.some(m => m.san === playedMove);
        const isLichessTop2 = lichessMoves.length > 0 && lichessMoves.some(m => m.san === playedMove);
        const isStockfishTop2 = isStockfishBest; // Alias for clarity
        const noStockfishData = stockfishMoves.length === 0;
        const noLichessData = lichessMoves.length === 0;

        let moveClass = 'your-move-weak';
        let moveText = '';

        if (isStockfishTop2 && isLichessTop2) {
            moveClass = 'your-move-good';
            moveText = `<strong>${playedMove}</strong> - Uitstekend! Top 2 in beide.`;
        } else if (isStockfishTop2) {
            moveClass = 'your-move-good';
            moveText = `<strong>${playedMove}</strong> - Top enjin skuif!`;
        } else if (isLichessTop2) {
            moveClass = 'your-move-ok';
            moveText = `<strong>${playedMove}</strong> - Gewilde keuse.`;
        } else if (noStockfishData && noLichessData) {
            moveClass = 'your-move-ok';
            moveText = `<strong>${playedMove}</strong> - Geen vergelykingsdata.`;
        } else if (noStockfishData && isLichessTop2) {
            moveClass = 'your-move-ok';
            moveText = `<strong>${playedMove}</strong> - Gewilde keuse.`;
        } else {
            moveClass = 'your-move-weak';
            moveText = `<strong>${playedMove}</strong> - Nie in top 2 nie.`;
        }

        yourMoveInfo.innerHTML = `<span class="${moveClass}">${moveText}</span>`;
    }
}

// Update position evaluation display
async function updatePositionEval() {
    const evalEl = document.getElementById('position-eval');
    evalEl.textContent = '...';
    evalEl.className = 'stat-value';

    try {
        const evalData = await fetchStockfishEval(game.fen());

        if (evalData && evalData.pvs && evalData.pvs[0]) {
            const pv = evalData.pvs[0];
            let evalText = '';
            let evalClass = 'eval-equal';

            if (pv.mate !== undefined) {
                // Mate score
                if (pv.mate > 0) {
                    evalText = `#${pv.mate}`;
                    evalClass = 'eval-winning';
                } else {
                    evalText = `#${pv.mate}`;
                    evalClass = 'eval-losing';
                }
            } else if (pv.cp !== undefined) {
                // Centipawn score
                const pawns = pv.cp / 100;
                evalText = pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);

                if (pawns >= 0.5) {
                    evalClass = 'eval-winning';
                } else if (pawns <= -0.5) {
                    evalClass = 'eval-losing';
                } else {
                    evalClass = 'eval-equal';
                }
            } else {
                evalText = '0.0';
            }

            evalEl.textContent = evalText;
            evalEl.className = `stat-value ${evalClass}`;
        } else {
            evalEl.textContent = '?';
        }
    } catch (error) {
        console.error('Error updating eval:', error);
        evalEl.textContent = '?';
    }
}

// Reset analysis panel for new game
function resetAnalysisPanel() {
    document.getElementById('stockfish-moves').innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    document.getElementById('lichess-moves').innerHTML = '<p class="analysis-placeholder">Speel \'n skuif...</p>';
    document.getElementById('your-move-section').style.display = 'none';
}

// Show automatic best move hints (blue=popularity, red=engine, green=both)
async function showAutoHints() {
    if (gameOver || game.turn() !== 'w') return;

    clearHighlights();

    let popularityMove = null;
    let engineMove = null;

    // Get most popular move from Lichess
    try {
        const lichessData = await fetchLichessData(game.fen());
        if (lichessData && lichessData.moves && lichessData.moves.length > 0) {
            const sortedMoves = lichessData.moves.sort((a, b) => {
                const totalA = a.white + a.draws + a.black;
                const totalB = b.white + b.draws + b.black;
                return totalB - totalA;
            });
            popularityMove = sortedMoves[0].san;
        }
    } catch (error) {
        console.error('Error fetching popularity data for auto-hint:', error);
    }

    // Get best engine move from Stockfish
    try {
        const stockfishData = await fetchStockfishEval(game.fen());
        if (stockfishData && stockfishData.pvs && stockfishData.pvs[0]) {
            const uciMove = stockfishData.pvs[0].moves.split(' ')[0];
            const testGame = new Chess(game.fen());
            const move = testGame.move({
                from: uciMove.slice(0, 2),
                to: uciMove.slice(2, 4),
                promotion: uciMove.length > 4 ? uciMove[4] : undefined
            });
            if (move) {
                engineMove = move.san;
            }
        }
    } catch (error) {
        console.error('Error fetching engine data for auto-hint:', error);
    }

    // Extract target squares from SAN moves
    function getTargetSquare(san) {
        if (!san) return null;
        const match = san.match(/[a-h][1-8]/g);
        if (match && match.length > 0) {
            return match[match.length - 1];
        }
        // Handle castling
        if (san === 'O-O') return 'g1';
        if (san === 'O-O-O') return 'c1';
        return null;
    }

    const popularitySquare = getTargetSquare(popularityMove);
    const engineSquare = getTargetSquare(engineMove);

    // Apply highlights
    if (popularitySquare && engineSquare && popularitySquare === engineSquare) {
        // Both agree - green
        $(`#board .square-${popularitySquare}`).addClass('highlight-both');
    } else {
        // Different moves - blue for popularity, red for engine
        if (popularitySquare) {
            $(`#board .square-${popularitySquare}`).addClass('highlight-popularity');
        }
        if (engineSquare) {
            $(`#board .square-${engineSquare}`).addClass('highlight-engine');
        }
    }
}

function updateDisplay(lastScore) {
    document.getElementById('score').textContent = `${score}/${TARGET_SCORE}`;

    const progress = (score / TARGET_SCORE) * 100;
    document.getElementById('progress-fill').style.width = `${Math.min(progress, 100)}%`;

    const scoreDisplay = document.getElementById('move-score-display');
    const scoreText = document.getElementById('last-move-score');

    if (lastScore !== undefined) {
        scoreDisplay.style.display = 'block';
        scoreDisplay.className = `move-score score-${lastScore}`;

        const scoreLabels = {
            5: "Goeie werk! (+5)",
            4: "Interessant (+4)",
            3: "Dalk nie die beste lyn nie (+3)",
            2: "Gewaagd (+2)",
            1: "Jy is rof! (+1)"
        };
        scoreText.textContent = scoreLabels[lastScore] || `+${lastScore}`;
    }
}

function updateMoveCounter() {
    document.getElementById('move-counter').textContent = `${currentMoveNumber}/${MAX_MOVES}`;
}

function updateBlackPoolInfo() {
    const blackPoolEl = document.getElementById('black-pool');
    if (currentMoveNumber >= 7) {
        blackPoolEl.textContent = 'Beste enjin skuif';
        blackPoolEl.style.color = '#9b59b6';
    } else {
        const poolSize = getBlackPoolSize(currentMoveNumber);
        blackPoolEl.textContent = `Top ${poolSize} skuiwe`;
        blackPoolEl.style.color = '#3498db';
    }
}

function updateScoringMethodInfo() {
    const methodEl = document.getElementById('scoring-method');
    if (methodEl) {
        methodEl.textContent = 'Gekombineerd';
        methodEl.className = 'info-value method-popularity';
    }
}

function updateHistory() {
    const historyDiv = document.getElementById('history-list');
    historyDiv.innerHTML = '';

    moveHistory.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';

        let html = `<span class="move-num">${entry.moveNum}.</span>`;
        html += `<span class="white-move">${entry.white}</span>`;
        html += `<span class="score-badge s${entry.whiteScore}">+${entry.whiteScore}</span>`;

        if (entry.black) {
            html += ` <span class="black-move">${entry.black}</span>`;
        }

        item.innerHTML = html;
        historyDiv.appendChild(item);
    });
}

function showMessage(text, type) {
    const messageEl = document.getElementById('game-message');
    messageEl.textContent = text;

    switch (type) {
        case 'error':
            messageEl.style.color = '#e74c3c';
            break;
        case 'thinking':
            messageEl.style.color = '#3498db';
            break;
        case 'hint':
            messageEl.style.color = '#9b59b6';
            break;
        default:
            messageEl.style.color = '#f39c12';
    }
}

function getEndMessage(score, isNewRecord) {
    const percentage = (score / TARGET_SCORE) * 100;

    if (percentage >= 90) {
        return "Baie goed! Jy ken die Bird redelik goed.";
    } else if (percentage >= 80) {
        return "Lekker gespeel! Jy vorder mooi.";
    } else if (percentage >= 70) {
        return "Nie sleg nie! Hou so aan.";
    } else if (percentage >= 60) {
        return "Goeie poging! Nog 'n bietjie oefening sal help.";
    } else if (percentage >= 50) {
        return "Mooi probeer! Die Bird verg oefening.";
    } else if (percentage >= 40) {
        return "Hou aan oefen! Elke spel help.";
    } else {
        return "Moenie moed verloor nie! Probeer weer.";
    }
}

function endGame() {
    gameOver = true;
    isThinking = false;

    // Clear any hint highlights
    clearHighlights();

    // Show message while waiting
    showMessage("Spel voltooi! Besigtig jou finale posisie...", "info");

    // 5-second delay so player can see Black's final move
    setTimeout(() => {
        showEndGameModal();
    }, 5000);
}

async function showEndGameModal() {
    // Check end-game badges (async for dominant check)
    await checkEndGameBadges();

    const isNewRecord = saveHighScore(score);

    const modal = document.getElementById('game-over-modal');
    const scoreEl = document.getElementById('modal-score');
    const ratingEl = document.getElementById('modal-rating');
    const highscoreMsgEl = document.getElementById('modal-highscore-msg');
    const badgesEarnedDiv = document.getElementById('modal-badges-earned');
    const badgesEarnedList = document.getElementById('badges-earned-list');

    scoreEl.textContent = `${score}/${TARGET_SCORE} punte`;
    ratingEl.textContent = getEndMessage(score, isNewRecord);

    if (isNewRecord) {
        highscoreMsgEl.textContent = "NUWE HOOGSTE PUNT!";
        highscoreMsgEl.style.display = 'block';
    } else {
        highscoreMsgEl.style.display = 'none';
    }

    // Show badges earned this game
    if (badgesEarnedThisGame.length > 0) {
        badgesEarnedDiv.style.display = 'block';
        badgesEarnedList.innerHTML = badgesEarnedThisGame
            .map(id => `<span class="earned-badge">${BADGES[id].icon}</span>`)
            .join('');
    } else {
        badgesEarnedDiv.style.display = 'none';
    }

    modal.classList.add('show');

    showMessage("Spel voltooi! Kyk na jou telling.", "info");
}

function newGame() {
    game = new Chess();
    board.position('start');
    currentMoveNumber = 1;
    score = 0;
    gameOver = false;
    moveHistory = [];
    positionHistory = [game.fen()];
    bestMove = null;
    isThinking = false;
    isReviewMode = false;
    reviewPosition = 0;
    badgesEarnedThisGame = [];
    perfectMovesThisGame = 0;
    clearSelection();

    document.getElementById('score').textContent = '0/50';
    document.getElementById('move-counter').textContent = '1/10';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('history-list').innerHTML = '';
    document.getElementById('move-score-display').style.display = 'none';
    const blackPoolEl = document.getElementById('black-pool');
    blackPoolEl.textContent = 'Top 20 skuiwe';
    blackPoolEl.style.color = '#3498db';

    const methodEl = document.getElementById('scoring-method');
    if (methodEl) {
        methodEl.textContent = 'Gekombineerd';
        methodEl.className = 'info-value method-popularity';
    }

    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('review-panel').style.display = 'none';

    // Reset analysis panel
    resetAnalysisPanel();

    // Reset eval display
    const evalEl = document.getElementById('position-eval');
    evalEl.textContent = '0.0';
    evalEl.className = 'stat-value eval-equal';

    // Show analysis panel, hide review panel
    document.getElementById('analysis-panel').style.display = 'flex';

    // Select new random wisdom for this game
    selectRandomWisdom();

    showMessage("Speel 1. f4 om die Bird Opening te begin!", "info");

    fetchBestMove();
}

// ==================== REVIEW MODE ====================

function enterReviewMode() {
    if (!gameOver) return;

    isReviewMode = true;
    reviewPosition = positionHistory.length - 1;

    document.getElementById('game-over-modal').classList.remove('show');
    document.getElementById('analysis-panel').style.display = 'none';
    document.getElementById('review-panel').style.display = 'flex';

    updateReviewDisplay();
}

function reviewBack() {
    if (reviewPosition > 0) {
        reviewPosition--;
        updateReviewDisplay();
    }
}

function reviewForward() {
    if (reviewPosition < positionHistory.length - 1) {
        reviewPosition++;
        updateReviewDisplay();
    }
}

function exitReviewMode() {
    isReviewMode = false;
    document.getElementById('review-panel').style.display = 'none';
    document.getElementById('analysis-panel').style.display = 'flex';
    board.position(positionHistory[positionHistory.length - 1]);
    showMessage("Spel voltooi! Begin 'n nuwe spel om weer te speel.", "info");
}

async function updateReviewDisplay() {
    const fen = positionHistory[reviewPosition];
    board.position(fen);

    updateReviewPositionLabel();

    document.getElementById('review-back-btn').disabled = (reviewPosition === 0);
    document.getElementById('review-forward-btn').disabled = (reviewPosition === positionHistory.length - 1);

    await showBestMovesForReview(fen);
}

function updateReviewPositionLabel() {
    const posLabel = document.getElementById('review-position');

    if (reviewPosition === 0) {
        posLabel.textContent = 'Beginposisie';
    } else {
        const moveNum = Math.floor((reviewPosition + 1) / 2);
        const isAfterWhite = (reviewPosition % 2 === 1);

        if (isAfterWhite) {
            posLabel.textContent = `Na ${moveNum}. ${moveHistory[moveNum - 1]?.white || '...'}`;
        } else {
            posLabel.textContent = `Na ${moveNum}... ${moveHistory[moveNum - 1]?.black || '...'}`;
        }
    }
}

async function showBestMovesForReview(fen) {
    const bestMovesList = document.getElementById('best-moves-list');
    bestMovesList.innerHTML = '<div class="loading"></div> Laai...';

    let playedMove = null;
    let playerColor = null;

    if (reviewPosition > 0 && reviewPosition < positionHistory.length) {
        const isBeforeWhiteMove = (reviewPosition % 2 === 0);
        const moveIndex = Math.floor(reviewPosition / 2);

        if (isBeforeWhiteMove && moveHistory[moveIndex]) {
            playedMove = moveHistory[moveIndex].white;
            playerColor = 'white';
        } else if (!isBeforeWhiteMove && moveHistory[moveIndex]) {
            playedMove = moveHistory[moveIndex].black;
            playerColor = 'black';
        }
    }

    try {
        const data = await fetchLichessData(fen);

        if (!data || !data.moves || data.moves.length === 0) {
            bestMovesList.innerHTML = '<p style="color: #a0a0a0;">Geen data beskikbaar vir hierdie posisie nie.</p>';
            return;
        }

        const sortedMoves = data.moves.sort((a, b) => {
            const totalA = a.white + a.draws + a.black;
            const totalB = b.white + b.draws + b.black;
            return totalB - totalA;
        });

        const topMoves = sortedMoves.slice(0, 2);

        let html = '';
        topMoves.forEach((move, index) => {
            const games = move.white + move.draws + move.black;
            const winRate = games > 0 ? ((move.white / games) * 100).toFixed(0) : 0;

            const isYourMove = (playedMove === move.san && playerColor === 'white');

            html += `
                <div class="best-move-item rank-${index + 1}">
                    <div>
                        <span class="best-move-san">${move.san}</span>
                        ${isYourMove ? '<span class="your-move-indicator">Jou skuif</span>' : ''}
                    </div>
                    <div class="best-move-stats">
                        ${games.toLocaleString()} speletjies (${winRate}% wit wen)
                    </div>
                </div>
            `;
        });

        if (playedMove && playerColor === 'white' && !topMoves.find(m => m.san === playedMove)) {
            const yourMoveData = sortedMoves.find(m => m.san === playedMove);
            if (yourMoveData) {
                const games = yourMoveData.white + yourMoveData.draws + yourMoveData.black;
                const winRate = games > 0 ? ((yourMoveData.white / games) * 100).toFixed(0) : 0;
                const rank = sortedMoves.findIndex(m => m.san === playedMove) + 1;

                html += `
                    <div class="best-move-item" style="border-left: 3px solid #f39c12; margin-top: 10px;">
                        <div>
                            <span class="best-move-san">${playedMove}</span>
                            <span class="your-move-indicator">Jou skuif (#${rank})</span>
                        </div>
                        <div class="best-move-stats">
                            ${games.toLocaleString()} speletjies (${winRate}% wit wen)
                        </div>
                    </div>
                `;
            }
        }

        bestMovesList.innerHTML = html;

    } catch (error) {
        console.error('Error fetching best moves:', error);
        bestMovesList.innerHTML = '<p style="color: #e74c3c;">Fout met laai van data.</p>';
    }
}

// ==================== INITIALIZATION ====================

// Handle player change
function onPlayerChange() {
    const playerSelect = document.getElementById('player-select');
    currentPlayer = playerSelect.value;

    // Load this player's records
    loadHighScore();
    loadBadges();

    // Start a new game for the new player
    newGame();
}

$(document).ready(function() {
    // Initialize Stockfish.js engine (runs in browser)
    initStockfish();

    // Initialize player from dropdown
    const playerSelect = document.getElementById('player-select');
    currentPlayer = playerSelect.value;

    // Reset all badges if badge system has been updated
    resetAllBadgesIfNeeded();

    initBoard();
    setupTapToMove();
    loadHighScore();
    loadBadges();

    // Setup badge tooltip system
    selectRandomWisdom();
    setupBadgeHovers();

    document.getElementById('new-game-btn').addEventListener('click', newGame);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('modal-new-game').addEventListener('click', newGame);
    document.getElementById('modal-review').addEventListener('click', enterReviewMode);

    document.getElementById('review-back-btn').addEventListener('click', reviewBack);
    document.getElementById('review-forward-btn').addEventListener('click', reviewForward);
    document.getElementById('exit-review-btn').addEventListener('click', exitReviewMode);

    // Player dropdown change handler
    playerSelect.addEventListener('change', onPlayerChange);

    fetchBestMove();

    showMessage("Speel 1. f4 om die Bird Opening te begin!", "info");
});

$(window).resize(function() {
    board.resize();
});
