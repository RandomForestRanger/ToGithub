// ─── Skaakmat Afrigter — Hooflogika ──────────────────────────────────────────
// Vanilla JS, geen bouproses. Dien via HTTP (nie file://) vir die Worker.
// Plaaslik: python3 -m http.server 8080

'use strict'

// ═══════════════════════════════════════════════════════════════════════════════
// SPELERS
// ═══════════════════════════════════════════════════════════════════════════════

const PLAYERS = ['Besoeker', 'Jacobus', 'Thomas', 'Nasionale Eenheid', 'Coach']
let currentPlayer = localStorage.getItem('skaakmat-current-player') || 'Besoeker'

function storageKey() {
  return 'skaakmat-afrigter-v1-' + currentPlayer.replace(/\s+/g, '-')
}

// ═══════════════════════════════════════════════════════════════════════════════
// WINSBERICHTE & STALEMATE-KONFIGURASIE
// ═══════════════════════════════════════════════════════════════════════════════

const WIN_MESSAGES = [
  'Ramkat! 🔥', 'Bobaas!', 'Mooi gedoen!', 'Goeie werk!',
  'Uitstekend!', 'Uitmuntend!', 'Lekker!', 'Jou bielie!',
  'Raakvatter!', 'Agtermekaar!', 'Wel gedaan!', 'Mooi!'
]

const STALEMATE_EMOJIS = ['🍮', '🫏', '🍕', '🤪', '🙈', '🎪', '🦄', '🐸', '🐧', '🥴', '🫠', '🦆', '🎠', '🍌', '🤡', '🐝', '🧸']

const STALEMATE_MSGS = [
  "Die donkie sit vas en kan nie meer beweeg nie — maar dit is nie mat nie!",
  "Ha! 'n Lekkernyer pizza — maar Swart het nêrens om te gaan. Probeer skaakmat!",
  "Jelly-sonder-vorm! Swart vasgevang maar nie in skaak nie. Pasop vir pat!",
  "Aag nee! Bietjie te ver gegaan. Onthou: pat is nie mat nie!",
  "Swart is lam! Maar dit tel nie as mat nie — probeer nog 'n keer!",
  "🐧 Die pikkewyn het ingeval! Swart staan soos 'n standbeeld — maar geen skaak nie. Dit is pat!",
  "🫠 Oeps... Swart smelt van skrik maar kan steeds nie beweeg nie. Skaakmat was nodig!",
  "🍌 Bananaskil! Jy het uitgegly op die laaste tree. Swart vasgevang maar nie in skaak nie!",
  "🤡 Die sirkus is in die dorp! Almal lag, maar die punt gaan nie na jou nie. Pat!",
  "🦆 Kwak kwak! Swart sit vas soos 'n eend op droë land. Probeer dit met skaakmat!",
  "🧸 So naby en tog so ver... Swart het geen skuiwe nie, maar die beer is nie in skaak nie!",
  "🎠 Die mallemolen stop, maar niemand wen nie. Swart vasgevang sonder skaak — dit is pat!",
  "🐝 Bzzzt! Jy het die koningin omsingel maar vergeet om te steek. Probeer 'n ander pad!",
  "🥴 Swart kyk duiselig rond... geen skuiwe nie, geen skaak nie. Net 'n groot pat-ramp!",
  "🦄 Die towerperd het jou bewering geblokkeer! Swart sit vas — maar dis nie genoeg nie!",
]

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBALE TOESTAND
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  screen:           'badges',
  currentPuzzle:    null,   // { typeId, tier, fenIndex, fen }
  startFen:         null,
  gameResult:       null,   // 'checkmate' | 'stalemate' | 'limit'
  turnsRemaining:   0,
  waitingForBlack:  false,
  blackMoveCount:   0,      // vir Type-5 onakkuraatheidsreël
  hintBlocked:      false,
  newlyEarnedBadge: null,   // { typeId, tier } | null
}

let chessGame      = null   // chess.js instansie (spel)
let gameBoard      = null   // chessboard.js instansie (spel)
let replayBoard    = null   // chessboard.js instansie (herspeel)
let replayCancelToken = { cancelled: false }
let unlockTimer    = null
let selectedSquare = null   // twee-klik stelsel

// ═══════════════════════════════════════════════════════════════════════════════
// VORDERING (localStorage, per speler)
// ═══════════════════════════════════════════════════════════════════════════════

let progress = { earned: {} }

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()))
    if (saved && saved.earned) progress = saved
    else progress = { earned: {} }
  } catch (e) { progress = { earned: {} } }
}

function saveProgress() {
  localStorage.setItem(storageKey(), JSON.stringify(progress))
}

function isEarned(typeId, tier) {
  return !!progress.earned[typeId + '_' + tier]
}

function earnBadge(typeId, tier) {
  const key = typeId + '_' + tier
  if (progress.earned[key]) return false
  progress.earned[key] = true
  saveProgress()
  return true
}

function isTierUnlocked(typeId, tier) {
  if (tier === 'bronze') return true
  const idx = TIER_ORDER.indexOf(tier)
  if (idx <= 0) return false
  return isEarned(typeId, TIER_ORDER[idx - 1])
}

function highestEarnedTier(typeId) {
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (isEarned(typeId, TIER_ORDER[i])) return TIER_ORDER[i]
  }
  return 'none'
}

function buildPool() {
  const pool = []
  for (const typeId of Object.keys(POSITIONS)) {
    const id = Number(typeId)
    for (const tier of TIER_ORDER) {
      const posns = POSITIONS[id][tier]
      if (!posns || !posns.length) continue
      if (!isTierUnlocked(id, tier)) continue
      if (isEarned(id, tier)) continue
      pool.push({ typeId: id, tier })
    }
  }
  return pool
}

function pickPuzzle() {
  const pool = buildPool()
  if (!pool.length) return null
  const { typeId, tier } = pool[Math.floor(Math.random() * pool.length)]
  const posns = POSITIONS[typeId][tier]
  const fenIndex = Math.floor(Math.random() * posns.length)
  const posn = posns[fenIndex]
  return { typeId, tier, fenIndex, fen: posn.fen, moveLimit: posn.moveLimit || null }
}

function progressSummary() {
  const counts = { bronze: 0, silver: 0, gold: 0 }
  for (const key of Object.keys(progress.earned)) {
    if (!progress.earned[key]) continue
    const tier = key.split('_')[1]
    if (counts[tier] !== undefined) counts[tier]++
  }
  counts.total = counts.bronze + counts.silver + counts.gold
  return counts
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCKFISH WERKER
// ═══════════════════════════════════════════════════════════════════════════════

let sfWorker      = null
let sfPending     = null  // { resolve, reject, mode: 'best'|'second' }
let sfInfoLines   = []

function initStockfish() {
  sfWorker = new Worker('stockfish-worker.js')

  sfWorker.onmessage = function (e) {
    const msg = e.data
    if (typeof msg !== 'string') return

    // Collect info lines when we need MultiPV (second-best move for Type 5)
    if (msg.startsWith('info') && sfPending && sfPending.mode === 'second') {
      sfInfoLines.push(msg)
    }

    if (msg.startsWith('bestmove')) {
      const uciMove = msg.split(' ')[1]   // e.g. 'e2e4' or '(none)'
      const pending = sfPending
      sfPending = null

      if (!pending) return

      if (pending.mode === 'second') {
        // Parse 'multipv 2' info line for second-best move
        const line2 = sfInfoLines.find(function (l) { return l.includes('multipv 2') })
        sfInfoLines = []
        const m = line2 ? (line2.match(/ pv (\S+)/) || [])[1] : null
        pending.resolve(m || (uciMove !== '(none)' ? uciMove : null))
      } else {
        sfInfoLines = []
        pending.resolve(uciMove !== '(none)' ? uciMove : null)
      }
    }
  }

  sfWorker.onerror = function (e) {
    console.error('[Stockfish] Worker error:', e)
    if (sfPending) {
      sfPending.reject(e)
      sfPending = null
    }
  }

  sfWorker.postMessage('uci')
  sfWorker.postMessage('isready')
}

function sfRequest(fen, depth, mode) {
  return new Promise(function (resolve, reject) {
    // Cancel any in-flight search
    if (sfPending) {
      sfWorker.postMessage('stop')
      sfPending.reject(new Error('Cancelled'))
    }
    sfInfoLines = []
    sfPending = { resolve: resolve, reject: reject, mode: mode }

    sfWorker.postMessage('setoption name MultiPV value ' + (mode === 'second' ? 2 : 1))
    sfWorker.postMessage('ucinewgame')
    sfWorker.postMessage('position fen ' + fen)
    sfWorker.postMessage('go depth ' + (depth || 20))
  })
}

function getBestMove(fen, depth)       { return sfRequest(fen, depth, 'best')   }
function getSecondBestMove(fen, depth) { return sfRequest(fen, depth, 'second') }

function stopStockfish() {
  if (sfPending) {
    sfWorker.postMessage('stop')
    sfPending.reject(new Error('Cancelled'))
    sfPending = null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKERMBESTUUR
// ═══════════════════════════════════════════════════════════════════════════════

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active')
  })
  document.getElementById('screen-' + name).classList.add('active')
  state.screen = name

  // Refresh sidebars on game/replay screens
  if (name === 'game')   renderSidebarBadges('game-badge-sidebar')
  if (name === 'replay') renderSidebarBadges('replay-badge-sidebar')
}

// ═══════════════════════════════════════════════════════════════════════════════
// KENTEKEN-KAART (Tuis-skerm)
// ═══════════════════════════════════════════════════════════════════════════════

function renderBadgeMap() {
  const grid = document.getElementById('badge-grid')
  grid.innerHTML = ''

  ENDGAME_TYPES.forEach(function (type) {
    const highest  = highestEarnedTier(type.id)
    const hasData  = !!(POSITIONS[type.id])
    const card     = document.createElement('div')

    card.className = 'badge-card'
    if (!hasData) {
      card.classList.add('no-data')
    } else if (highest !== 'none') {
      card.classList.add('tier-' + highest)
      card.classList.add('has-data')
    } else {
      card.classList.add('has-data')
    }

    // Tier pips
    const pipsHtml = TIER_ORDER.map(function (tier) {
      const earned   = isEarned(type.id, tier)
      const unlocked = isTierUnlocked(type.id, tier) && hasData
      let cls = 'pip'
      if (earned)        cls += ' earned-' + tier
      else if (unlocked) cls += ' unlocked'
      return '<span class="' + cls + '" title="' + TIERS[tier].label + '"></span>'
    }).join('')

    const tierLabelHtml = highest !== 'none'
      ? '<span class="tier-label-small ' + highest + '">' + TIERS[highest].label + '</span>'
      : ''

    card.innerHTML =
      '<span class="badge-icon">' + type.icon + '</span>' +
      '<span class="badge-name">' + type.name + '</span>' +
      (hasData ? '' : '<span class="badge-coming-soon">Binnekort</span>') +
      '<div class="tier-pips">' + pipsHtml + tierLabelHtml + '</div>'

    grid.appendChild(card)
  })

  // Update stats
  const s = progressSummary()
  document.getElementById('stat-bronze').textContent = s.bronze
  document.getElementById('stat-silver').textContent = s.silver
  document.getElementById('stat-gold').textContent   = s.gold
  document.getElementById('stat-total').textContent  = s.total + '/63'

  // Play button state
  const pool = buildPool()
  const playBtn = document.getElementById('play-btn')
  playBtn.disabled = pool.length === 0
  playBtn.textContent = pool.length ? '⚡ Speel' : 'Voltooi! 🏆'
}

// Kompakte sybalk-kentekens vir spel- en herspeel-skerms
function renderSidebarBadges(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return
  container.innerHTML = ''

  ENDGAME_TYPES.forEach(function (type) {
    const highest = highestEarnedTier(type.id)
    const hasData = !!(POSITIONS[type.id])

    const item = document.createElement('div')
    item.className = 'sidebar-badge-item'
    if (!hasData) item.classList.add('no-data')
    else {
      item.classList.add('has-data')
      if (highest !== 'none') item.classList.add('tier-' + highest)
    }

    // Highlight the currently active puzzle type
    if (state.currentPuzzle && state.currentPuzzle.typeId === type.id) {
      item.classList.add('active-type')
    }

    const pipsHtml = TIER_ORDER.map(function (tier) {
      const earned   = isEarned(type.id, tier)
      const unlocked = isTierUnlocked(type.id, tier) && hasData
      let cls = 'pip-sm'
      if (earned)        cls += ' earned-' + tier
      else if (unlocked) cls += ' unlocked'
      return '<span class="' + cls + '"></span>'
    }).join('')

    item.innerHTML =
      '<span class="sidebar-icon">' + type.icon + '</span>' +
      '<div class="sidebar-pips">' + pipsHtml + '</div>'
    item.title = type.name

    container.appendChild(item)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TWEE-KLIK STELSEL (soos Bird_Opening)
// ═══════════════════════════════════════════════════════════════════════════════

function clearSelection() {
  selectedSquare = null
  $('.square-55d63').removeClass('highlight-selected highlight-legal-move')
}

function showLegalMoves(square) {
  const moves = chessGame.moves({ square: square, verbose: true })
  moves.forEach(function (m) {
    $('[class*="square-' + m.to + '"]').addClass('highlight-legal-move')
  })
}

function setupTapToMove() {
  $('#board').off('click', '.square-55d63')
  $('#board').on('click', '.square-55d63', function () {
    if (state.waitingForBlack || chessGame.game_over()) return

    // Extract square name from class e.g. 'square-e4'
    const classes = Array.from(this.classList)
    const sqClass = classes.find(function (c) { return /^square-[a-h][1-8]$/.test(c) })
    if (!sqClass) return
    const clickedSq = sqClass.replace('square-', '')

    if (selectedSquare) {
      // Same square clicked — deselect
      if (selectedSquare === clickedSq) { clearSelection(); return }

      // Try the move
      const move = chessGame.move({ from: selectedSquare, to: clickedSq, promotion: 'q' })
      clearSelection()
      if (move) {
        clearArrow('arrow-svg')
        gameBoard.position(chessGame.fen())
        handleAfterWhiteMove()
        return
      }

      // Not a legal move — maybe they clicked another white piece
      const piece = chessGame.get(clickedSq)
      if (piece && piece.color === 'w' && chessGame.turn() === 'w') {
        selectedSquare = clickedSq
        $('[class*="square-' + clickedSq + '"]').addClass('highlight-selected')
        showLegalMoves(clickedSq)
      }
      return
    }

    // Nothing selected — select a white piece
    const piece = chessGame.get(clickedSq)
    if (!piece || piece.color !== 'w' || chessGame.turn() !== 'w') return
    selectedSquare = clickedSq
    $('[class*="square-' + clickedSq + '"]').addClass('highlight-selected')
    showLegalMoves(clickedSq)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEL — INITIALISEER
// ═══════════════════════════════════════════════════════════════════════════════

function startGame(puzzle) {
  state.currentPuzzle   = puzzle
  state.startFen        = puzzle.fen
  state.gameResult      = null
  state.turnsRemaining  = puzzle.moveLimit || TIERS[puzzle.tier].moveLimit
  state.waitingForBlack = false
  state.blackMoveCount  = 0
  state.hintBlocked     = (puzzle.tier === 'gold')

  const typeData   = ENDGAME_TYPES.find(function (t) { return t.id === puzzle.typeId })
  const tierConfig = TIERS[puzzle.tier]

  // Header
  document.getElementById('game-type-name').textContent = typeData ? typeData.name : ''
  document.getElementById('game-type-sub').textContent  = tierConfig.label

  const tierBadge = document.getElementById('game-tier-badge')
  tierBadge.textContent  = tierConfig.label
  tierBadge.className    = 'tier-badge ' + puzzle.tier

  updateTurnsDisplay()
  renderHintControls()

  // Init chess.js
  chessGame = new Chess(puzzle.fen)

  // Destroy previous board if it exists
  if (gameBoard) { gameBoard.destroy(); gameBoard = null }

  gameBoard = Chessboard('board', {
    position:    puzzle.fen,
    orientation: 'white',
    draggable:   false,
    pieceTheme:  'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
  })

  clearSelection()
  setupTapToMove()
  clearArrow('arrow-svg')
  setGameMessage(initialMessage(puzzle.tier))
  showScreen('game')
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEL — NASKUIF-LOGIKA
// ═══════════════════════════════════════════════════════════════════════════════

function getBlackKingSquare() {
  const board = chessGame.board()
  const files = ['a','b','c','d','e','f','g','h']
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f]
      if (p && p.type === 'k' && p.color === 'b') return files[f] + (8 - r)
    }
  }
  return null
}

function isEdgeSquare(sq) {
  if (!sq) return true
  return sq[0] === 'a' || sq[0] === 'h' || sq[1] === '1' || sq[1] === '8'
}

async function handleAfterWhiteMove() {
  // ── Wit het Swart geskaakmat? ─────────────────────────────────────────────
  if (chessGame.in_checkmate()) {
    // Type 21: skaakmat moet op 'n sentrale veld wees (nie op die rand nie)
    if (state.currentPuzzle && state.currentPuzzle.typeId === 21) {
      const sq = getBlackKingSquare()
      if (isEdgeSquare(sq)) {
        setGameMessage('Skaakmat op die rand — maar die doel is om in die MIDDEL mat te gee! 🔲 Probeer weer.')
        await sleep(2000)
        handleGameEnd('edge_checkmate')
        return
      }
    }
    setGameMessage('Skaakmat! Baie goed! 🎉')
    await sleep(800)
    handleCheckmate()
    return
  }

  // ── Pat na Wit se skuif? (onderrigmoment — kind-vriendelik) ───────────────
  if (chessGame.in_stalemate()) {
    const emoji = STALEMATE_EMOJIS[Math.floor(Math.random() * STALEMATE_EMOJIS.length)]
    setGameMessage(emoji + ' Pat! Swart kan nie beweeg nie maar is nie in skaak nie.')
    await sleep(1600)
    handleGameEnd('stalemate')
    return
  }

  // ── Herhaling of ander gelykspel na Wit se skuif? ─────────────────────────
  if (chessGame.in_threefold_repetition()) {
    setGameMessage('Dieselfde posisie drie keer herhaal — dit is gelykspel! 🔄')
    await sleep(1600)
    handleGameEnd('draw_repetition')
    return
  }

  // ── Wag vir Swart ─────────────────────────────────────────────────────────
  state.waitingForBlack = true
  renderHintControls()
  setGameMessage('Swart dink...')

  try {
    // Onakkuraatheidsreël: speel tweede-beste op spesifieke skuiwe
    // Tipe 5 (KNN vs K): elke 5de skuif — swart KAN nie geforseer word nie
    // Tipe 6 goud (KP vs K): elke 5de skuif — voorkom eindelose herhalings
    // Tipe 17 brons (Goeie vs Slegte Loper): skuiwe 5 en 8 — voorkom 3-skuif-herhaling
    state.blackMoveCount++
    const useInaccuracy = (
      (state.currentPuzzle.typeId === 5 ||
       (state.currentPuzzle.typeId === 6 && state.currentPuzzle.tier === 'gold')) &&
      state.blackMoveCount % 5 === 0
    ) || (
      state.currentPuzzle.typeId === 17 && state.currentPuzzle.tier === 'bronze' &&
      (state.blackMoveCount === 5 || state.blackMoveCount === 8)
    )

    const uciMove = useInaccuracy
      ? await getSecondBestMove(chessGame.fen())
      : await getBestMove(chessGame.fen())

    if (!uciMove) throw new Error('Geen skuif van enjin')

    const from = uciMove.slice(0, 2)
    const to   = uciMove.slice(2, 4)
    const prom = uciMove.length === 5 ? uciMove[4] : 'q'

    chessGame.move({ from: from, to: to, promotion: prom })
    gameBoard.position(chessGame.fen())

    // ── Swart het Wit geskaakmat? (speler het swak gespeel) ───────────────
    if (chessGame.in_checkmate()) {
      setGameMessage('Jy is geskaakmat! Swart het gewen. 😬')
      await sleep(1200)
      handleGameEnd('black_checkmate')
      return
    }

    // ── Pat van Wit na Swart se skuif? ────────────────────────────────────
    if (chessGame.in_stalemate()) {
      setGameMessage('Wit is gepateer — dit is gelykspel! Skaakmat was nodig.')
      await sleep(1400)
      handleGameEnd('draw_repetition')
      return
    }

    // ── Herhaling na Swart se skuif? ──────────────────────────────────────
    if (chessGame.in_threefold_repetition()) {
      setGameMessage('Posisie herhaal drie keer — dit is gelykspel! 🔄')
      await sleep(1400)
      handleGameEnd('draw_repetition')
      return
    }

    // ── Volle beurt voltooi ───────────────────────────────────────────────
    state.turnsRemaining--
    updateTurnsDisplay()

    // Silver-wenk blokkeer na 10 beurte
    if (state.currentPuzzle.tier === 'silver' && !state.hintBlocked) {
      const hintLimit = TIERS['silver'].hintMoveLimit
      if ((TIERS['silver'].moveLimit - state.turnsRemaining) >= hintLimit) {
        state.hintBlocked = true
      }
    }

    // ── Beurt-limiet bereik? ──────────────────────────────────────────────
    if (state.turnsRemaining <= 0) {
      setGameMessage("Tyd op — die outjie het weggekom. Wat van nog 'n rondte?")
      await sleep(1200)
      handleGameEnd('limit')
      return
    }

    // ── Heraktiveer Wit ───────────────────────────────────────────────────
    state.waitingForBlack = false
    renderHintControls()

    if (state.turnsRemaining <= 3) {
      setGameMessage('Vinnig! Nog net ' + state.turnsRemaining + (state.turnsRemaining === 1 ? ' skuif' : ' skuiwe') + ' oor!')
    } else {
      setGameMessage('Jou beurt — Wit speel!')
    }

  } catch (err) {
    if (err.message === 'Cancelled' || err.message === 'Stopped') return
    console.error('[handleAfterWhiteMove]', err)
    state.waitingForBlack = false
    renderHintControls()
    setGameMessage('Fout met enjin — probeer weer.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WENK (HINT)
// ═══════════════════════════════════════════════════════════════════════════════

async function showHint() {
  if (state.waitingForBlack || state.hintBlocked) return
  setGameMessage('Soek beste skuif...')

  try {
    const uciMove = await getBestMove(chessGame.fen(), 20)
    if (!uciMove) return
    drawArrow('arrow-svg', uciMove.slice(0, 2), uciMove.slice(2, 4), 'green')
    setGameMessage('Wenk gewys — probeer om dit te verstaan!')
  } catch (err) {
    if (err.message !== 'Cancelled') {
      setGameMessage('Jou beurt — Wit speel!')
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPELUITKOMSTE
// ═══════════════════════════════════════════════════════════════════════════════

function handleCheckmate() {
  const { typeId, tier } = state.currentPuzzle
  const isNew = earnBadge(typeId, tier)
  if (isNew) state.newlyEarnedBadge = { typeId: typeId, tier: tier }
  handleGameEnd('checkmate')
}

function handleGameEnd(resultType) {
  state.gameResult = resultType
  stopStockfish()

  if (resultType === 'checkmate') {
    // Win: skip result screen and replay — go straight to badge unlock or badge map
    if (state.newlyEarnedBadge) {
      showBadgeUnlock(state.newlyEarnedBadge)
    } else {
      renderBadgeMap()
      showScreen('badges')
    }
    return
  }

  // Failures (stalemate, limit, draw, black checkmate): show result then replay for learning
  showResult(resultType)
  setTimeout(function () {
    startReplay(state.startFen)
  }, 2000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UITSLAG-SKERM
// ═══════════════════════════════════════════════════════════════════════════════

function showResult(resultType) {
  let icon, heading, cls, message

  if (resultType === 'checkmate') {
    icon    = '🎉'
    heading = WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
    cls     = 'win'
    message = 'Kyk nou hoe lyk die perfekte spel.'
  } else if (resultType === 'stalemate') {
    icon    = STALEMATE_EMOJIS[Math.floor(Math.random() * STALEMATE_EMOJIS.length)]
    heading = 'Pat!'
    cls     = 'stalemate'
    message = STALEMATE_MSGS[Math.floor(Math.random() * STALEMATE_MSGS.length)]
  } else if (resultType === 'black_checkmate') {
    icon    = '😬'
    heading = 'Oeps!'
    cls     = 'limit'
    message = 'Swart het jou geskaakmat! Dit gebeur — probeer om jou koning te beskerm.'
  } else if (resultType === 'edge_checkmate') {
    icon    = '🔲'
    heading = 'Rand-skaakmat!'
    cls     = 'stalemate'
    message = "Skaakmat, maar op die rand van die bord. Vir die ⭐ Hartjie van die Bord moet die skaakmat op 'n sentrale veld wees. Kyk hoe die perfekte spel lyk!"
  } else if (resultType === 'draw_repetition') {
    icon    = '🔄'
    heading = 'Gelykspel!'
    cls     = 'stalemate'
    message = 'Die posisie het te veel keer herhaal. Probeer om die spel vooruit te beweeg!'
  } else {
    icon    = '⏰'
    heading = 'Tyd op!'
    cls     = 'limit'
    message = "Die outjie het weggekom. Wat van nog 'n rondte?"
  }

  document.getElementById('result-icon').textContent     = icon
  document.getElementById('result-heading').textContent  = heading
  document.getElementById('result-heading').className    = 'result-heading ' + cls
  document.getElementById('result-message').textContent  = message
  showScreen('result')
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERSPEEL
// ═══════════════════════════════════════════════════════════════════════════════

function startReplay(fen) {
  replayCancelToken = { cancelled: false }

  if (replayBoard) { replayBoard.destroy(); replayBoard = null }

  replayBoard = Chessboard('replay-board', {
    position:    fen,
    orientation: 'white',
    draggable:   false,
    pieceTheme:  'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
  })

  clearArrow('replay-arrow-svg')
  document.getElementById('move-list').innerHTML = ''
  document.getElementById('replay-status').textContent = 'Bereken perfekte spel...'
  document.getElementById('replay-buttons').style.display = 'none'
  document.getElementById('replay-skip-controls').style.display = 'flex'

  showScreen('replay')
  runReplay(fen, replayCancelToken)
}

async function runReplay(startFen, token) {
  const chess    = new Chess(startFen)
  const moves    = []
  const MAX_HALF = 80  // veiligheidsgrens
  let halfMoves  = 0

  while (halfMoves < MAX_HALF) {
    if (token.cancelled) return

    let uciMove
    try {
      uciMove = await getBestMove(chess.fen(), 20)
    } catch (err) {
      if (token.cancelled || err.message === 'Cancelled') return
      break
    }

    if (!uciMove || token.cancelled) break

    const from = uciMove.slice(0, 2)
    const to   = uciMove.slice(2, 4)
    const prom = uciMove.length === 5 ? uciMove[4] : 'q'

    let applied
    try {
      applied = chess.move({ from: from, to: to, promotion: prom })
    } catch (e) { break }

    if (!applied) break

    halfMoves++
    moves.push(applied)

    replayBoard.position(chess.fen())

    // Groen = Wit se skuif, blou = Swart se reaksie
    const arrowColour = chess.turn() === 'b' ? 'green' : 'blue'
    drawArrow('replay-arrow-svg', from, to, arrowColour)

    const fullMove = Math.ceil(halfMoves / 2)
    document.getElementById('replay-status').textContent =
      'Skuif ' + fullMove + (halfMoves % 2 === 1 ? '.' : '...')

    renderMoveList(moves)

    if (chess.in_checkmate() || chess.in_stalemate() || chess.game_over()) break

    await sleep(2000)
    if (token.cancelled) return
  }

  if (!token.cancelled) {
    document.getElementById('replay-status').textContent = 'Herspeel voltooi'
    document.getElementById('replay-skip-controls').style.display = 'none'
    document.getElementById('replay-buttons').style.display = 'flex'
  }
}

function renderMoveList(moves) {
  const el = document.getElementById('move-list')
  el.innerHTML = ''
  for (let i = 0; i < moves.length; i += 2) {
    const num   = Math.floor(i / 2) + 1
    const white = moves[i]
    const black = moves[i + 1]
    const span  = document.createElement('span')
    span.innerHTML =
      '<span class="move-num">' + num + '.</span> ' +
      '<span class="white-move">' + white.san + '</span>' +
      (black ? ' <span class="black-move">' + black.san + '</span>' : '')
    el.appendChild(span)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// KENTEKEN ONTSLUIT
// ═══════════════════════════════════════════════════════════════════════════════

function showBadgeUnlock(badge) {
  const typeData = ENDGAME_TYPES.find(function (t) { return t.id === badge.typeId })
  const tier     = badge.tier

  document.getElementById('unlock-type-icon').textContent = typeData ? typeData.icon : '♟'
  document.getElementById('unlock-ring').className        = 'unlock-icon-ring ' + tier
  document.getElementById('unlock-tier-name').textContent = TIERS[tier].label
  document.getElementById('unlock-tier-name').className   = 'unlock-tier ' + tier
  document.getElementById('unlock-type-name').textContent = typeData ? typeData.name : ''
  document.getElementById('unlock-ramkat').className      = 'unlock-ramkat ' + tier

  showScreen('badge-unlock')

  if (unlockTimer) clearTimeout(unlockTimer)
  unlockTimer = setTimeout(finishBadgeUnlock, 4000)
}

function finishBadgeUnlock() {
  if (unlockTimer) { clearTimeout(unlockTimer); unlockTimer = null }
  state.newlyEarnedBadge = null
  renderBadgeMap()
  showScreen('badges')
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG PYLTEKENINGE
// ═══════════════════════════════════════════════════════════════════════════════

function squareCentre(sq) {
  const files = 'abcdefgh'
  const f = files.indexOf(sq[0])         // 0–7
  const r = parseInt(sq[1]) - 1          // 0–7
  return { x: f + 0.5, y: 7 - r + 0.5 }
}

function drawArrow(svgId, from, to, colour) {
  const svg = document.getElementById(svgId)
  if (!svg) return

  Array.from(svg.children).forEach(function (el) {
    if (el.tagName !== 'defs') el.remove()
  })

  const fc  = squareCentre(from)
  const tc  = squareCentre(to)
  const dx  = tc.x - fc.x
  const dy  = tc.y - fc.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.01) return

  const ux = dx / len
  const uy = dy / len

  const sx = fc.x + ux * 0.32
  const sy = fc.y + uy * 0.32
  const ex = tc.x - ux * 0.38
  const ey = tc.y - uy * 0.38

  const markerId = svgId === 'arrow-svg' ? 'ah-' + colour : 'rah-' + colour

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  line.setAttribute('x1', sx)
  line.setAttribute('y1', sy)
  line.setAttribute('x2', ex)
  line.setAttribute('y2', ey)
  line.setAttribute('stroke', colour === 'green' ? 'rgba(46,204,113,0.88)' : 'rgba(52,152,219,0.88)')
  line.setAttribute('stroke-width', '0.18')
  line.setAttribute('stroke-linecap', 'round')
  line.setAttribute('marker-end', 'url(#' + markerId + ')')

  svg.appendChild(line)
}

function clearArrow(svgId) {
  const svg = document.getElementById(svgId)
  if (!svg) return
  Array.from(svg.children).forEach(function (el) {
    if (el.tagName !== 'defs') el.remove()
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function setGameMessage(msg) {
  const el = document.getElementById('game-message')
  if (el) el.textContent = msg
}

function updateTurnsDisplay() {
  const el = document.getElementById('turns-value')
  if (!el) return
  const n = state.turnsRemaining
  el.textContent = n
  el.className = 'turns-value' +
    (n <= 3 ? ' danger' : n <= 6 ? ' warning' : '')
}

function renderHintControls() {
  const container = document.getElementById('hint-controls')
  if (!container) return
  container.innerHTML = ''

  const tier = state.currentPuzzle ? state.currentPuzzle.tier : 'bronze'

  // Wenk-knoppie (nie vir goud-vlak nie)
  if (tier !== 'gold') {
    if (state.hintBlocked) {
      const span = document.createElement('span')
      span.className   = 'hint-blocked'
      span.textContent = 'Jy kan dit doen!'
      container.appendChild(span)
    } else {
      const btn = document.createElement('button')
      btn.className   = 'btn btn-secondary'
      btn.textContent = '💡 Wenk'
      btn.disabled    = state.waitingForBlack
      btn.onclick     = showHint
      container.appendChild(btn)
    }
  }

  // Terug-knoppie — altyd beskikbaar
  const backBtn = document.createElement('button')
  backBtn.className   = 'btn btn-secondary'
  backBtn.textContent = '← Terug'
  backBtn.onclick     = function () {
    stopStockfish()
    clearSelection()
    renderBadgeMap()
    showScreen('badges')
  }
  container.appendChild(backBtn)
}

function initialMessage(tier) {
  if (tier === 'gold')   return "Geen wenke nie — jy's op jou eie. Veel geluk!"
  if (tier === 'silver') return 'Klik op jou stuk, dan op die doelblokkie. Wenke vir die eerste 10 skuiwe.'
  return 'Klik op jou stuk en dan op die doelblokkie — sit Swart in skaakmat!'
}

function sleep(ms) {
  return new Promise(function (res) { setTimeout(res, ms) })
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOPPIE GEBEURE
// ═══════════════════════════════════════════════════════════════════════════════

function bindEvents() {
  // Speler-kieslys
  const playerSelect = document.getElementById('player-select')
  if (playerSelect) {
    playerSelect.value = currentPlayer
    playerSelect.addEventListener('change', function () {
      currentPlayer = playerSelect.value
      localStorage.setItem('skaakmat-current-player', currentPlayer)
      loadProgress()
      renderBadgeMap()
    })
  }

  // Tuis: Speel-knoppie
  document.getElementById('play-btn').addEventListener('click', function () {
    const puzzle = pickPuzzle()
    if (!puzzle) return
    startGame(puzzle)
  })

  // Herspeel: Slaan Oor
  document.getElementById('skip-replay-btn').addEventListener('click', function () {
    replayCancelToken.cancelled = true
    stopStockfish()
    document.getElementById('replay-skip-controls').style.display = 'none'
    document.getElementById('replay-status').textContent = 'Herspeel oorgeslaan'
    document.getElementById('replay-buttons').style.display = 'flex'
  })

  // Herspeel: Terug na die Hoofskerm
  document.getElementById('next-round-btn').addEventListener('click', function () {
    replayCancelToken.cancelled = true
    stopStockfish()
    if (state.newlyEarnedBadge) {
      showBadgeUnlock(state.newlyEarnedBadge)
    } else {
      renderBadgeMap()
      showScreen('badges')
    }
  })

  // Herspeel: Probeer Weer
  document.getElementById('retry-btn').addEventListener('click', function () {
    replayCancelToken.cancelled = true
    stopStockfish()
    startGame(state.currentPuzzle)
  })

  // Kenteken-ontsluit: Terug
  document.getElementById('unlock-done-btn').addEventListener('click', finishBadgeUnlock)
}

// ═══════════════════════════════════════════════════════════════════════════════
// INISIALISEER
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  loadProgress()
  initStockfish()
  renderBadgeMap()
  showScreen('badges')
  bindEvents()
})
