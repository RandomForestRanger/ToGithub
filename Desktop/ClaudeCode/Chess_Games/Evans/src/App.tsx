import { useEffect, useRef, useState } from 'react';
import { engine } from './engine/EngineService';
import { UI } from './content/kaptein';
import { RoundController } from './game/controller';
import { applyRound, loadStore, saveStore, stateOfFn, type Store } from './game/storage';
import { chooseRoundTarget } from './game/targets';
import { Kelpwoud } from './ui/Kelpwoud';
import { GameScreen } from './ui/GameScreen';
import { RoundEnd, RoundIntro } from './ui/Screens';

type Screen = 'home' | 'intro' | 'game' | 'end';

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [screen, setScreen] = useState<Screen>('home');
  const [ctl, setCtl] = useState<RoundController | null>(null);
  const [changed, setChanged] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const pendingChanged = useRef<string[]>([]);
  (window as any).__ctl = ctl; // for the smoke test (tools/smoke.mjs)
  (window as any).__engine = engine;

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

  const begin = async () => {
    setMsg('');
    try {
      await engine.init();
    } catch {
      setMsg(UI.engineDown);
      return;
    }
    ctl?.dispose();
    const s = loadStore();
    const target = chooseRoundTarget(Math.random, stateOfFn(s), s.recentTargets);
    setCtl(new RoundController(target, stateOfFn(s)));
    setScreen('intro');
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
      {screen === 'home' && <Kelpwoud store={store} changed={changed} onBegin={begin} onToggleLights={toggleLights} />}
      {screen === 'intro' && ctl && <RoundIntro target={ctl.startTarget} onGo={() => setScreen('game')} />}
      {screen === 'game' && ctl && <GameScreen ctl={ctl} lights={store.settings.bishopLights} onEnd={() => setScreen('end')} />}
      {screen === 'end' && ctl?.result && <RoundEnd ctl={ctl} onAgain={() => { setChanged([]); pendingChanged.current = []; void begin(); }} onHome={home} />}
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
    </div>
  );
}
