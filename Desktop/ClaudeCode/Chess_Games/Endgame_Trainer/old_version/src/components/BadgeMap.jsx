import { ENDGAME_TYPES, POSITIONS } from '../data/positions.js'
import { TIER_ORDER } from '../data/positions.js'

// ─── BadgeMap (Home / Tuis screen) ───────────────────────────────────────────
// 4×5 grid of all 20 endgame types. Shows tier progress per type.
// Only types that have positions defined are playable.

const TIER_COLOURS = {
  none:   { ring: 'border-white/20', bg: 'bg-white/5',  label: '',       text: 'text-white/30' },
  bronze: { ring: 'border-bronze',   bg: 'tier-bronze-bg', label: 'Brons',  text: 'text-bronze' },
  silver: { ring: 'border-silver',   bg: 'tier-silver-bg', label: 'Silwer', text: 'text-silver' },
  gold:   { ring: 'border-badge-gold', bg: 'tier-gold-bg', label: 'Goud',  text: 'text-badge-gold' },
}

export default function BadgeMap({ progressApi, onPlay }) {
  const { highestTier, isTierUnlocked, summary } = progressApi
  const stats = summary()
  const pool = progressApi.buildPool ? progressApi.buildPool() : []
  const hasPlayable = pool.length > 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gold mb-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.4)' }}>
          ♟ Skaakmat Afrigter
        </h1>
        <p className="text-white/50 text-sm">Bemeester die eindspel — een mat op 'n slag</p>
      </header>

      {/* Progress summary */}
      <div className="glass-panel flex flex-wrap gap-6 justify-center items-center px-6 py-3 mb-6">
        <Stat label="Brons" value={stats.bronze} colour="text-bronze" />
        <Stat label="Silwer" value={stats.silver} colour="text-silver" />
        <Stat label="Goud"   value={stats.gold}   colour="text-badge-gold" />
        <Stat label="Totaal" value={`${stats.total}/60`} colour="text-gold" />

        <button
          onClick={onPlay}
          disabled={!hasPlayable}
          className={`ml-auto px-6 py-2 rounded-lg font-bold text-white transition-all duration-200
            ${hasPlayable
              ? 'bg-gradient-to-r from-gold to-gold-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/30 cursor-pointer'
              : 'bg-white/10 opacity-40 cursor-not-allowed'}`}
        >
          {hasPlayable ? '⚡ Speel' : 'Voltooi!'}
        </button>
      </div>

      {/* Badge grid — 4 columns on wide screens, 2 on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ENDGAME_TYPES.map(type => {
          const highest  = highestTier(type.id)
          const hasData  = !!POSITIONS[type.id]
          const unlocked = hasData && isTierUnlocked(type.id, 'bronze')
          const colours  = TIER_COLOURS[highest]

          // Show which tiers are earned/unlocked as pip dots
          const tierPips = TIER_ORDER.map(tier => {
            const earned   = progressApi.isEarned(type.id, tier)
            const unlockd  = isTierUnlocked(type.id, tier) && hasData
            return { tier, earned, unlocked: unlockd }
          })

          return (
            <div
              key={type.id}
              className={`glass-panel border-2 p-3 flex flex-col gap-1 transition-all duration-200
                ${colours.ring}
                ${!hasData ? 'opacity-30' : 'opacity-100'}
                ${highest !== 'none' ? colours.bg : ''}`}
            >
              {/* Icon + type name */}
              <div className="flex items-start gap-2">
                <span className="text-2xl leading-none flex-shrink-0">{type.icon}</span>
                <span className="text-xs font-semibold text-white/80 leading-snug">{type.name}</span>
              </div>

              {/* Tier pips */}
              <div className="flex gap-1 mt-auto pt-1">
                {tierPips.map(({ tier, earned, unlocked: ul }) => (
                  <span
                    key={tier}
                    title={tier.charAt(0).toUpperCase() + tier.slice(1)}
                    className={`w-3 h-3 rounded-full border transition-all
                      ${earned
                        ? tier === 'bronze' ? 'bg-bronze border-bronze'
                          : tier === 'silver' ? 'bg-silver border-silver'
                          : 'bg-badge-gold border-badge-gold'
                        : ul
                          ? 'bg-transparent border-white/30'
                          : 'bg-transparent border-white/10 opacity-30'}`}
                  />
                ))}
                {highest !== 'none' && (
                  <span className={`ml-auto text-xs font-bold ${colours.text}`}>
                    {TIER_COLOURS[highest].label}
                  </span>
                )}
              </div>

              {/* "Binnekort" placeholder for types with no data yet */}
              {!hasData && (
                <span className="text-white/30 text-xs">Binnekort</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value, colour }) {
  return (
    <div className="text-center">
      <div className="text-xs text-white/40 uppercase tracking-widest">{label}</div>
      <div className={`text-xl font-bold ${colour}`}>{value}</div>
    </div>
  )
}
