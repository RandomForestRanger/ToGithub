// ─── Stockfish Worker ─────────────────────────────────────────────────────────
// Laai die enkeldraad Stockfish-enjin via CDN.
// Geen SharedArrayBuffer of COOP/COEP-opskrifte nodig nie.
//
// As die CDN faal (bv. geen internet):
//   1. Laai af: https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js
//   2. Plaas die lêer in dieselfde vouer as hierdie lêer (hernoem na stockfish.js)
//   3. Vervang die importScripts-reël hieronder met: importScripts('./stockfish.js')

importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js')
