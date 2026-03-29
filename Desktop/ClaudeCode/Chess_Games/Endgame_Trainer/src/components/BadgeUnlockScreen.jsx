import { useEffect, useState } from 'react'
import { ENDGAME_TYPES } from '../data/positions.js'

// ─── BadgeUnlockScreen ────────────────────────────────────────────────────────
// Shown when a badge tier is newly earned. Brief requirement:
//   "Nuwe vlak ontsluit. Ramkat!" — warm, celebratory, then returns to badge map.
//
// Auto-advances to badge map after 4 seconds, or immediately on button click.

const TIER_CONFIG = {
  bronze: {
    label: 'Brons',
    colour: 'text-bronze',
    ring: 'border-bronze',
    bg: 'bg-bronze/20',
    glow: 'shadow-bronze/40',
    star: '🥉',
  },
  silver: {
    label: 'Silwer',
    colour: 'text-silver',
    ring: 'border-silver',
    bg: 'bg-silver/20',
    glow: 'shadow-silver/40',
    star: '🥈',
  },
  gold: {
    label: 'Goud',
    colour: 'text-badge-gold',
    ring: 'border-badge-gold',
    bg: 'bg-badge-gold/20',
    glow: 'shadow-badge-gold/40',
    star: '🥇',
  },
}

export default function BadgeUnlockScreen({ badge, onDone }) {
  const [pulsing, setPulsing] = useState(false)
  const typeData  = ENDGAME_TYPES.find(t => t.id === badge.typeId)
  const tierCfg   = TIER_CONFIG[badge.tier] || TIER_CONFIG.bronze

  // Auto-advance after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [onDone])

  // Trigger pulse animation on mount
  useEffect(() => {
    const t = setTimeout(() => setPulsing(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black/40">
      <div className="text-center max-w-sm w-full animate-slide-up">

        {/* Badge icon with glow ring */}
        <div
          className={`mx-auto mb-6 w-32 h-32 rounded-full border-4 flex items-center justify-center
            ${tierCfg.ring} ${tierCfg.bg}
            shadow-2xl ${tierCfg.glow}
            transition-transform duration-300
            ${pulsing ? 'scale-110' : 'scale-100'}`}
          style={{ boxShadow: `0 0 40px var(--tw-shadow-color)` }}
        >
          <span className="text-5xl">{typeData?.icon ?? '♟'}</span>
        </div>

        {/* Tier star */}
        <div className="text-4xl mb-2">{tierCfg.star}</div>

        {/* "Nuwe vlak ontsluit. Ramkat!" */}
        <p className="text-white/50 text-sm mb-1 uppercase tracking-widest">Nuwe vlak ontsluit</p>
        <h2 className={`text-3xl font-bold mb-1 ${tierCfg.colour}`}>
          {tierCfg.label}!
        </h2>
        <h3 className="text-lg font-semibold text-white/80 mb-1">{typeData?.name}</h3>
        <p className={`text-2xl font-black tracking-widest ${tierCfg.colour} mb-8`}>
          Ramkat! 🔥
        </p>

        <button
          onClick={onDone}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark
            text-white font-bold text-sm hover:-translate-y-0.5 hover:shadow-lg
            hover:shadow-gold/30 transition-all duration-200"
        >
          Terug na Kentekens
        </button>
        <p className="text-white/20 text-xs mt-3">
          (Gaan outomaties in 4 sekondes)
        </p>
      </div>
    </div>
  )
}
