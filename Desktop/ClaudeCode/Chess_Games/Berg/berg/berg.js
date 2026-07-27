// Sneeuluiperd se Kruin — Kaart 4: die berg as koppelvlak (§4).
// Kamera-enjin (viewBox-interpolasie) + roetemerker/bewoner-posisionering.
// Selfstandige module -- nog NIE in kruin.html geïntegreer nie (met die
// gebruiker ooreengekom). Diere is eenvoudige plekhouer-silhoeëtte; vervang
// later net die binnekant van elke <g id="bewoner-N">-groep.
(function (root) {
  'use strict';

  const N_RUNGS = 30;
  const MILESTONE_RUNGS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  const ZONE_OF = (n) => (n <= 6 ? 'moeras' : n <= 14 ? 'woud' : n <= 22 ? 'rotse' : 'sneeu');

  // Eenvoudige plekhouer-silhoeëtte per bewoner: 'n kleur + 'n kort letter-
  // etiket (vervang later met werklike SVG-illustrasie, sien Kaart 4-verslag).
  const BEWONER_INFO = {
    3: { naam: 'Akkedis', kleur: '#7a9c5c', letter: 'Ak' },
    6: { naam: 'Aksolotl', kleur: '#e8a0c0', letter: 'Ax' },
    9: { naam: 'Papegaai', kleur: '#3fa34d', letter: 'Pa' },
    12: { naam: 'Apie', kleur: '#8a5a3c', letter: 'Ap' },
    15: { naam: 'Klipdassie', kleur: '#a08060', letter: 'Kd' },
    18: { naam: 'Ibeks', kleur: '#c9a876', letter: 'Ib' },
    21: { naam: 'Bergkraai', kleur: '#3a3a3a', letter: 'Bk' },
    24: { naam: 'Sneeuhaas', kleur: '#f0f0f0', letter: 'Sh' },
    27: { naam: 'Lammergier', kleur: '#8a7060', letter: 'Lg' },
    30: { naam: 'Sneeuluiperd', kleur: '#dfe6ea', letter: 'Sl' },
  };

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function createEngine() {
    let svg = null, routePath = null, routeLen = 0;
    const markerPos = {}; // n -> {x,y}
    let reducedMotionOverride = null;

    function isReducedMotion() {
      if (reducedMotionOverride !== null) return reducedMotionOverride;
      return typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function setViewBox(box) {
      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
    }
    function getViewBox() {
      const parts = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }

    // Vaste-grootte kamera-venster gesentreer op 'n merker se posisie.
    const VENSTER_W = 340, VENSTER_H = 260;
    function viewBoxForMarker(n) {
      const p = markerPos[n];
      return { x: p.x - VENSTER_W / 2, y: p.y - VENSTER_H / 2, w: VENSTER_W, h: VENSTER_H };
    }
    // Kruin-venster: styf op die kruin geraam (opening van elke sessie).
    function kruinView() {
      const p = markerPos[N_RUNGS];
      return { x: p.x - 120, y: p.y - 260, w: 240, h: 200 };
    }

    function animateViewBox(fromBox, toBox, durationMs, opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        if (isReducedMotion()) {
          // §3.4: kinematika word 'n stil oorvloei (vinnige wegvaag/terugvaag,
          // geen paneer-beweging nie).
          svg.style.transition = 'opacity 150ms ease';
          svg.style.opacity = '0';
          setTimeout(() => {
            setViewBox(toBox);
            svg.style.opacity = '1';
            setTimeout(resolve, 160);
          }, 160);
          return;
        }
        let skip = false;
        const skipHandler = () => { skip = true; };
        if (opts.skippable) svg.addEventListener('pointerdown', skipHandler, { once: true });
        const t0 = performance.now();
        function frame(now) {
          let raw = Math.min(1, (now - t0) / durationMs);
          if (skip) raw = 1;
          const eased = easeInOutCubic(raw);
          setViewBox({
            x: fromBox.x + (toBox.x - fromBox.x) * eased,
            y: fromBox.y + (toBox.y - fromBox.y) * eased,
            w: fromBox.w + (toBox.w - fromBox.w) * eased,
            h: fromBox.h + (toBox.h - fromBox.h) * eased,
          });
          if (opts.onFrame) opts.onFrame(eased);
          if (raw < 1) requestAnimationFrame(frame);
          else {
            if (opts.skippable) svg.removeEventListener('pointerdown', skipHandler);
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    function setKlimmerPos(x, y) {
      document.getElementById('klimmer').setAttribute('transform', `translate(${x},${y})`);
    }
    function animateKlimmerTo(nFrom, nTo, durationMs) {
      const a = markerPos[nFrom], b = markerPos[nTo];
      return new Promise((resolve) => {
        if (isReducedMotion()) { setKlimmerPos(b.x, b.y); resolve(); return; }
        const t0 = performance.now();
        function frame(now) {
          const raw = Math.min(1, (now - t0) / durationMs);
          const eased = easeInOutCubic(raw);
          setKlimmerPos(a.x + (b.x - a.x) * eased, a.y + (b.y - a.y) * eased);
          if (raw < 1) requestAnimationFrame(frame); else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    function bewonerEl(n) { return document.getElementById('bewoner-' + n); }
    function isBewonerZigbaar(n) {
      const el = bewonerEl(n);
      return !!el && el.getAttribute('visibility') !== 'hidden';
    }
    function stelBewonerZigbaarheid(n, zigbaar) {
      const el = bewonerEl(n);
      if (el) el.setAttribute('visibility', zigbaar ? 'visible' : 'hidden');
    }

    function init(svgEl, opts) {
      opts = opts || {};
      svg = svgEl;
      routePath = svg.querySelector('#roete');
      routeLen = routePath.getTotalLength();

      const merkersGroup = svg.querySelector('#merkers');
      merkersGroup.innerHTML = '';
      for (let n = 1; n <= N_RUNGS; n++) {
        const t = n / (N_RUNGS + 1); // marge aan albei kante (voet/kruin)
        const pt = routePath.getPointAtLength(t * routeLen);
        markerPos[n] = { x: pt.x, y: pt.y };
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'merker-' + n);
        g.setAttribute('transform', `translate(${pt.x},${pt.y})`);
        g.setAttribute('data-sone', ZONE_OF(n));
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', MILESTONE_RUNGS.includes(n) ? 9 : 6);
        c.setAttribute('fill', '#f4c542');
        c.setAttribute('stroke', '#1a1a2e');
        c.setAttribute('stroke-width', '2');
        g.appendChild(c);
        merkersGroup.appendChild(g);
      }

      const bewonersGroup = svg.querySelector('#bewoners');
      bewonersGroup.innerHTML = '';
      for (const n of MILESTONE_RUNGS) {
        const info = BEWONER_INFO[n];
        const p = markerPos[n];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'bewoner-' + n);
        g.setAttribute('transform', `translate(${p.x + 26},${p.y - 26})`);
        g.setAttribute('visibility', 'hidden');
        g.setAttribute('data-naam', info.naam);
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', 16);
        c.setAttribute('fill', info.kleur);
        c.setAttribute('stroke', '#1a1a2e');
        c.setAttribute('stroke-width', '2.5');
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dy', '4');
        t.setAttribute('font-size', '11');
        t.setAttribute('font-family', 'Segoe UI, sans-serif');
        t.setAttribute('fill', '#1a1a2e');
        t.textContent = info.letter;
        g.appendChild(c); g.appendChild(t);
        bewonersGroup.appendChild(g);
      }

      const beginRung = opts.beginRung || 1;
      setViewBox(viewBoxForMarker(beginRung));
      setKlimmerPos(markerPos[beginRung].x, markerPos[beginRung].y);
      for (const n of MILESTONE_RUNGS) if (n <= beginRung) stelBewonerZigbaarheid(n, true);
    }

    // §4.2: openingsafkoms. 3-4s, oorslaanbaar met een tik, land presies by
    // die huidige merker. Reeds-ontslote bewoners is deurgaans sigbaar.
    function openingsAfkoms(rung, ontsloteBewoners) {
      const ontslote = ontsloteBewoners || MILESTONE_RUNGS.filter((n) => n <= rung);
      for (const n of MILESTONE_RUNGS) stelBewonerZigbaarheid(n, ontslote.includes(n));
      setViewBox(kruinView());
      setKlimmerPos(markerPos[rung].x, markerPos[rung].y);
      return animateViewBox(kruinView(), viewBoxForMarker(rung), 3500, { skippable: true });
    }

    // §4.2: klim (slaag) -- kamera + klimmer een merker op, ~1.5s.
    function klim(vanRung, naRung) {
      return Promise.all([
        animateViewBox(viewBoxForMarker(vanRung), viewBoxForMarker(naRung), 1500),
        animateKlimmerTo(vanRung, naRung, 1500),
      ]);
    }

    // §4.2: daal (misluk) -- een rustige tree af, geen tuimel nie.
    function daal(vanRung, naRung) {
      return Promise.all([
        animateViewBox(viewBoxForMarker(vanRung), viewBoxForMarker(naRung), 2200),
        animateKlimmerTo(vanRung, naRung, 2200),
      ]);
    }

    // §4.2: bewoner-onthulling -- pan nader, vervaag die dier in, hou, pan terug. ~10s.
    function bewonerOnthulling(rung) {
      if (!MILESTONE_RUNGS.includes(rung)) return Promise.resolve();
      const huidige = viewBoxForMarker(rung);
      const p = markerPos[rung];
      const nabyBewoner = { x: p.x - 40, y: p.y - 100, w: 220, h: 170 };
      const el = bewonerEl(rung);
      return animateViewBox(huidige, nabyBewoner, 3000)
        .then(() => {
          el.style.transition = 'opacity 800ms ease';
          el.style.opacity = '0';
          el.setAttribute('visibility', 'visible');
          requestAnimationFrame(() => { el.style.opacity = '1'; });
          return new Promise((r) => setTimeout(r, 3500)); // seremonie-pouse
        })
        .then(() => animateViewBox(nabyBewoner, huidige, 3000));
    }

    return {
      N_RUNGS, MILESTONE_RUNGS, BEWONER_INFO,
      init, openingsAfkoms, klim, daal, bewonerOnthulling,
      viewBoxForMarker, kruinView, getViewBox, getMarkerPos: (n) => markerPos[n],
      isBewonerZigbaar,
      isReducedMotion,
      _forseerVerminderdeBeweging: (v) => { reducedMotionOverride = v; },
    };
  }

  root.BergEngine = createEngine();
})(typeof window !== 'undefined' ? window : this);
