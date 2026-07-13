// ─── ResultScreen ─────────────────────────────────────────────────────────────
// Shown for 2 seconds after a game ends, then App.jsx auto-transitions to Replay.
// The brief is explicit: this is a brief holding screen, not interactive.

const RESULT_CONFIG = {
  checkmate: {
    icon: '🎉',
    heading: 'Skaakmat!',
    message: 'Baie goed! Perfekte spel kom nou...',
    colour: 'text-success',
    bg: 'border-success/30',
  },
  stalemate: {
    icon: '😬',
    heading: 'Pat!',
    // Full Afrikaans message from the brief — this IS the teaching moment
    message: 'Swart het geen wettige skuiwe nie, maar is nie in skaak nie. Ronde verby.',
    colour: 'text-danger',
    bg: 'border-danger/30',
  },
  limit: {
    icon: '⏰',
    heading: 'Tyd op!',
    message: 'Die outjie het weggekom. Wat van nog \'n rondte?',
    colour: 'text-gold',
    bg: 'border-gold/30',
  },
}

export default function ResultScreen({ gameResult }) {
  const cfg = RESULT_CONFIG[gameResult] || RESULT_CONFIG.limit

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className={`glass-panel border-2 ${cfg.bg} max-w-md w-full text-center p-10 animate-slide-up`}>
        <div className="text-6xl mb-4">{cfg.icon}</div>
        <h2 className={`text-3xl font-bold mb-3 ${cfg.colour}`}>{cfg.heading}</h2>
        <p className="text-white/70 text-sm leading-relaxed">{cfg.message}</p>
        <p className="text-white/30 text-xs mt-6 italic">Herspeel laai nou...</p>
      </div>
    </div>
  )
}
