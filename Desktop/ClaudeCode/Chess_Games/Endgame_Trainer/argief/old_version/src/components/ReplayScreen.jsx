import { useEffect, useRef, useState, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import { uciToMove } from '../hooks/useStockfish.js'
import { ENDGAME_TYPES } from '../data/positions.js'

// ─── ReplayScreen ─────────────────────────────────────────────────────────────
// After every round (win, loss, stalemate), show the perfect game from the
// starting position. Stockfish plays BOTH sides at depth 20.
// Each half-move has a 2-second delay. Arrow highlights the moving piece.

const BOARD_SIZE   = 'min(480px, calc(100vw - 2rem))'
const MOVE_DELAY_MS = 2000
const MAX_REPLAY_HALF_MOVES = 80  // safety — prevents infinite loops

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default function ReplayScreen({ puzzle, startFen, gameResult, stockfish, onNextRound, onRetry }) {
  const boardEl   = useRef(null)
  const cgRef     = useRef(null)
  const cancelled = useRef(false)

  const [moveNum,   setMoveNum]   = useState(0)
  const [phase,     setPhase]     = useState('playing') // 'playing' | 'done'
  const [moveList,  setMoveList]  = useState([])

  const typeData = ENDGAME_TYPES.find(t => t.id === puzzle.typeId)

  // ── Initialise board and run replay ───────────────────────────────────
  useEffect(() => {
    if (!boardEl.current) return

    cancelled.current = false

    const chess = new Chess(startFen)

    const cg = Chessground(boardEl.current, {
      fen: startFen,
      orientation: 'white',
      movable: { color: 'none' }, // viewer-only; no human input during replay
      draggable: { enabled: false },
      selectable: { enabled: false },
      highlight: { lastMove: true, check: true },
      animation: { enabled: true, duration: 200 },
      coordinates: true,
    })
    cgRef.current = cg

    // Kick off the async replay loop
    runReplay(chess, cg)

    return () => {
      cancelled.current = true
      cg.destroy()
      cgRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runReplay = useCallback(async (chess, cg) => {
    const moves = []
    let halfMoves = 0

    while (halfMoves < MAX_REPLAY_HALF_MOVES) {
      if (cancelled.current) return

      // Ask Stockfish for the best move for whoever's turn it is
      let uciMove
      try {
        uciMove = await stockfish.getBestMove(chess.fen(), 20)
      } catch {
        if (cancelled.current) return
        break
      }

      if (!uciMove || cancelled.current) break

      const moveObj = uciToMove(uciMove)

      // Apply to chess.js
      let applied
      try {
        applied = chess.move(moveObj)
      } catch {
        break // illegal move returned by engine — shouldn't happen
      }

      if (!applied) break

      // Animate on board
      cg.move(moveObj.from, moveObj.to)

      // Show arrow for this move
      cg.setAutoShapes([{
        orig: moveObj.from,
        dest: moveObj.to,
        brush: chess.turn() === 'w' ? 'blue' : 'green',
        // After the move, chess.turn() has already flipped:
        // 'w' means Black just moved; 'b' means White just moved.
        // Green arrow = White's perfect move; Blue = Black's response.
        // Note: brushes are chessground built-ins (green, blue, red, yellow).
      }])

      halfMoves++
      moves.push(applied.san)
      setMoveNum(halfMoves)
      setMoveList([...moves])

      // Check for game-over
      if (chess.isCheckmate() || chess.isStalemate() || chess.isGameOver()) {
        break
      }

      // 2-second pause between moves (brief requirement)
      await sleep(MOVE_DELAY_MS)
      if (cancelled.current) return
    }

    if (!cancelled.current) setPhase('done')
  }, [stockfish])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center gap-4">
      {/* Label */}
      <div className="glass-panel w-full text-center py-2 px-4">
        <p className="text-gold/90 text-sm font-semibold italic">
          Perfekte spel vanaf hierdie posisie
        </p>
        {typeData && (
          <p className="text-white/40 text-xs mt-0.5">{typeData.name}</p>
        )}
      </div>

      {/* Board */}
      <div
        className="glass-panel p-2"
        style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      >
        <div
          ref={boardEl}
          className="cg-container"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Status bar */}
      <div className="glass-panel w-full flex items-center justify-between px-4 py-2 text-sm">
        <span className="text-white/50">
          {phase === 'playing'
            ? `Skuif ${Math.ceil(moveNum / 2)}${moveNum % 2 === 1 ? '.' : '...'}`
            : 'Herspeel voltooi'}
        </span>
        {phase === 'playing' && (
          <span className="text-white/30 text-xs animate-pulse">⏳ Speel...</span>
        )}
      </div>

      {/* Move list — scrollable */}
      {moveList.length > 0 && (
        <div className="glass-panel w-full px-4 py-3 max-h-28 overflow-y-auto">
          <MovePairs moves={moveList} />
        </div>
      )}

      {/* Post-replay buttons */}
      {phase === 'done' && (
        <div className="flex gap-3 mt-2 animate-slide-up">
          <button
            onClick={onNextRound}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-gold to-gold-dark
              text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg
              hover:shadow-gold/30 transition-all duration-200"
          >
            Volgende Rondte →
          </button>
          <button
            onClick={onRetry}
            className="px-6 py-2 rounded-lg bg-white/10 border border-white/20
              text-white/80 font-bold text-sm hover:bg-white/20 transition-all duration-200"
          >
            ↺ Probeer Weer
          </button>
        </div>
      )}
    </div>
  )
}

// Render moves as paired "1. e4 e5 2. ..." notation
function MovePairs({ moves }) {
  const pairs = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] })
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-white/60">
      {pairs.map(({ num, white, black }) => (
        <span key={num}>
          <span className="text-white/30">{num}.</span>
          <span className="text-white ml-1">{white}</span>
          {black && <span className="text-white/50 ml-1">{black}</span>}
        </span>
      ))}
    </div>
  )
}
