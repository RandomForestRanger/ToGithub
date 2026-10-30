import { useEffect, useRef, useState } from 'react';
import { engine } from './engine/EngineService';
import { UI } from './content/kaptein';
import { RoundController, type Mode } from './game/controller';
import { applyRound, applyToernooi, loadStore, saveStore, stateOfFn, type Store } from './game/storage';
import { chooseRoundTarget } from './game/targets';
import { Kelpwoud } from './ui/Kelpwoud';
import { GameScreen } from './ui/GameScreen';
import { RoundEnd, RoundIntro } from './ui/Screens';
import { pickBackground } from './ui/backgrounds';
import { GhostShip } from './ui/GhostShip';
import { preloadFaces } from './ui/CaptainFace';
import drukmeter from './assets/drukmeter.webp';
import { GHOST_AFTER_ROUNDS } from './config';

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
  const [ghost, setGhost] = useState(false);
  const [record, setRecord] = useState(false);
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
      if (ctl.toernooi) {
        // a toernooi never touches the Kelpwoud: only its own record and history
        setRecord(applyToernooi(s, { date: new Date().toISOString(), score: r.score, bonus: r.bonus, finalEval: r.finalEval, ending: r.ending }));
        setStore(s);
        setTimeout(() => setScreen(sc => (sc === 'game' ? 'end' : sc)), 2500);
        return;
      }
      setRecord(s.best.verkenning === null || r.score > s.best.verkenning);
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

  /** A toernooi game: no target, no brief, straight to the board. */
  const beginToernooi = async () => {
    setMsg('');
    try {
      await engine.init();
    } catch {
      setMsg(UI.engineDown);
      return;
    }
    ctl?.dispose();
    setRoundBg(nextBg.current ?? pickBackground());
    nextBg.current = null;
    setCtl(new RoundController('', stateOfFn(loadStore()), 'toernooi'));
    setRoundNo(n => n + 1);
    setScreen('game');
  };
  const beginMode = (mode: Mode) => void (mode === 'toernooi' ? beginToernooi() : begin());

  // Begin oor: abandon the round (nothing is saved) and start a completely new one, brief and all
  const restart = () => {
    if (!ctl || ctl.result) return;
    const old = ctl.startTarget;
    ctl.dispose();
    engine.cancelAll();
    setRoundNo(n => n + 1);
    void (ctl.toernooi ? beginToernooi() : begin(old));
  };

  const home = () => {
    setChanged(pendingChanged.current);
    pendingChanged.current = [];
    ctl?.dispose();
    setCtl(null);
    setScreen('home');
    // Die Spookskip, once, after his third round (after the colouring has had time to play)
    const s = loadStore();
    if (s.rounds.length >= GHOST_AFTER_ROUNDS && !s.settings.ghostSeen) setTimeout(() => setGhost(true), 4500);
  };

  const closeGhost = () => {
    setGhost(false);
    const s = loadStore();
    if (!s.settings.ghostSeen) { s.settings = { ...s.settings, ghostSeen: true }; saveStore(s); setStore(s); }
  };

  const toggleLights = () => {
    const s = { ...store, settings: { ...store.settings, bishopLights: !store.settings.bishopLights } };
    saveStore(s);
    setStore(s);
  };

  return (
    <div className="app">
      {(screen === 'home' || screen === 'intro') && (
        <Kelpwoud store={store} changed={screen === 'intro' ? [] : changed} onBegin={() => void begin()} onToernooi={() => void beginToernooi()} onToggleLights={toggleLights}
          onGhost={() => setGhost(true)}
          route={screen === 'intro' ? ctl?.startTarget : undefined}
          overlay={screen === 'intro' && ctl ? <RoundIntro target={ctl.startTarget} state={stateOfFn(store)(ctl.startTarget)} onGo={() => setScreen('game')} /> : undefined} />
      )}
      {screen === 'game' && ctl && <GameScreen key={roundNo} ctl={ctl} bg={roundBg} lights={store.settings.bishopLights && !ctl.toernooi} onEnd={() => setScreen('end')} onRestart={restart} />}
      {screen === 'end' && ctl?.result && <RoundEnd ctl={ctl} record={record} best={ctl.toernooi ? store.best.toernooi : store.best.verkenning}
        onAgain={() => { setChanged([]); pendingChanged.current = []; beginMode(ctl.mode); }} onHome={home} />}
      {ghost && screen === 'home' && <GhostShip onClose={closeGhost} />}
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
    </div>
  );
}
