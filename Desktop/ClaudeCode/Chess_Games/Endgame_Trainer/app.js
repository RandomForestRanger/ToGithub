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

// ─── Wenvoorwaarde-boodskappe (mate | promote | hold) — Opdrag 2, §2 ───────────

const PROMOTION_PIECE_NAMES = { q: 'koningin', n: 'ruiter', b: 'biskop', r: 'kasteel' }

function objectiveLabel(winCondition, holdMoves) {
  if (winCondition === 'promote') return "Doel: Promoveer 'n pion"
  if (winCondition === 'hold')    return 'Doel: Hou die gelykspel — oorleef ' + holdMoves + ' skuiwe'
  return 'Doel: Skaakmat'
}

function promotionWinMessage(promoPiece) {
  if (!promoPiece || promoPiece === 'q') {
    return "Promosie! Die pion word 'n koningin. Baie goed!"
  }
  const name = PROMOTION_PIECE_NAMES[promoPiece] || 'stuk'
  return "Promosie — en boonop 'n " + name + '! Slim gedaan!'
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBALE TOESTAND
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  screen:           'badges',
  currentPuzzle:    null,   // { typeId, tier, fenIndex, fen, moveLimit, winCondition, holdMoves }
  startFen:         null,
  gameResult:       null,   // reason string uit adjudicate(), bv. 'checkmate' | 'stalemate' | 'hold_survived'
  turnsRemaining:   0,
  waitingForBlack:  false,
  hintBlocked:      false,
  newlyEarnedBadge: null,   // { typeId, tier } | null
  lastWhiteMoveSan: null,   // vir hou-modus se "Die vesting het geval ná {move}"-boodskap
  holdBadStreak:    0,      // opeenvolgende swart-skuiwe erger as -800cp (hou-modus vroeë-beoordeling)
  pendingPromoteMoveInfo:     null,   // Opdrag 7 §2: stashed promotion awaiting black's reply-eval verdict
  pendingPromoteContinueMessage: null, // one-time "stryd nog nie verby nie" text for the next "Jou beurt"
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
  // Opdrag 3: 'n vlak sonder aktiewe posisies is onverdienbaar, ongeag
  // vorige-vlak-status — die pip moet nooit "unlocked" wys nie.
  if (activePositions(typeId, tier).length === 0) return false
  // Opdrag 4: 'n tipe waarvan die fase nog gesluit is, is nooit verdienbaar nie.
  if (!isTypeFaseUnlocked(typeId)) return false
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

// Opdrag 3: afgetree posisies (retired:true) bly in positions.js as oudit-spoor
// maar word nooit bedien nie. Elke plek wat oor 'n tipe/vlak se posisies
// itereer om die speler iets te WYS gebruik hierdie helper, nie rou
// POSITIONS[id][tier] nie.
function activePositions(typeId, tier) {
  const posns = POSITIONS[typeId] && POSITIONS[typeId][tier]
  if (!posns) return []
  return posns.filter(function (p) { return !p.retired })
}

// 'n Tipe is "In herbou" as geen vlak enige aktiewe posisie het nie.
function typeIsActive(typeId) {
  return TIER_ORDER.some(function (tier) { return activePositions(typeId, tier).length > 0 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// FASE-POORTE (Opdrag 4) — AFGELEI, NOOIT GESTOOR NIE
// ═══════════════════════════════════════════════════════════════════════════════
// Elke funksie hier lees net van POSITIONS/progress.earned/FASES — geen nuwe
// persistente toestand nie. Dit loop dus outomaties reg ná loadProgress()
// (spelerwissel) sonder enige bykomende koppelkode.

function faseById(faseId) {
  return FASES.find(function (f) { return f.id === faseId })
}

// Slegs tipes in hierdie fase met minstens een aktiewe brons-posisie tel vir
// die poort en die vordering-vlokkie — 'n heeltemal-afgetree tipe (Tipe 5) of
// 'n toekomstige tipe sonder aktiewe brons mag NOOIT vordering blokkeer nie.
function faseGatingTypes(fase) {
  return fase.types.filter(function (typeId) {
    return activePositions(typeId, 'bronze').length > 0
  })
}

function faseBronzeComplete(fase) {
  return faseGatingTypes(fase).every(function (typeId) {
    return isEarned(typeId, 'bronze')
  })
}

// Grandfathering (Opdrag 4 §3): 'n reeds-verdiende kenteken in 'n fase maak
// daardie fase ontsluit, ongeag of die vorige fase se poort formeel behaal is.
function faseHasEarnedBadge(fase) {
  return fase.types.some(function (typeId) {
    return TIER_ORDER.some(function (tier) { return isEarned(typeId, tier) })
  })
}

function isFaseUnlocked(faseId) {
  const fase = faseById(faseId)
  if (!fase) return false
  if (faseId === 1) return true
  if (faseHasEarnedBadge(fase)) return true
  const prevFase = faseById(faseId - 1)
  if (!prevFase) return true
  // Bewustelik NIE rekursief op "is die vorige fase self ontsluit" nie — net
  // op sy volledigheid. 'n Grandfathered speler wat Fase 2 se bronse besit
  // sonder dat Fase 2 se eie poort ooit amptelik behaal is, moet nie
  // vasgevang word deur daardie tegniese onderskeid nie.
  return faseBronzeComplete(prevFase)
}

function isTypeFaseUnlocked(typeId) {
  const fase = FASES.find(function (f) { return f.types.indexOf(typeId) !== -1 })
  if (!fase) return true
  return isFaseUnlocked(fase.id)
}

function buildPool() {
  const pool = []
  for (const typeId of Object.keys(POSITIONS)) {
    // '_dev' ens.: tydelike toets-tipes, nooit deel van die kind-gerigte poel nie.
    if (!/^\d+$/.test(typeId)) continue
    const id = Number(typeId)
    for (const tier of TIER_ORDER) {
      const posns = activePositions(id, tier)
      if (!posns.length) continue
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
  const posns = activePositions(typeId, tier)
  const fenIndex = Math.floor(Math.random() * posns.length)
  const posn = posns[fenIndex]
  const moveLimit = posn.moveLimit || TIERS[tier].moveLimit
  return {
    typeId, tier, fenIndex, fen: posn.fen,
    moveLimit: moveLimit,
    winCondition: posn.winCondition || 'mate',
    holdMoves: posn.holdMoves || moveLimit,
  }
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

// Stockfish plays every black move at full strength, always (Opdrag 2, §3 —
// die onakkuraatheidsreëls is permanent verwyder; geen wobble, geen MultiPV).

let sfWorker      = null
let sfPending     = null  // { resolve, reject, turn: 'w'|'b' } — turn is die kant wat gesoek is
let sfLastScore   = null  // { cp, mate } vanaf die jongste 'info ... score ...'-reël, soekkant se perspektief

function initStockfish() {
  sfWorker = new Worker('stockfish-worker.js')

  sfWorker.onmessage = function (e) {
    const msg = e.data
    if (typeof msg !== 'string') return

    if (msg.startsWith('info') && msg.indexOf(' score ') !== -1) {
      const cpMatch   = msg.match(/ score cp (-?\d+)/)
      const mateMatch = msg.match(/ score mate (-?\d+)/)
      if (mateMatch)      sfLastScore = { cp: null, mate: parseInt(mateMatch[1], 10) }
      else if (cpMatch)   sfLastScore = { cp: parseInt(cpMatch[1], 10), mate: null }
    }

    if (msg.startsWith('bestmove')) {
      const uciMove = msg.split(' ')[1]   // e.g. 'e2e4' or '(none)'
      const pending = sfPending
      const score   = sfLastScore
      sfPending   = null
      sfLastScore = null

      if (!pending) return

      // Normaliseer die telling na Wit se absolute perspektief (projek-konvensie) —
      // UCI gee die telling vanuit die soekkant se oogpunt.
      const sign = pending.turn === 'b' ? -1 : 1
      const evalCp   = score && score.cp   !== null ? score.cp   * sign : null
      const evalMate = score && score.mate !== null ? score.mate * sign : null

      pending.resolve({
        move:     uciMove !== '(none)' ? uciMove : null,
        evalCp:   evalCp,
        evalMate: evalMate,
      })
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

function sfRequest(fen, depth) {
  return new Promise(function (resolve, reject) {
    // Kanselleer enige lopende soektog
    if (sfPending) {
      sfWorker.postMessage('stop')
      sfPending.reject(new Error('Cancelled'))
    }
    sfLastScore = null
    sfPending = { resolve: resolve, reject: reject, turn: fen.split(' ')[1] }

    sfWorker.postMessage('ucinewgame')
    sfWorker.postMessage('position fen ' + fen)
    sfWorker.postMessage('go depth ' + (depth || 20))
  })
}

// Gee { move, evalCp, evalMate } terug — evalCp/evalMate is Swart se
// jongste soektelling, reeds na Wit se absolute perspektief genormaliseer.
function getBestMove(fen, depth) { return sfRequest(fen, depth) }

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

// Opdrag 3: die "63" (en voorheen "60") was hardgekodeer — nou getel oor
// tipes × vlakke wat werklik ten minste een aktiewe posisie het.
function totalEarnableTiers() {
  let n = 0
  ENDGAME_TYPES.forEach(function (type) {
    TIER_ORDER.forEach(function (tier) {
      if (activePositions(type.id, tier).length > 0) n++
    })
  })
  return n
}

// Een kenteken-kaartjie vir 'n tipe — herbruik binne elke fase-afdeling.
function buildTypeBadgeCard(type) {
  const highest  = highestEarnedTier(type.id)
  const exists   = !!(POSITIONS[type.id])
  const isActive = exists && typeIsActive(type.id)
  const card     = document.createElement('div')

  card.className = 'badge-card'
  if (!isActive) {
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
    const unlocked = isTierUnlocked(type.id, tier)
    let cls = 'pip'
    if (earned)        cls += ' earned-' + tier
    else if (unlocked) cls += ' unlocked'
    return '<span class="' + cls + '" title="' + TIERS[tier].label + '"></span>'
  }).join('')

  const tierLabelHtml = highest !== 'none'
    ? '<span class="tier-label-small ' + highest + '">' + TIERS[highest].label + '</span>'
    : ''

  // "Binnekort" — tipe bestaan nog nie glad nie; "In herbou 🔧" — tipe
  // bestaan maar elke posisie is afgetree (Opdrag 3, §1).
  const badgeStatusHtml = isActive ? ''
    : exists ? '<span class="badge-coming-soon">In herbou 🔧</span>'
              : '<span class="badge-coming-soon">Binnekort</span>'

  card.innerHTML =
    '<span class="badge-icon">' + type.icon + '</span>' +
    '<span class="badge-name">' + type.name + '</span>' +
    badgeStatusHtml +
    '<div class="tier-pips">' + pipsHtml + tierLabelHtml + '</div>'

  return card
}

// Opdrag 4: die 4×5-rooster word vier fase-afdelings — elkeen met 'n opskrif
// (fase-nommer, naam, vordering-vlokkie), en 'n slot-wenk as die fase self
// nog gesluit is. Tipes binne 'n gesluite fase bly sigbaar maar vergrys.
function renderBadgeMap() {
  const grid = document.getElementById('badge-grid')
  grid.innerHTML = ''

  FASES.forEach(function (fase) {
    const unlocked    = isFaseUnlocked(fase.id)
    const gatingTypes = faseGatingTypes(fase)
    const earnedCount = gatingTypes.filter(function (t) { return isEarned(t, 'bronze') }).length

    const section = document.createElement('div')
    section.className = 'fase-section' + (unlocked ? '' : ' fase-locked')

    const header = document.createElement('div')
    header.className = 'fase-header'
    header.innerHTML =
      '<span class="fase-title">' +
        '<span class="fase-number">Fase ' + fase.id + '</span>' +
        '<span class="fase-name">' + fase.name + '</span>' +
        (unlocked ? '' : '<span class="fase-lock-icon">🔒</span>') +
      '</span>' +
      '<span class="fase-progress-chip">' + earnedCount + '/' + gatingTypes.length + ' bronse</span>'
    section.appendChild(header)

    if (!unlocked) {
      const hint = document.createElement('div')
      hint.className = 'fase-locked-hint'
      hint.textContent = 'Ontsluit deur al die bronse in Fase ' + (fase.id - 1) + ' te verdien'
      section.appendChild(hint)
    }

    const typesGrid = document.createElement('div')
    typesGrid.className = 'badge-grid-inner'
    fase.types.forEach(function (typeId) {
      const type = ENDGAME_TYPES.find(function (t) { return t.id === typeId })
      if (!type) return
      typesGrid.appendChild(buildTypeBadgeCard(type))
    })
    section.appendChild(typesGrid)

    grid.appendChild(section)
  })

  // Update stats
  const s = progressSummary()
  document.getElementById('stat-bronze').textContent = s.bronze
  document.getElementById('stat-silver').textContent = s.silver
  document.getElementById('stat-gold').textContent   = s.gold
  document.getElementById('stat-total').textContent  = s.total + '/' + totalEarnableTiers()

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
    const highest  = highestEarnedTier(type.id)
    const isActive = !!(POSITIONS[type.id]) && typeIsActive(type.id)

    const item = document.createElement('div')
    item.className = 'sidebar-badge-item'
    if (!isActive) item.classList.add('no-data')
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
      const unlocked = isTierUnlocked(type.id, tier)
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

// Ronde-einde-toets sonder chess.js se in_draw()/game_over() — dié sluit die
// 50-skuif-reël stilweg in, wat hierdie projek permanent afgeskakel hou
// (Opdrag 2, §4). Elke voorwaarde word hier eksplisiet self getoets.
function isRoundOver(game) {
  return game.in_checkmate() || game.in_stalemate() ||
         game.in_threefold_repetition() || game.insufficient_material()
}

function setupTapToMove() {
  $('#board').off('click', '.square-55d63')
  $('#board').on('click', '.square-55d63', function () {
    if (state.waitingForBlack || isRoundOver(chessGame)) return

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
        state.lastWhiteMoveSan = move.san
        handleAfterWhiteMove(move)
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
  const winCondition = puzzle.winCondition || 'mate'
  const moveLimit     = puzzle.moveLimit || TIERS[puzzle.tier].moveLimit
  const holdMoves     = puzzle.holdMoves || moveLimit

  state.currentPuzzle   = puzzle
  state.startFen        = puzzle.fen
  state.gameResult      = null
  // Hou-modus: turnsRemaining tel af tot 0 na holdMoves oorlewe (0 = gewin).
  // Mat/promoveer-modus: turnsRemaining tel af tot 0 na moveLimit (0 = misluk).
  state.turnsRemaining  = winCondition === 'hold' ? holdMoves : moveLimit
  state.waitingForBlack = false
  state.hintBlocked     = (puzzle.tier === 'gold')
  state.lastWhiteMoveSan = null
  state.holdBadStreak   = 0
  state.pendingPromoteMoveInfo = null
  state.pendingPromoteContinueMessage = null

  const typeData   = ENDGAME_TYPES.find(function (t) { return t.id === puzzle.typeId })
  const tierConfig = TIERS[puzzle.tier]

  // Header
  document.getElementById('game-type-name').textContent = typeData ? typeData.name : ''
  document.getElementById('game-type-sub').textContent  = tierConfig.label

  // Sybalk regs: sleutelgedagte (Opdrag 10)
  document.getElementById('sleutelgedagte-text').textContent = typeData ? typeData.sleutelgedagte : ''

  const objectiveEl = document.getElementById('game-objective')
  objectiveEl.textContent = objectiveLabel(winCondition, holdMoves)
  objectiveEl.className   = 'game-objective' + (winCondition !== 'mate' ? ' ' + winCondition : '')

  document.getElementById('turns-label').textContent = winCondition === 'hold' ? 'Oorleef nog' : 'Skuiwe oor'

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
// WENVOORWAARDE-ROETERING (mate | promote | hold) — Opdrag 2
// ═══════════════════════════════════════════════════════════════════════════════

// Bepaal of die rondte klaar is ná 'n gegewe helfte-skuif, en hoe.
//   phase:     'after-white' | 'after-black'
//   moveInfo:  die chess.js-skuifobjek wat pas gespeel is (net 'after-white'; { san, promotion, ... })
//   evalInfo:  { evalCp, evalMate } — Swart se jongste soektelling, Wit se perspektief (net 'after-black')
// Gee terug: null (rondte gaan voort) of
//   { type: 'win'|'fail', reason, message, sleepMs, glowSquare? }
function adjudicate(game, phase, moveInfo, evalInfo) {
  const cond = (state.currentPuzzle && state.currentPuzzle.winCondition) || 'mate'

  if (phase === 'after-white') {
    if (game.in_checkmate()) {
      return { type: 'win', reason: 'checkmate', message: 'Skaakmat! Baie goed! 🎉', sleepMs: 800 }
    }

    // Opdrag 7 §2: promotion is no longer an automatic win. Type 7's races
    // mean BLACK may also queen -- a child one tempo ahead could otherwise
    // be handed a "win" in an objectively drawn or lost position. Stash the
    // promotion and defer the verdict to the after-black check below, which
    // reuses the eval black's own reply search produces anyway (identical
    // no-extra-search principle to hold-mode's adjudication, just for the
    // opposite side of the ledger).
    if (cond === 'promote' && moveInfo && moveInfo.promotion) {
      state.pendingPromoteMoveInfo = moveInfo
      return null
    }

    if (game.in_stalemate()) {
      if (cond === 'hold') {
        return { type: 'win', reason: 'hold_stalemate', message: 'Pat — en dis presies wat jy wou hê! Gelykspel gehou!', sleepMs: 1600 }
      }
      const emoji = STALEMATE_EMOJIS[Math.floor(Math.random() * STALEMATE_EMOJIS.length)]
      return { type: 'fail', reason: 'stalemate', message: emoji + ' Pat! Swart kan nie beweeg nie maar is nie in skaak nie.', sleepMs: 1600 }
    }

    if (game.in_threefold_repetition()) {
      const msg = 'Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer.'
      if (cond === 'hold') {
        return { type: 'win', reason: 'hold_repetition', message: 'Drie keer dieselfde posisie — die gelykspel is verseël!', sleepMs: 1600 }
      }
      return { type: 'fail', reason: 'repetition', message: msg, sleepMs: 1600 }
    }

    return null
  }

  // phase === 'after-black'
  if (game.in_checkmate()) {
    if (cond === 'hold') {
      return { type: 'fail', reason: 'hold_mated', message: 'Skaakmat — die vesting het geval. Kyk in die herspeel waar dit gebeur het.', sleepMs: 1200 }
    }
    return { type: 'fail', reason: 'black_checkmate', message: 'Jy is geskaakmat! Swart het gewen. 😬', sleepMs: 1200 }
  }

  if (game.in_stalemate()) {
    if (cond === 'hold') {
      return { type: 'win', reason: 'hold_stalemate', message: 'Pat — en dis presies wat jy wou hê! Gelykspel gehou!', sleepMs: 1400 }
    }
    return { type: 'fail', reason: 'stalemate', message: 'Wit is gepateer — dit is gelykspel! Skaakmat was nodig.', sleepMs: 1400 }
  }

  if (game.in_threefold_repetition()) {
    if (cond === 'hold') {
      return { type: 'win', reason: 'hold_repetition', message: 'Drie keer dieselfde posisie — die gelykspel is verseël!', sleepMs: 1400 }
    }
    return { type: 'fail', reason: 'repetition', message: 'Dieselfde posisie drie keer herhaal — Swart glip weg! Probeer weer.', sleepMs: 1400 }
  }

  if (cond === 'hold' && game.insufficient_material()) {
    return { type: 'win', reason: 'hold_insufficient', message: 'Te min materiaal om mat te gee — die gelykspel is joune!', sleepMs: 1400 }
  }

  // Opdrag 7 §2: resolve a promotion stashed by the after-white check above.
  // evalInfo here is the eval from black's OWN reply search -- i.e. the
  // position immediately after white's promotion, before black's move was
  // applied, already normalised to White's absolute perspective (see
  // handleAfterWhiteMove: getBestMove searches chessGame.fen() BEFORE
  // pushing black's chosen move). No extra search is spent to get it.
  if (cond === 'promote' && state.pendingPromoteMoveInfo) {
    const promoMoveInfo = state.pendingPromoteMoveInfo
    state.pendingPromoteMoveInfo = null
    const decisive = (evalInfo && evalInfo.evalMate !== null && evalInfo.evalMate > 0) ||
                      (evalInfo && evalInfo.evalCp   !== null && evalInfo.evalCp   >= 300)
    if (decisive) {
      return {
        type: 'win', reason: 'promote',
        message: promotionWinMessage(promoMoveInfo.promotion),
        sleepMs: 900, glowSquare: promoMoveInfo.to,
      }
    }
    // Not decisive: the round continues under the ordinary rules (checkmate
    // still wins above; stalemate/repetition/limit still fail). Show the
    // one-time message on white's next turn rather than here, since the
    // routine "Jou beurt" text would otherwise overwrite it immediately.
    state.pendingPromoteContinueMessage = 'Jou pion het gepromoveer — maar die stryd is nog nie verby nie!'
  }

  // Hou-modus se vroeë beoordeling: die enjin dink klaar oor Swart se skuif —
  // hergebruik daardie telling, geen ekstra soektog nie (Opdrag 2, §2).
  if (cond === 'hold' && evalInfo) {
    const cullpritMove = state.lastWhiteMoveSan || '?'
    const forcedMateAgainstWhite = evalInfo.evalMate !== null && evalInfo.evalMate < 0
    const crushed                = evalInfo.evalCp   !== null && evalInfo.evalCp   < -800

    if (forcedMateAgainstWhite) {
      return {
        type: 'fail', reason: 'hold_adjudicated',
        message: 'Die vesting het geval ná ' + cullpritMove + ' — Swart breek nou deur. Probeer weer!',
        sleepMs: 1400,
      }
    }

    state.holdBadStreak = crushed ? state.holdBadStreak + 1 : 0
    if (state.holdBadStreak >= 2) {
      return {
        type: 'fail', reason: 'hold_adjudicated',
        message: 'Die vesting het geval ná ' + cullpritMove + ' — Swart breek nou deur. Probeer weer!',
        sleepMs: 1400,
      }
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEL — NASKUIF-LOGIKA
// ═══════════════════════════════════════════════════════════════════════════════

async function handleAfterWhiteMove(moveInfo) {
  const afterWhite = adjudicate(chessGame, 'after-white', moveInfo, null)
  if (afterWhite) {
    await finishRound(afterWhite)
    return
  }

  // ── Wag vir Swart ─────────────────────────────────────────────────────────
  state.waitingForBlack = true
  renderHintControls()
  setGameMessage('Swart dink...')

  try {
    const result = await getBestMove(chessGame.fen())
    if (!result || !result.move) throw new Error('Geen skuif van enjin')

    const from = result.move.slice(0, 2)
    const to   = result.move.slice(2, 4)
    const prom = result.move.length === 5 ? result.move[4] : 'q'

    chessGame.move({ from: from, to: to, promotion: prom })
    gameBoard.position(chessGame.fen())

    const afterBlack = adjudicate(chessGame, 'after-black', null, { evalCp: result.evalCp, evalMate: result.evalMate })
    if (afterBlack) {
      await finishRound(afterBlack)
      return
    }

    // ── Volle beurt voltooi ───────────────────────────────────────────────
    state.turnsRemaining--
    updateTurnsDisplay()

    const cond = state.currentPuzzle.winCondition || 'mate'

    // Hou-modus: holdMoves oorleef sonder mat/pat/herhaling — gewin.
    if (cond === 'hold' && state.turnsRemaining <= 0) {
      await finishRound({ type: 'win', reason: 'hold_survived', message: 'Vesting gehou! Die gelykspel is joune. Baie goed!', sleepMs: 900 })
      return
    }

    // Silver-wenk blokkeer na 10 beurte
    if (state.currentPuzzle.tier === 'silver' && !state.hintBlocked) {
      const hintLimit = TIERS['silver'].hintMoveLimit
      if ((TIERS['silver'].moveLimit - state.turnsRemaining) >= hintLimit) {
        state.hintBlocked = true
      }
    }

    // ── Beurt-limiet bereik? (mat/promoveer: mislukking) ──────────────────
    if (cond !== 'hold' && state.turnsRemaining <= 0) {
      await finishRound({ type: 'fail', reason: 'limit', message: "Tyd op — die outjie het weggekom. Wat van nog 'n rondte?", sleepMs: 1200 })
      return
    }

    // ── Heraktiveer Wit ───────────────────────────────────────────────────
    state.waitingForBlack = false
    renderHintControls()

    if (state.pendingPromoteContinueMessage) {
      setGameMessage(state.pendingPromoteContinueMessage)
      state.pendingPromoteContinueMessage = null
    } else if (cond === 'hold') {
      setGameMessage('Jou beurt — hou vas!')
    } else if (state.turnsRemaining <= 3) {
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
    const result = await getBestMove(chessGame.fen(), 20)
    if (!result || !result.move) return
    drawArrow('arrow-svg', result.move.slice(0, 2), result.move.slice(2, 4), 'green')
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

// Enigste plek waar 'n rondte eindig, ongeag wenvoorwaarde — sien adjudicate().
async function finishRound(decision) {
  if (decision.glowSquare) {
    $('[class*="square-' + decision.glowSquare + '"]').addClass('highlight-promote-glow')
  }
  setGameMessage(decision.message)
  await sleep(decision.sleepMs || 1200)

  state.gameResult = decision.reason
  stopStockfish()

  if (decision.type === 'win') {
    const { typeId, tier } = state.currentPuzzle

    // Opdrag 4: neem 'n foto van watter fases reeds ontsluit is VOOR die
    // kenteken verdien word, sodat ons ná die verdiening presies kan sien of
    // 'n nuwe fase juis deur HIERDIE oorwinning oopgegaan het.
    const fasesBefore = FASES.filter(function (f) { return isFaseUnlocked(f.id) }).map(function (f) { return f.id })

    const isNew = earnBadge(typeId, tier)
    state.newlyEarnedBadge = isNew ? { typeId: typeId, tier: tier } : null
    state.newlyUnlockedFase = null

    if (isNew) {
      const fasesAfter = FASES.filter(function (f) { return isFaseUnlocked(f.id) }).map(function (f) { return f.id })
      const justUnlocked = fasesAfter.filter(function (id) { return fasesBefore.indexOf(id) === -1 })
      if (justUnlocked.length) state.newlyUnlockedFase = justUnlocked[0]
    }

    // Opdrag 9 §1: wins now follow the same Uitslag -> Herspeel path as
    // failures (previously skipped both, straight to badge-unlock/-map --
    // flagged as a known issue since Opdrag 2). state.newlyEarnedBadge /
    // newlyUnlockedFase are already set above; the "Volgende Rondte" button's
    // handler (see DOMContentLoaded) already reads them to route to
    // showBadgeUnlock() (which itself chains to showFaseUnlock() via
    // finishBadgeUnlock() when applicable) or back to the badge map -- no
    // duplicate routing logic needed here.
  }

  // Wys uitslag, dan herspeel vir leer (wen sowel as verloor)
  showResult(decision)
  setTimeout(function () {
    startReplay(state.startFen)
  }, 2000)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UITSLAG-SKERM
// ═══════════════════════════════════════════════════════════════════════════════

function showResult(decision) {
  const reason = decision.reason
  let icon, heading, cls, message

  if (reason === 'checkmate') {
    icon    = '🎉'
    heading = 'Skaakmat!'
    cls     = 'win'
    message = decision.message
  } else if (reason === 'promote') {
    icon    = '👑'
    heading = 'Promosie!'
    cls     = 'win'
    message = decision.message
  } else if (reason === 'hold_survived') {
    icon    = '🛡️'
    heading = 'Vesting Gehou!'
    cls     = 'win'
    message = decision.message
  } else if (reason === 'hold_stalemate' || reason === 'hold_repetition' || reason === 'hold_insufficient') {
    icon    = '🤝'
    heading = 'Gelykspel!'
    cls     = 'win'
    message = decision.message
  } else if (reason === 'stalemate') {
    icon    = STALEMATE_EMOJIS[Math.floor(Math.random() * STALEMATE_EMOJIS.length)]
    heading = 'Pat!'
    cls     = 'stalemate'
    message = STALEMATE_MSGS[Math.floor(Math.random() * STALEMATE_MSGS.length)]
  } else if (reason === 'black_checkmate') {
    icon    = '😬'
    heading = 'Oeps!'
    cls     = 'limit'
    message = 'Swart het jou geskaakmat! Dit gebeur — probeer om jou koning te beskerm.'
  } else if (reason === 'repetition') {
    icon    = '🔄'
    heading = 'Gelykspel!'
    cls     = 'stalemate'
    message = decision.message
  } else if (reason === 'limit') {
    icon    = '⏰'
    heading = 'Tyd op!'
    cls     = 'limit'
    message = "Die outjie het weggekom. Wat van nog 'n rondte?"
  } else if (reason === 'hold_mated') {
    icon    = '🏚️'
    heading = 'Die vesting het geval!'
    cls     = 'limit'
    message = decision.message
  } else if (reason === 'hold_adjudicated') {
    icon    = '💥'
    heading = 'Die vesting het geval!'
    cls     = 'limit'
    message = decision.message
  } else {
    icon    = '⏰'
    heading = 'Rondte verby'
    cls     = 'limit'
    message = decision.message
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

  const cond = state.currentPuzzle ? (state.currentPuzzle.winCondition || 'mate') : 'mate'
  document.getElementById('replay-label').textContent =
    cond === 'promote' ? 'Sterk omskakeling vanaf hierdie posisie' :
    cond === 'hold'    ? 'Sterk verdediging vanaf hierdie posisie' :
    'Sterk spel vanaf hierdie posisie'

  clearArrow('replay-arrow-svg')
  document.getElementById('move-list').innerHTML = ''
  document.getElementById('replay-status').textContent = 'Bereken perfekte spel...'
  document.getElementById('replay-buttons').style.display = 'none'
  document.getElementById('replay-skip-controls').style.display = 'flex'

  showScreen('replay')
  runReplay(fen, replayCancelToken, cond)
}

async function runReplay(startFen, token, winCondition) {
  const cond      = winCondition || 'mate'
  const chess     = new Chess(startFen)
  const moves     = []
  const holdMoves = state.currentPuzzle ? (state.currentPuzzle.holdMoves || state.currentPuzzle.moveLimit) : 12
  const MAX_HALF  = cond === 'hold' ? holdMoves * 2 : 80  // veiligheidsgrens
  let halfMoves   = 0

  while (halfMoves < MAX_HALF) {
    if (token.cancelled) return

    let result
    try {
      result = await getBestMove(chess.fen(), 20)
    } catch (err) {
      if (token.cancelled || err.message === 'Cancelled') return
      break
    }

    if (!result || !result.move || token.cancelled) break

    const from = result.move.slice(0, 2)
    const to   = result.move.slice(2, 4)
    const prom = result.move.length === 5 ? result.move[4] : 'q'

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

    // Promoveer-modus: stop net ná die bevorderingskuif + een oomblik van viering.
    if (cond === 'promote' && applied.promotion) {
      await sleep(1200)
      break
    }

    // Hou-modus: 'n herhaling hier is die punt van die oefening — trots, nie apologeties nie.
    if (cond === 'hold' && chess.in_threefold_repetition()) {
      document.getElementById('replay-status').textContent = 'Gelykspel deur herhaling — die vesting hou!'
      await sleep(1000)
      break
    }

    if (isRoundOver(chess)) break

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

  // Opdrag 4: 'n fase-ontsluiting (indien enige) volg NÁ die kenteken-skerm,
  // nooit gelyktydig nie — die twee skerms mag nooit om die beurt veg nie.
  if (state.newlyUnlockedFase) {
    const faseId = state.newlyUnlockedFase
    state.newlyUnlockedFase = null
    showFaseUnlock(faseId)
    return
  }

  renderBadgeMap()
  showScreen('badges')
}

// ═══════════════════════════════════════════════════════════════════════════════
// FASE ONTSLUIT (Opdrag 4)
// ═══════════════════════════════════════════════════════════════════════════════

function showFaseUnlock(faseId) {
  const fase = faseById(faseId)
  if (!fase) { renderBadgeMap(); showScreen('badges'); return }

  document.getElementById('fase-unlock-name').textContent = fase.name

  const iconsHtml = fase.types.map(function (typeId) {
    const type = ENDGAME_TYPES.find(function (t) { return t.id === typeId })
    return '<span class="fase-unlock-icon">' + (type ? type.icon : '♟') + '</span>'
  }).join('')
  document.getElementById('fase-unlock-icons').innerHTML = iconsHtml

  showScreen('fase-unlock')

  if (unlockTimer) clearTimeout(unlockTimer)
  unlockTimer = setTimeout(finishFaseUnlock, 4000)
}

function finishFaseUnlock() {
  if (unlockTimer) { clearTimeout(unlockTimer); unlockTimer = null }
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
  const cond = state.currentPuzzle ? (state.currentPuzzle.winCondition || 'mate') : 'mate'

  if (cond === 'hold') {
    // Hou-modus tel OP na holdMoves toe (bereik dit = gewin) — geen "gevaar"-kleure nie.
    const holdMoves = state.currentPuzzle.holdMoves || state.currentPuzzle.moveLimit
    const survived   = holdMoves - state.turnsRemaining
    el.textContent = survived
    el.className   = 'turns-value'
    return
  }

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

  // Fase-ontsluit: Terug (Opdrag 4)
  document.getElementById('fase-unlock-done-btn').addEventListener('click', finishFaseUnlock)
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
