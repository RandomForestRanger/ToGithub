import { useEffect, useRef, useCallback } from 'react'

// ─── useStockfish ─────────────────────────────────────────────────────────────
// Manages a single-threaded Stockfish Web Worker.
//
// Design notes:
//   • Single-threaded stockfish.js (public/stockfish.js, copied from node_modules
//     by vite.config.js) — no SharedArrayBuffer, no COOP/COEP headers required.
//   • Alternative: multithreaded stockfish.wasm — faster at large depth, but
//     requires Cross-Origin-Opener-Policy + Cross-Origin-Embedder-Policy headers
//     on every response, which needs explicit Netlify config and complicates local dev.
//   • getBestMove(fen, depth) returns a Promise<string | null> where the string is
//     a UCI move in long-algebraic format ("e2e4", "e7e8q" for promotion, etc.).
//   • getSecondBestMove(fen, depth) uses MultiPV=2 to retrieve the second-best move.
//     This is used for the Type-5 (Two Knights) inaccuracy rule — every 5th black
//     move Stockfish intentionally plays sub-optimally.

export function useStockfish() {
  const workerRef  = useRef(null)
  const pendingRef = useRef(null) // { resolve, reject, mode: 'best' | 'second' }
  const infoLines  = useRef([])   // collects multipv info lines for second-best parsing

  useEffect(() => {
    // public/stockfish.js is the single-threaded build, served as a plain script
    const worker = new Worker('/stockfish.js')
    workerRef.current = worker

    worker.onmessage = ({ data: msg }) => {
      if (typeof msg !== 'string') return

      // Collect info lines when we need MultiPV (second-best move)
      if (msg.startsWith('info') && pendingRef.current?.mode === 'second') {
        infoLines.current.push(msg)
      }

      if (msg.startsWith('bestmove')) {
        const uciMove = msg.split(' ')[1] // "e2e4" or "(none)"
        const pending = pendingRef.current
        pendingRef.current = null

        if (!pending) return

        if (pending.mode === 'second') {
          // Parse multipv 2 line from collected info lines
          const secondLine = infoLines.current.find(l => l.includes('multipv 2'))
          infoLines.current = []
          const secondMove = secondLine
            ? (secondLine.match(/ pv (\S+)/) || [])[1] ?? null
            : null
          // Fall back to best move if no second exists (e.g., only one legal move)
          pending.resolve(secondMove || (uciMove !== '(none)' ? uciMove : null))
        } else {
          pending.resolve(uciMove !== '(none)' ? uciMove : null)
        }
      }
    }

    worker.onerror = (e) => {
      console.error('[Stockfish] Worker error:', e)
      if (pendingRef.current) {
        pendingRef.current.reject(e)
        pendingRef.current = null
      }
    }

    // Initialise UCI
    worker.postMessage('uci')
    worker.postMessage('isready')

    return () => {
      worker.postMessage('quit')
      worker.terminate()
    }
  }, [])

  // Cancel any in-flight search, then request a new one
  const _request = useCallback((fen, depth, mode) => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) return reject(new Error('Stockfish worker not ready'))

      // Cancel previous search
      if (pendingRef.current) {
        worker.postMessage('stop')
        pendingRef.current.reject(new Error('Cancelled'))
      }

      infoLines.current = []
      pendingRef.current = { resolve, reject, mode }

      if (mode === 'second') {
        worker.postMessage('setoption name MultiPV value 2')
      } else {
        worker.postMessage('setoption name MultiPV value 1')
      }

      worker.postMessage('ucinewgame')
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go depth ${depth}`)
    })
  }, [])

  const getBestMove       = useCallback((fen, depth = 20) => _request(fen, depth, 'best'),   [_request])
  const getSecondBestMove = useCallback((fen, depth = 20) => _request(fen, depth, 'second'), [_request])

  const stop = useCallback(() => {
    if (pendingRef.current) {
      workerRef.current?.postMessage('stop')
      pendingRef.current.reject(new Error('Stopped'))
      pendingRef.current = null
    }
  }, [])

  return { getBestMove, getSecondBestMove, stop }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Convert a UCI long-algebraic move string to chess.js move object
export function uciToMove(uciMove) {
  if (!uciMove || uciMove.length < 4) return null
  return {
    from: uciMove.slice(0, 2),
    to:   uciMove.slice(2, 4),
    // Promotion piece (e.g. 'q') only present for 5-char moves like "e7e8q"
    promotion: uciMove.length === 5 ? uciMove[4] : undefined,
  }
}
