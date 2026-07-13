import { useState, useCallback } from 'react'
import { POSITIONS, TIER_ORDER } from '../data/positions.js'

const STORAGE_KEY = 'skaakmat-afrigter-progress'

// ─── Progress shape ───────────────────────────────────────────────────────────
// {
//   earned: {
//     '1_bronze': true,  // typeId_tier — badge tier earned
//     '1_silver': true,
//     ...
//   }
// }
//
// We deliberately keep progress minimal. We do NOT track which specific FEN
// within a tier was attempted — the brief says earning any single puzzle of a
// tier earns the badge; after that, no more puzzles of that tier are offered.

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { earned: {} }
  } catch {
    return { earned: {} }
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProgress() {
  const [progress, setProgressState] = useState(load)

  const setProgress = useCallback((updater) => {
    setProgressState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  // Mark a badge tier as earned; returns true if this is a newly earned badge
  const earnBadge = useCallback((typeId, tier) => {
    const key = `${typeId}_${tier}`
    if (progress.earned[key]) return false // already earned
    setProgress(prev => ({ ...prev, earned: { ...prev.earned, [key]: true } }))
    return true
  }, [progress, setProgress])

  const isEarned = useCallback((typeId, tier) => {
    return !!progress.earned[`${typeId}_${tier}`]
  }, [progress])

  // Highest earned tier for a given type ('none' | 'bronze' | 'silver' | 'gold')
  const highestTier = useCallback((typeId) => {
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
      if (progress.earned[`${typeId}_${TIER_ORDER[i]}`]) return TIER_ORDER[i]
    }
    return 'none'
  }, [progress])

  // Is a specific tier unlocked (not necessarily earned) for a type?
  // Bronze is always unlocked. Silver needs Bronze earned. Gold needs Silver earned.
  const isTierUnlocked = useCallback((typeId, tier) => {
    if (tier === 'bronze') return true
    const idx = TIER_ORDER.indexOf(tier)
    if (idx <= 0) return false
    return !!progress.earned[`${typeId}_${TIER_ORDER[idx - 1]}`]
  }, [progress])

  // Build the pool of (typeId, tier) pairs available to play:
  // unearned tiers that are unlocked AND have positions defined
  const buildPool = useCallback(() => {
    const pool = []
    for (const [typeIdStr, typePosns] of Object.entries(POSITIONS)) {
      const typeId = Number(typeIdStr)
      for (const tier of TIER_ORDER) {
        if (!typePosns[tier]?.length) continue          // no positions yet
        if (!isTierUnlocked(typeId, tier)) continue      // locked
        if (progress.earned[`${typeId}_${tier}`]) continue // already earned
        pool.push({ typeId, tier })
      }
    }
    return pool
  }, [progress, isTierUnlocked])

  // Pick a random puzzle from the available pool.
  // Returns { typeId, tier, fenIndex, fen } or null if pool is empty.
  const pickPuzzle = useCallback(() => {
    const pool = buildPool()
    if (!pool.length) return null
    const { typeId, tier } = pool[Math.floor(Math.random() * pool.length)]
    const posns = POSITIONS[typeId][tier]
    const fenIndex = Math.floor(Math.random() * posns.length)
    return { typeId, tier, fenIndex, fen: posns[fenIndex].fen }
  }, [buildPool])

  // Summary counts for the badge map header
  const summary = useCallback(() => {
    const counts = { bronze: 0, silver: 0, gold: 0, total: 0 }
    for (const key of Object.keys(progress.earned)) {
      if (!progress.earned[key]) continue
      const tier = key.split('_')[1]
      if (counts[tier] !== undefined) { counts[tier]++; counts.total++ }
    }
    return counts
  }, [progress])

  return { progress, isEarned, highestTier, isTierUnlocked, earnBadge, pickPuzzle, summary }
}
