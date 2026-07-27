// Sneeuluiperd se Kruin — Kaart 5: gesintetiseerde klank (§7 Kaart 5).
// Web Audio API, geen eksterne klanklêers nie (soos die suite se konvensie,
// sien Kamp Karpov). Windgeluid, Kapok se blaf, en die mat-klokkie -- almal
// demp-baar, voorkeur oorleef 'n herlaai.
(function (root) {
  'use strict';

  const STIL_SLEUTEL = 'sneeuluiperd_klank_stil';
  let ctx = null;
  let stil = localStorage.getItem(STIL_SLEUTEL) === '1';

  function kryConteks() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stelStil(v) {
    stil = !!v;
    localStorage.setItem(STIL_SLEUTEL, stil ? '1' : '0');
  }
  function isStil() { return stil; }

  function envelopeGain(context, duur, piek) {
    const g = context.createGain();
    g.gain.setValueAtTime(0, context.currentTime);
    g.gain.linearRampToValueAtTime(piek, context.currentTime + duur * 0.15);
    g.gain.linearRampToValueAtTime(0, context.currentTime + duur);
    return g;
  }

  // Sagte windgeluid: gefilterde wit-ruis, ~2.5s, tydens die openingsafkoms.
  function speelWind() {
    if (stil) return;
    const context = kryConteks();
    if (!context) return;
    const duur = 2.5;
    const bufferGrootte = context.sampleRate * duur;
    const buffer = context.createBuffer(1, bufferGrootte, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferGrootte; i++) data[i] = Math.random() * 2 - 1;

    const bron = context.createBufferSource();
    bron.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = envelopeGain(context, duur, 0.06);
    bron.connect(filter).connect(gain).connect(context.destination);
    bron.start();
    bron.stop(context.currentTime + duur);
  }

  // Kapok se een blaf: kort, geskerpte toon met vinnige toonhoogte-val.
  function speelBlaf() {
    if (stil) return;
    const context = kryConteks();
    if (!context) return;
    const osc = context.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, context.currentTime + 0.12);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.15);
  }

  // Mat-klokkie: twee note (kwint), kort vervalomhulsel.
  function speelMatKlok() {
    if (stil) return;
    const context = kryConteks();
    if (!context) return;
    const note = (freq, vertraging) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = context.createGain();
      const t0 = context.currentTime + vertraging;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
      osc.connect(gain).connect(context.destination);
      osc.start(t0);
      osc.stop(t0 + 0.65);
    };
    note(523.25, 0);     // C5
    note(783.99, 0.08);  // G5
  }

  root.Klank = { speelWind, speelBlaf, speelMatKlok, stelStil, isStil };
})(typeof window !== 'undefined' ? window : this);
