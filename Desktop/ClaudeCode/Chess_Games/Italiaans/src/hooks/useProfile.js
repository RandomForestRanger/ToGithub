// Profile management — three fixed players, persisted in localStorage.
//
// Storage key: `profiel_{naam}`  (e.g. profiel_JPB)
// Storage shape:
//   { naam, besteTelling, badges: string[], speleGespeel, e4CorrectStreak }

import { useState, useCallback } from 'react';

export const PROFILES = ['JPB', 'WSTB', 'NasionaleEenheid'];
const KEY = (naam) => `profiel_${naam}`;

function defaultProfile(naam) {
  return { naam, besteTelling: 0, badges: [], speleGespeel: 0, e4CorrectStreak: 0, uitlegtellings: 0, heeftIntroBekyk: false };
}

function loadRaw(naam) {
  try {
    const stored = localStorage.getItem(KEY(naam));
    if (!stored) return defaultProfile(naam);
    return { ...defaultProfile(naam), ...JSON.parse(stored) };
  } catch {
    return defaultProfile(naam);
  }
}

function saveRaw(data) {
  try {
    localStorage.setItem(KEY(data.naam), JSON.stringify(data));
  } catch {
    // localStorage might be blocked in some environments
  }
}

export function useProfile() {
  const [activeProfile, setActiveProfile] = useState(null); // naam string
  const [profileData, setProfileData] = useState(null);     // full profile object

  // Load all three profiles (for ProfileSelect screen)
  const loadAllProfiles = useCallback(() => {
    return PROFILES.map(naam => loadRaw(naam));
  }, []);

  // Activate a profile by name
  const selectProfile = useCallback((naam) => {
    const data = loadRaw(naam);
    setActiveProfile(naam);
    setProfileData(data);
  }, []);

  // Call after a game ends: increment game count, update best score
  const recordGameResult = useCallback((finalScore, e4WasCorrect = false) => {
    setProfileData(prev => {
      if (!prev) return prev;
      const streak = e4WasCorrect ? (prev.e4CorrectStreak || 0) + 1 : 0;
      const updated = {
        ...prev,
        speleGespeel: prev.speleGespeel + 1,
        besteTelling: Math.max(prev.besteTelling, finalScore),
        e4CorrectStreak: streak,
      };
      saveRaw(updated);
      return updated;
    });
  }, []);

  // Add a single badge (no-op if already earned)
  const addBadge = useCallback((badgeId) => {
    setProfileData(prev => {
      if (!prev || prev.badges.includes(badgeId)) return prev;
      const updated = { ...prev, badges: [...prev.badges, badgeId] };
      saveRaw(updated);
      return updated;
    });
  }, []);

  // Add multiple badges at once (for end-of-game batch unlock)
  const addBadges = useCallback((badgeIds) => {
    setProfileData(prev => {
      if (!prev) return prev;
      const newOnes = badgeIds.filter(id => !prev.badges.includes(id));
      if (newOnes.length === 0) return prev;
      const updated = { ...prev, badges: [...prev.badges, ...newOnes] };
      saveRaw(updated);
      return updated;
    });
  }, []);

  // Remove badges (used when player restarts mid-game to forfeit session badges)
  const removeBadges = useCallback((badgeIds) => {
    setProfileData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, badges: prev.badges.filter(id => !badgeIds.includes(id)) };
      saveRaw(updated);
      return updated;
    });
  }, []);

  // Mark intro as seen for this profile
  const markIntroBekyk = useCallback(() => {
    setProfileData(prev => {
      if (!prev || prev.heeftIntroBekyk) return prev;
      const updated = { ...prev, heeftIntroBekyk: true };
      saveRaw(updated);
      return updated;
    });
  }, []);

  // Increment the explanation-answered counter (capped storage — no need to exceed 10)
  const incrementUitlegTelling = useCallback(() => {
    setProfileData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, uitlegtellings: (prev.uitlegtellings || 0) + 1 };
      saveRaw(updated);
      return updated;
    });
  }, []);

  return {
    PROFILES,
    activeProfile,
    profileData,
    loadAllProfiles,
    selectProfile,
    recordGameResult,
    addBadge,
    addBadges,
    removeBadges,
    incrementUitlegTelling,
    markIntroBekyk,
  };
}
