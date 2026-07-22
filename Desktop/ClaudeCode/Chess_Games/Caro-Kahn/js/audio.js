/* Die Caro-Kann in Blokkie-wêreld — procedural sound effects via Web Audio API. No external audio files. */

const KKAudio = (function () {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, startAt, duration, opts) {
    opts = opts || {};
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, startAt);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.slideTo, startAt + duration);
    }
    const peak = opts.gain != null ? opts.gain : 0.15;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  function emerald() {
    const c = getCtx();
    const now = c.currentTime;
    tone(880, now, 0.08, { type: 'triangle', gain: 0.12 });
    tone(1318.5, now + 0.06, 0.12, { type: 'triangle', gain: 0.12 });
  }

  function diamond() {
    const c = getCtx();
    const now = c.currentTime;
    tone(1046.5, now, 0.09, { type: 'sine', gain: 0.14 });
    tone(1318.5, now + 0.08, 0.09, { type: 'sine', gain: 0.14 });
    tone(1568, now + 0.16, 0.22, { type: 'sine', gain: 0.16 });
  }

  function reveal() {
    const c = getCtx();
    const now = c.currentTime;
    tone(220, now, 0.5, { type: 'sawtooth', slideTo: 440, gain: 0.08 });
    tone(330, now + 0.15, 0.5, { type: 'sawtooth', slideTo: 660, gain: 0.06 });
  }

  function penalty() {
    const c = getCtx();
    const now = c.currentTime;
    tone(300, now, 0.25, { type: 'square', slideTo: 120, gain: 0.1 });
  }

  function blunder() {
    const c = getCtx();
    const now = c.currentTime;
    tone(200, now, 0.18, { type: 'sawtooth', gain: 0.14 });
    tone(150, now + 0.14, 0.3, { type: 'sawtooth', slideTo: 80, gain: 0.14 });
  }

  function reject() {
    const c = getCtx();
    const now = c.currentTime;
    tone(180, now, 0.12, { type: 'square', gain: 0.08 });
  }

  function win() {
    const c = getCtx();
    const now = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, now + i * 0.11, 0.2, { type: 'triangle', gain: 0.13 });
    });
  }

  return { emerald, diamond, reveal, penalty, blunder, reject, win, unlock: () => getCtx() };
})();
