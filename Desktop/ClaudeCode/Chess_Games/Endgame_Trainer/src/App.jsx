import { useState, useCallback } from 'react'
import { useStockfish } from './hooks/useStockfish.js'
import { useProgress } from './hooks/useProgress.js'
import BadgeMap from './components/BadgeMap.jsx'
import GameScreen from './components/GameScreen.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import ReplayScreen from './components/ReplayScreen.jsx'
import BadgeUnlockScreen from './components/BadgeUnlockScreen.jsx'

// ─── Screens ──────────────────────────────────────────────────────────────────
// badges  → game → result (2s auto) → replay → [badge-unlock →] badges
//                                             ↘ retry → game

export default function App() {
  const stockfish = useStockfish()
  const progressApi = useProgress()

  const [screen, setScreen]                 = useState('badges')
  const [currentPuzzle, setCurrentPuzzle]   = useState(null)
  const [startFen, setStartFen]             = useState(null)
  const [gameResult, setGameResult]         = useState(null) // 'checkmate' | 'stalemate' | 'limit'
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState(null)

  // ── Start a new puzzle ────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const puzzle = progressApi.pickPuzzle()
    if (!puzzle) return // pool empty — all badges earned
    setCurrentPuzzle(puzzle)
    setStartFen(puzzle.fen)
    setGameResult(null)
    setScreen('game')
  }, [progressApi])

  // Retry the SAME puzzle (same FEN) — called from replay screen
  const handleRetry = useCallback(() => {
    setGameResult(null)
    // currentPuzzle and startFen stay unchanged
    setScreen('game')
  }, [])

  // ── Game outcomes ─────────────────────────────────────────────────────────
  const transitionToReplay = useCallback((result) => {
    setGameResult(result)
    setScreen('result')
    setTimeout(() => setScreen('replay'), 2000)
  }, [])

  const handleCheckmate = useCallback(() => {
    // Check whether this earns a new badge
    const { typeId, tier } = currentPuzzle
    const isNew = progressApi.earnBadge(typeId, tier)
    if (isNew) setNewlyEarnedBadge({ typeId, tier })
    transitionToReplay('checkmate')
  }, [currentPuzzle, progressApi, transitionToReplay])

  const handleStalemate = useCallback(() => {
    transitionToReplay('stalemate')
  }, [transitionToReplay])

  const handleLimit = useCallback(() => {
    transitionToReplay('limit')
  }, [transitionToReplay])

  // ── After replay completes ────────────────────────────────────────────────
  const handleNextRound = useCallback(() => {
    if (newlyEarnedBadge) {
      // Show badge celebration before returning to map
      setScreen('badge-unlock')
    } else {
      setScreen('badges')
    }
  }, [newlyEarnedBadge])

  const handleBadgeUnlockDone = useCallback(() => {
    setNewlyEarnedBadge(null)
    setScreen('badges')
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {screen === 'badges' && (
        <BadgeMap progressApi={progressApi} onPlay={handlePlay} />
      )}
      {screen === 'game' && currentPuzzle && (
        <GameScreen
          key={`${currentPuzzle.typeId}-${currentPuzzle.tier}-${currentPuzzle.fenIndex}`}
          puzzle={currentPuzzle}
          stockfish={stockfish}
          onCheckmate={handleCheckmate}
          onStalemate={handleStalemate}
          onLimit={handleLimit}
        />
      )}
      {screen === 'result' && (
        <ResultScreen gameResult={gameResult} />
      )}
      {screen === 'replay' && currentPuzzle && (
        <ReplayScreen
          key={`replay-${currentPuzzle.typeId}-${currentPuzzle.tier}-${currentPuzzle.fenIndex}`}
          puzzle={currentPuzzle}
          startFen={startFen}
          gameResult={gameResult}
          stockfish={stockfish}
          onNextRound={handleNextRound}
          onRetry={handleRetry}
        />
      )}
      {screen === 'badge-unlock' && newlyEarnedBadge && (
        <BadgeUnlockScreen
          badge={newlyEarnedBadge}
          onDone={handleBadgeUnlockDone}
        />
      )}
    </div>
  )
}
