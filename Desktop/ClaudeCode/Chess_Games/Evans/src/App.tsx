import { useEffect, useRef, useState } from 'react';
import { engine } from './engine/EngineService';
import { UI } from './content/kaptein';
import { RoundController } from './game/controller';
import { applyRound, loadStore, saveStore, stateOfFn, type Store } from './game/storage';
import { chooseRoundTarget } from './game/targets';
import { Kelpwoud } from './ui/Kelpwoud';
import { GameScreen } from './ui/GameScreen';
import { RoundEnd, RoundIntro } from './ui/Screens';
import { pickBackground } from './ui/backgrounds';
import { preloadFaces } from './ui/CaptainFace';
import drukmeter from './assets/drukmeter.webp';

type Screen = 'home' | 'intro' | 'game' | 'end';

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [screen, setScreen] = useState<Screen>('home');
  const [ctl, setCtl] = useState<RoundController | null>(null);
  const [changed, setChanged] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [roundNo, setRoundNo] = useState(0);
  const pendingChanged = useRef<string[]>([]);
  const nextTarget = useRef<string | null>(null);   // chosen while he admires the forest
  const nextBg = useRef<string | null>(null);
  const [roundBg, setRoundBg] = useState<string | null>(null);
  if (import.meta.env.DEV || import.meta.env.VITE_SMOKE) {
    (window as any).__ctl = ctl; // for the smoke test (tools/smoke.mjs)
    (window as any).__engine = engine;
  }

  // While he admires the Kelpwoud, get the next round ready: engine warm, target chosen, images loaded.
  // Then "Begin 'n rondte" opens the brief at once.
  useEffect(() => {
    if (screen !== 'home') return;
    engine.init().catch(() => {}); // an error shows on click, as before
    const s = loadStore();
    nextTarget.current = chooseRoundTarget(Math.random, stateOfFn(s), s.recentTargets);
    nextBg.current = pickBackground();
    for (const src of [drukmeter, nextBg.current]) if (src) new Image().src = src;
    preloadFaces();
  }, [screen]);

  // apply the round to storage once, as soon as it has a result
  useEffect(() => {
    if (!ctl) return;
    let done = false;
    return ctl.onChange(() => {
      if (done || !ctl.result) return;
      done = true;
      const r = ctl.result;
      const s = loadStore();
      pendingChanged.current = applyRound(s, {
        date: new Date().toISOString(), target: ctl.startTarget, conquered: r.conquered,
        gold: r.gold, score: r.score, finalEval: r.finalEval,
      }, [...ctl.chart.targetsThisRound], r.missed);
      setStore(s);
      setTimeout(() => setScreen(sc => (sc === 'game' ? 'end' : sc)), 2500);
    });
  }, [ctl]);

  /** A new round: choose a target (avoiding recent ones and `skip`) and show its brief over the Kelpwoud. */
  const begin = async (skip?: string) => {
    setMsg('');
    try {
      await engine.init();
    } catch {
      setMsg(UI.engineDown);
      return;
    }
    ctl?.dispose();
    const s = loadStore();
    const ready = nextTarget.current && nextTarget.current !== skip ? nextTarget.current : null;
    const target = ready ?? chooseRoundTarget(Math.random, stateOfFn(s), skip ? [...s.recentTargets, skip] : s.recentTargets);
    nextTarget.current = null;
    setRoundBg(nextBg.current ?? pickBackground());
    nextBg.current = null;
    setCtl(new RoundController(target, stateOfFn(s)));
    setScreen('intro');
  };

  // Begin oor: abandon the round (nothing is saved) and start a completely new one, brief and all
  const restart = () => {
    if (!ctl || ctl.result) return;
    const old = ctl.startTarget;
    ctl.dispose();
    engine.cancelAll();
    setRoundNo(n => n + 1);
    void begin(old);
  };

  const home = () => {
    setChanged(pendingChanged.current);
    pendingChanged.current = [];
    ctl?.dispose();
    setCtl(null);
    setScreen('home');
  };

  const toggleLights = () => {
    const s = { ...store, settings: { ...store.settings, bishopLights: !store.settings.bishopLights } };
    saveStore(s);
    setStore(s);
  };

  return (
    <div className="app">
      {(screen === 'home' || screen === 'intro') && (
        <Kelpwoud store={store} changed={screen === 'intro' ? [] : changed} onBegin={() => void begin()} onToggleLights={toggleLights}
          route={screen === 'intro' ? ctl?.startTarget : undefined}
          overlay={screen === 'intro' && ctl ? <RoundIntro target={ctl.startTarget} onGo={() => setScreen('game')} /> : undefined} />
      )}
      {screen === 'game' && ctl && <GameScreen key={roundNo} ctl={ctl} bg={roundBg} lights={store.settings.bishopLights} onEnd={() => setScreen('end')} onRestart={restart} />}
      {screen === 'end' && ctl?.result && <RoundEnd ctl={ctl} onAgain={() => { setChanged([]); pendingChanged.current = []; void begin(); }} onHome={home} />}
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
    </div>
  );
}
