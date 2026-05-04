import React, { useEffect, useState } from 'react';
import ProfileSelect from './components/ProfileSelect.jsx';
import GiacomoIntro from './components/GiacomoIntro.jsx';
import GameScreen from './components/GameScreen.jsx';
import PostGame from './components/PostGame.jsx';
import TrophyRoom from './components/TrophyRoom.jsx';
import { useProfile } from './hooks/useProfile.js';
import { THEMES } from './themes/index.js';
import { logGame } from './data/gameLogger.js';

const FONTS = ['times', 'helvetica', 'comic'];

// Screens: 'profile' | 'intro' | 'game' | 'postgame' | 'trophy'
export default function App() {
  const [screen,     setScreen]     = useState('profile');
  const [gameResult, setGameResult] = useState(null);
  const [theme,      setTheme]      = useState('flame');

  const {
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
  } = useProfile();

  useEffect(() => {
    const themeKeys = Object.keys(THEMES);
    const chosenTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    const chosenFont  = FONTS[Math.floor(Math.random() * FONTS.length)];
    setTheme(chosenTheme);
    document.body.classList.add(`font-${chosenFont}`);
  }, []);

  useEffect(() => {
    document.body.className = document.body.className
      .replace(/theme-\S+/, '')
      .trim();
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  function handleSelectProfile(naam) {
    selectProfile(naam);
    // Show intro only on first visit for this profile
    const profiles = loadAllProfiles();
    const prof = profiles.find(p => p.naam === naam);
    if (!prof?.heeftIntroBekyk) {
      setScreen('intro');
    } else {
      setScreen('game');
    }
  }

  function handleIntroDone() {
    markIntroBekyk();
    setScreen('game');
  }

  function handleGameEnd(result) {
    recordGameResult(result.totalScore, result.e4WasCorrect);
    logGame(result, activeProfile);
    setGameResult(result);
    setScreen('postgame');
  }

  function handlePlayAgain() {
    setGameResult(null);
    setScreen('game');
  }

  function handleGoProfile() {
    setScreen('profile');
  }

  return (
    <div className="app">
      {screen === 'profile' && (
        <ProfileSelect
          profiles={loadAllProfiles()}
          onSelect={handleSelectProfile}
        />
      )}
      {screen === 'intro' && profileData && (
        <GiacomoIntro
          playerName={profileData.naam}
          onDone={handleIntroDone}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          profileData={profileData}
          onGameEnd={handleGameEnd}
          onAddBadges={addBadges}
          onRemoveBadges={removeBadges}
          onExplanationAnswered={incrementUitlegTelling}
        />
      )}
      {screen === 'postgame' && (
        <PostGame
          result={gameResult}
          profile={profileData}
          onPlayAgain={handlePlayAgain}
          onTrophy={() => setScreen('trophy')}
        />
      )}
      {screen === 'trophy' && (
        <TrophyRoom
          allProfiles={loadAllProfiles()}
          onBack={handleGoProfile}
        />
      )}
    </div>
  );
}
