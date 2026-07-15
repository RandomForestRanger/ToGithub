import { useEffect, useRef, useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import { uciToMove } from '../hooks/useStockfish.js'
import { ENDGAME_TYPES, TIERS } from '../data/positions.js'

// ─── GameScreen ───────────────────────────────────────────────────────────────
// White = human player. Black = Stockfish (single-threaded, depth 20).
//
// Inaccuracy rule (Type 5 — Two Knights only):
//   Every 5th black move, Stockfish plays the SECOND-best move instead of the best.
//   This makes the theoretically unwinnable K+2N vs K solvable.
//   Implemented via stockfish.getSecondBestMove(). Not active for any other type.

const BOARD_SIZE = 'min(480px, calc(100vw - 2rem))'

export default function GameScreen({ puzzle, stockfish, onCheckmate, onStalemate, onLimit }) {
  const boardEl   = useRef(null)
  const cgRef     = useRef(null)
  const chessRef  = useRef(null)

  const [turnCount,    setTurnCount]    = useState(0)   // full turns (white+black) completed
  const [statusMsg,    setStatusMsg]    = useState('')
  const [waitingBlack, setWaitingBlack] = useState(false)
  const [hintBlocked,  setHintBlocked]  = useState(false)

  const blackMoveCountRef = useRef(0)  // for Type-5 inaccuracy tracking

  const typeData   = ENDGAME_TYPES.find(t => t.id === puzzle.typeId)
  const tierConfig = TIERS[puzzle.tier]
  const moveLimit  = tierConfig.moveLimit

  const hintsEnabled = puzzle.tier === 'bronze' ||
    (puzzle.tier === 'silver' && !hintBlocked)
  // Gold: no hints at all (hintBlocked is never set for gold — button just absent)

  // ── Legal move destinations for chessground ─────────────────────────────
  function getDests(chess) {
    const dests = new Map()
    for (const m of chess.moves({ verbose: true })) {
      if (!dests.has(m.from)) dests.set(m.from, [])
      dests.get(m.from).push(m.to)
    }
    return dests
  }

  // ── Initialise board ────────────────────────────────────────────────────
  useEffect(() => {
    if (!boardEl.current) return

    const chess = new Chess(puzzle.fen)
    chessRef.current = chess

    const cg = Chessground(boardEl.current, {
      fen: puzzle.fen,
      orientation: 'white',
      turnColor: 'white',
      movable: {
        color: 'white',
        free: false,
        dests: getDests(chess),
        events: { after: handleWhiteMove },
      },
      premovable: { enabled: false },
      draggable: { enabled: true },
      selectable: { enabled: true },
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 150 },
      // Coordinate labels on the board
      coordinates: true,
    })
    cgRef.current = cg

    setStatusMsg(initialMessage(puzzle.tier))

    return () => {
      cg.destroy()
      cgRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── White makes a move ──────────────────────────────────────────────────
  const handleWhiteMove = useCallback(async (orig, dest) => {
    const chess = chessRef.current
    const cg    = cgRef.current
    if (!chess || !cg || waitingBlack) return

    // Clear any hint arrows
    cg.setAutoShapes([])

    // Apply the move to chess.js (chessground already moved the piece visually)
    try {
      // Promotion: for simplicity, always promote to queen.
      // TODO: show a promotion dialog for non-queen choices (relevant for pawn-ending types)
      chess.move({ from: orig, to: dest, promotion: 'q' })
    } catch {
      // Illegal move — revert chessground to previous position
      cg.set({ fen: chess.fen().split(' ')[0] })
      return
    }

    // Check if Black is in checkmate (White just mated Black)
    if (chess.isCheckmate()) {
      cg.set({ movable: { color: 'none' } })
      setStatusMsg('Skaakmat! Baie goed! 🎉')
      setTimeout(onCheckmate, 800)
      return
    }

    // Check if Black is in stalemate — teaching moment!
    if (chess.isStalemate()) {
      cg.set({ movable: { color: 'none' } })
      setStatusMsg('Pat — Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby.')
      setTimeout(onStalemate, 1500)
      return
    }

    // Check if we've hit the move limit (BEFORE playing black's response)
    const completedTurns = turnCount + 1  // white move just made = new turn starting
    if (completedTurns > moveLimit) {
      cg.set({ movable: { color: 'none' } })
      setStatusMsg('Tyd op — die outjie het weggekom. Wat van nog \'n rondte?')
      setTimeout(onLimit, 1200)
      return
    }

    // Disable white input while waiting for Stockfish
    setWaitingBlack(true)
    cg.set({ movable: { color: 'none' } })
    setStatusMsg('Swart dink...')

    // ── Black's response ────────────────────────────────────────────────
    try {
      blackMoveCountRef.current += 1
      const isInaccuracyTurn = puzzle.typeId === 5 && (blackMoveCountRef.current % 5 === 0)
      const uciMove = isInaccuracyTurn
        ? await stockfish.getSecondBestMove(chess.fen())
        : await stockfish.getBestMove(chess.fen())

      if (!uciMove) throw new Error('Stockfish returned no move')

      const moveObj = uciToMove(uciMove)
      chess.move(moveObj)
      cg.move(moveObj.from, moveObj.to)

      // Full turn completed
      const newTurnCount = completedTurns
      setTurnCount(newTurnCount)

      // Check Silver hint block
      if (puzzle.tier === 'silver' && newTurnCount >= (tierConfig.hintMoveLimit ?? 10)) {
        setHintBlocked(true)
      }

      // Check if game is over after black's move
      // (Unlikely in correctly constructed positions, but guard anyway)
      if (chess.isCheckmate()) {
        setStatusMsg('Skaakmat op Wit?! Onmoontlik — kyk na hierdie posisie.')
        cg.set({ movable: { color: 'none' } })
        return
      }

      if (chess.isStalemate()) {
        setStatusMsg('Pat na swart se skuif? Vreemde posisie.')
        cg.set({ movable: { color: 'none' } })
        setTimeout(onStalemate, 1500)
        return
      }

      // Check move limit after black's response
      if (newTurnCount >= moveLimit) {
        cg.set({ movable: { color: 'none' } })
        setStatusMsg('Tyd op — die outjie het weggekom. Wat van nog \'n rondte?')
        setTimeout(onLimit, 1200)
        return
      }

      // Re-enable White
      cg.set({
        turnColor: 'white',
        movable: {
          color: 'white',
          free: false,
          dests: getDests(chess),
          events: { after: handleWhiteMove },
        },
      })
      setStatusMsg(inGameMessage(puzzle.tier, newTurnCount, moveLimit))
      setWaitingBlack(false)

    } catch (err) {
      if (err.message === 'Cancelled' || err.message === 'Stopped') return
      console.error('[GameScreen] Black move error:', err)
      setWaitingBlack(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingBlack, turnCount, puzzle, stockfish, moveLimit, tierConfig.hintMoveLimit,
      onCheckmate, onStalemate, onLimit])

  // ── Hint (Wenk) button ──────────────────────────────────────────────────
  const handleHint = useCallback(async () => {
    const chess = chessRef.current
    const cg    = cgRef.current
    if (!chess || !cg || waitingBlack) return

    try {
      const uciMove = await stockfish.getBestMove(chess.fen(), 20)
      if (!uciMove) return
      const m = uciToMove(uciMove)
      // Green arrow = "best move" hint (matching chessground's built-in arrow brushes)
      cg.setAutoShapes([{ orig: m.from, dest: m.to, brush: 'green' }])
      setStatusMsg('Wenk gewys — probeer om dit te verstaan!')
    } catch (err) {
      if (err.message !== 'Cancelled') console.error('[Hint]', err)
    }
  }, [waitingBlack, stockfish])

  // ── Render ───────────────────────────────────────────────────────────────
  const remaining = moveLimit - turnCount

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center gap-4">
      {/* Top bar */}
      <div className="glass-panel w-full flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider">Eindspel</div>
          <div className="font-bold text-gold text-sm">{typeData?.name}</div>
        </div>
        <TierBadge tier={puzzle.tier} />
        <div className="text-center">
          <div className="text-xs text-white/40 uppercase tracking-wider">Skuiwe oor</div>
          <div className={`text-2xl font-bold font-mono
            ${remaining <= 3 ? 'text-danger' : remaining <= 6 ? 'text-gold' : 'text-white'}`}>
            {remaining}
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        className="board-container glass-panel p-2"
        style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      >
        <div
          ref={boardEl}
          className="cg-container"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Status message */}
      <div className="glass-panel w-full text-center px-4 py-3">
        <p className="text-sm font-medium text-gold/90">{statusMsg}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {/* Hint button — absent for Gold tier */}
        {puzzle.tier !== 'gold' && (
          hintBlocked ? (
            <div className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/40 text-sm font-semibold">
              Jy kan dit doen!
            </div>
          ) : (
            <button
              onClick={handleHint}
              disabled={waitingBlack}
              className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80
                hover:bg-white/20 transition-all duration-200 text-sm font-semibold
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              💡 Wenk
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────

function TierBadge({ tier }) {
  const cfg = {
    bronze: { label: 'Brons',  cls: 'text-bronze  border-bronze' },
    silver: { label: 'Silwer', cls: 'text-silver  border-silver' },
    gold:   { label: 'Goud',   cls: 'text-badge-gold border-badge-gold' },
  }
  const { label, cls } = cfg[tier] || {}
  return (
    <div className={`px-3 py-1 rounded-full border font-bold text-xs ${cls}`}>
      {label}
    </div>
  )
}

// ── Status message helpers ─────────────────────────────────────────────────

function initialMessage(tier) {
  if (tier === 'gold') return 'Geen wenke nie — jy\'s op jou eie. Veel geluk!'
  if (tier === 'silver') return 'Wenke beskikbaar vir die eerste 10 skuiwe.'
  return 'Skuif Wit — sit Swart in skaakmat!'
}

function inGameMessage(tier, turnCount, moveLimit) {
  const remaining = moveLimit - turnCount
  if (remaining <= 2) return `Vinnig! Nog net ${remaining} skuif${remaining === 1 ? '' : 'we'} oor!`
  return 'Jou beurt — Wit speel!'
}
