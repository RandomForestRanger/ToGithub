// Sneeuluiperd se Kruin — Kaart 4/5: die berg as koppelvlak (§4) + Kapok se
// gedragstelsel (§5.4). Kamera-enjin (viewBox-interpolasie), roetemerker/
// bewoner-posisionering, en (Kaart 5) Kapok se reaksie-animasies + kunsies.
// Sedert Kaart 5 werklik in kruin.html geïntegreer (was 'n Kaart 4-selfstandige
// demo).
// Kaart 7 (2026-08-12): kunswerk-weergawe 1 (kinders-kolaz) vervang die
// handgetekende SVG-terrein met 'n raster-agtergrond in kruin.html; hierdie
// lêer se enjin (kamera, merkers, bewoners, klimmer/Kapok) is argitektuur-
// ongeskonde -- net VENSTER_W/H, kruinView(), en bewonerOnthulling() se
// nabyBewoner-venster is herskaal na die nuwe 720x2036-wêreldruimte.
// Kaart 7-vervolg (2026-08-13): werklike karakter-kuns (deur die gebruiker
// verskaf: Kapok se vier posisies, Oom Jorka, die Sneeuluiperd, en vier
// bewoner-diere) vervang die plekhouer-sirkels. Die kuns self staan as 'n
// statiese <defs>-blok in kruin.html/berg-demo2.html se SVG-merkup (nie by
// looptyd met fetch() ingebring nie -- 'n vroeëre weergawe het dit gedoen,
// laat vaar ten gunste van hierdie eenvoudiger benadering, sien CLAUDE.md).
// Sien bepaalKunsGereed() vir die teenwoordigheid-toets, en
// BEWONER_KUNS/KAPOK_POSES vir die crop-koördinate. Bewoners sonder kuns
// (Akkedis/Papegaai/Klipdassie/Bergkraai/Lammergier) bly die kleur+letter-
// plekhouer van Kaart 4 tot hulle kuns ook opgelaai word.
(function (root) {
  'use strict';

  const N_RUNGS = 30;
  const MILESTONE_RUNGS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  const ZONE_OF = (n) => (n <= 6 ? 'moeras' : n <= 14 ? 'woud' : n <= 22 ? 'rotse' : 'sneeu');

  // Plekhouer-silhoeëtte per bewoner: 'n kleur + 'n kort letter-etiket.
  // Bewoners met werklike kuns (sien BEWONER_KUNS) gebruik dit i.p.v. hierdie
  // sirkel; die res val terug op hierdie plekhouer tot hul kuns ook inkom.
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

  // Kaart 7-vervolg: werklike kuns per bewoner. 'crop'-tipe deel dieselfde
  // vlak-paaie (creature-tan/outline/highlight) uit "four creatures.svg" --
  // net die viewBox-crop verskil per dier, presies soos Kapok se vier
  // posisies een gedeelde pad-stel deel. 'group'-tipe (Sneeuluiperd) is
  // klaar 'n eie <g>-groep. Let wel: die vierde gedeelde vlak (die naby-wit/
  // -romerige "agtergrond-was", #f9faf6 in die bronlêer) word doelbewus
  // NIE gebruik nie -- dit was 'n ondeurskynende vlak wat byna die hele
  // 1408x768-doek dek (nie net die dier se buitelyn nie), wat 'n lelike
  // reghoekige wit blok om elke dier gegee het toe dit uitgesny is. Sien
  // CLAUDE.md "Kaart 7-vervolg" vir die volledige diagnose. ('n Poging om
  // die Sneeuhaas se wit vagsel met 'n handgeplaaste rugsteun-vorm te
  // herstel is saam met Kapok s'n teruggerol -- sien KAPOK_USE_IDS.)
  const CREATURE_USE_IDS = ['creature-tan', 'creature-outline', 'creature-highlight'];
  const BEWONER_KUNS = {
    6: { type: 'crop', ids: CREATURE_USE_IDS, crop: [55, 70, 355, 235], maxDim: 42 },   // Aksolotl
    12: { type: 'crop', ids: CREATURE_USE_IDS, crop: [585, 50, 210, 275], maxDim: 42 }, // Apie
    18: { type: 'crop', ids: CREATURE_USE_IDS, crop: [1035, 55, 290, 280], maxDim: 42 }, // Ibeks
    24: { type: 'crop', ids: CREATURE_USE_IDS, crop: [585, 405, 235, 270], maxDim: 42 }, // Sneeuhaas
    30: { type: 'group', id: 'sneeuluiperd-figure', crop: [130, 35, 1080, 733], maxDim: 56 }, // Sneeuluiperd
  };

  // Kapok se vier posisies (uit Kapok/4_vlekkies.svg, gedeelde paaie
  // kapok-fur/kapok-shade/kapok-outline). Die bronlêer se eie derde vlak
  // (#fcfcfb, "wit vagsel") is nog steeds doelbewus nie gebruik nie: dis 'n
  // ondeurskynende agtergrond-was oor byna die hele doek, nie 'n netjiese
  // hondsilhoeët nie -- sien CLAUDE.md. 'n Vroeëre poging om dit met
  // handgeplaaste ellipse-vorms te vervang is deur die gebruiker verwerp en
  // teruggerol. `kapok-fur` los dit nou wel op, maar anders as daardie
  // poging: dis nie geraaide koördinate nie -- dit is die outline-laag self
  // (net #181815, sonder die was) hoë-resolusie gerender, elke omsluite
  // binneruimte outomaties opgevul (scipy binary_fill_holes ná 'n klein
  // morfologiese sluiting om haar-lynwerk-nate te oorbrug), en die gevulde
  // masker teruggevektoriseer (skimage find_contours + approximate_polygon)
  // -- dus volg dit die kunstenaar se werklike lynwerk presies, nooit
  // geskatte vorms nie. Gevolg: bene/ore/stert bly korrek geskei (die
  // agtergrond tussen die pote bly deursigtig, dis nooit "binne" die
  // omlynde silhoeët nie), en geen kanvas-omvattende wit blok nie. Elke
  // posisie geverifieer teen 'n regte render voor dit ingebak is (sien
  // CLAUDE.md "Kaart 7-vervolg"). Crop-koördinate in die bronlêer se eie
  // 1408x768-ruimte.
  const KAPOK_USE_IDS = ['kapok-fur', 'kapok-shade', 'kapok-outline'];
  const KAPOK_POSES = {
    draf: { x: 90, y: 25, w: 510, h: 325 },
    bly: { x: 765, y: 40, w: 545, h: 310 },
    klimOnder: { x: 105, y: 370, w: 500, h: 380 },
    klimBo: { x: 815, y: 355, w: 593, h: 405 },
  };
  const KAPOK_ICON_MAXDIM = 38;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function createEngine() {
    let svg = null, routePath = null, routeLen = 0;
    const markerPos = {}; // n -> {x,y}
    let reducedMotionOverride = null;
    let kunsGereed = false; // true sodra kuns-bates.svg se <defs> ingespuit is

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
    // Kaart 7: wêreld-skaal skuif van die handgetekende 1200x800-SVG na die
    // kolaz-agtergrond se eie 720x2036-pixelruimte -- hierdie venstergrootte
    // is herskaal om dieselfde "hoeveel sporte sigbaar"-gevoel te behou
    // (voorheen ~340x260 in 'n 1200-breë wêreld met ~42 eenhede per sport).
    const VENSTER_W = 360, VENSTER_H = 280;
    function viewBoxForMarker(n) {
      const p = markerPos[n];
      return { x: p.x - VENSTER_W / 2, y: p.y - VENSTER_H / 2, w: VENSTER_W, h: VENSTER_H };
    }
    // Kruin-venster: styf op die kruin geraam (opening van elke sessie).
    function kruinView() {
      const p = markerPos[N_RUNGS];
      return { x: p.x - 140, y: p.y - 90, w: 280, h: 220 };
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

    // === Kaart 7-vervolg: kuns-bates teenwoordigheid ===
    // Die karakter-kuns (Kapok/Yorka/Sneeuluiperd/vier-bewoner-diere) leef
    // as 'n statiese <defs>-blok wat REGSTREEKS in kruin.html/berg-demo2.html
    // se <svg id="bergSvg">-merkup staan (sien CLAUDE.md "Kaart 7-vervolg").
    // 'n Vroeëre weergawe het dit met fetch()+DOMParser()+importNode() by
    // looptyd ingebring uit 'n aparte berg/kuns-bates.svg-lêer; dit is
    // doelbewus laat vaar ten gunste van hierdie eenvoudiger, sinchrone
    // benadering -- minder bewegende dele (geen netwerk-oproep, XML-
    // ontleding, of dokument-invoer wat op 'n subtiele manier kon faal nie),
    // en die kuns is in elk geval altyd nodig sodra die bladsy laai. Hierdie
    // funksie doen dus net 'n teenwoordigheid-toets, geen laai nie.
    function bepaalKunsGereed() {
      kunsGereed = !!svg.querySelector('#kapok-outline');
      if (!kunsGereed && typeof console !== 'undefined') {
        console.warn('Karakter-kuns (#kapok-outline) nie in die SVG-merkup gevind nie -- plekhouers bly geld.');
      }
    }

    // Bou 'n <svg>-broksel wat 'n crop uit die gedeelde bates vertoon,
    // gesentreer op sy eie oorsprong (sodat 'n eenvoudige translate(x,y) op
    // die omhullende <g> dit reg plaas), geskaal sodat sy grootste afmeting
    // == maxDim.
    function bouKunsSnit(useIds, crop, maxDim) {
      const [cx, cy, cw, ch] = crop;
      const skaal = maxDim / Math.max(cw, ch);
      const w = cw * skaal, h = ch * skaal;
      const el = svgEl('svg', {
        x: -w / 2, y: -h / 2, width: w, height: h,
        viewBox: `${cx} ${cy} ${cw} ${ch}`,
      });
      for (const id of useIds) el.appendChild(svgEl('use', { href: '#' + id }));
      return el;
    }

    function init(svgEl_, opts) {
      opts = opts || {};
      svg = svgEl_;
      routePath = svg.querySelector('#roete');
      routeLen = routePath.getTotalLength();
      bepaalKunsGereed();

      const merkersGroup = svg.querySelector('#merkers');
      merkersGroup.innerHTML = '';
      for (let n = 1; n <= N_RUNGS; n++) {
        const t = n / (N_RUNGS + 1); // marge aan albei kante (voet/kruin)
        const pt = routePath.getPointAtLength(t * routeLen);
        markerPos[n] = { x: pt.x, y: pt.y, t };
        const g = svgEl('g', { id: 'merker-' + n, transform: `translate(${pt.x},${pt.y})`, 'data-sone': ZONE_OF(n) });
        g.appendChild(svgEl('circle', {
          r: MILESTONE_RUNGS.includes(n) ? 9 : 6,
          fill: '#f4c542', stroke: '#1a1a2e', 'stroke-width': 2,
        }));
        merkersGroup.appendChild(g);
      }

      const bewonersGroup = svg.querySelector('#bewoners');
      bewonersGroup.innerHTML = '';
      for (const n of MILESTONE_RUNGS) {
        const info = BEWONER_INFO[n];
        const p = markerPos[n];
        const g = svgEl('g', {
          id: 'bewoner-' + n,
          transform: `translate(${p.x + 26},${p.y - 26})`,
          visibility: 'hidden',
          'data-naam': info.naam,
        });
        const kuns = kunsGereed ? BEWONER_KUNS[n] : null;
        if (kuns && kuns.type === 'crop') {
          g.appendChild(bouKunsSnit(kuns.ids, kuns.crop, kuns.maxDim));
        } else if (kuns && kuns.type === 'group') {
          g.appendChild(bouKunsSnit([kuns.id], kuns.crop, kuns.maxDim));
        } else {
          // plekhouer: kleur-sirkel + letter (geen kuns vir hierdie bewoner nog nie)
          g.appendChild(svgEl('circle', { r: 16, fill: info.kleur, stroke: '#1a1a2e', 'stroke-width': 2.5 }));
          const t = svgEl('text', {
            'text-anchor': 'middle', dy: 4, 'font-size': 11,
            'font-family': 'Segoe UI, sans-serif', fill: '#1a1a2e',
          });
          t.textContent = info.letter;
          g.appendChild(t);
        }
        bewonersGroup.appendChild(g);
      }

      // Kapok: vervang die plekhouer-sirkel in <g id="kapok-sprite"> met
      // werklike kuns (indien teenwoordig); val terug op die sirkel andersins.
      const kapokSprite = document.getElementById('kapok-sprite');
      if (kapokSprite) {
        kapokSprite.innerHTML = '';
        if (kunsGereed) {
          const art = bouKunsSnit(KAPOK_USE_IDS, [KAPOK_POSES.draf.x, KAPOK_POSES.draf.y, KAPOK_POSES.draf.w, KAPOK_POSES.draf.h], KAPOK_ICON_MAXDIM);
          art.setAttribute('id', 'kapok-art');
          kapokSprite.appendChild(art);
        } else {
          kapokSprite.appendChild(svgEl('circle', { id: 'kapok-lyf', r: 7, fill: '#ffffff', stroke: '#1a1a2e', 'stroke-width': 2 }));
        }
      }

      const beginRung = opts.beginRung || 1;
      setViewBox(viewBoxForMarker(beginRung));
      setKlimmerPos(markerPos[beginRung].x, markerPos[beginRung].y);
      for (const n of MILESTONE_RUNGS) if (n <= beginRung) stelBewonerZigbaarheid(n, true);

      // Waarborg skilder-volgorde: die klimmer (en dus Kapok) moet altyd BO
      // die roetemerkers en bewoners lê. Statiese merkup-volgorde is reeds
      // so (#klimmer staan laaste), maar 'n eksplisiete appendChild hier
      // (wat 'n bestaande element SKUIF, nie dupliseer nie) waarborg dit
      // ongeag toekomstige merkup-herrangskikkings.
      const klimmerEl = document.getElementById('klimmer');
      if (klimmerEl) svg.appendChild(klimmerEl);

      return Promise.resolve(); // behou 'n Promise-terugkeerwaarde vir app.js se .then()-ketting
    }

    // §4.2/§1.3 bewoner-persoonlikhede: elke reeds-ontslote bewoner draai sy
    // kop soos die kamera verbygaan. Benader die "verbygaan-oomblik" met die
    // bewoner se roete-fraksie (t) teenoor die afkoms se totale duur.
    function skeduleerKopdraaie(ontslote, afkomsDuurMs) {
      for (const n of ontslote) {
        const el = bewonerEl(n);
        if (!el) continue;
        const vertraging = markerPos[n].t * afkomsDuurMs * 0.7; // 0.7: kamera "verby" vroeër as landing
        setTimeout(() => {
          if (isReducedMotion()) return;
          el.style.transition = 'transform 400ms ease-in-out';
          el.style.transformBox = 'fill-box';
          el.style.transformOrigin = 'center';
          el.style.transform = 'rotate(18deg)';
          setTimeout(() => { el.style.transform = 'rotate(0deg)'; }, 420);
        }, vertraging);
      }
    }

    // §4.2: openingsafkoms. 3-4s, oorslaanbaar met een tik, land presies by
    // die huidige merker. Reeds-ontslote bewoners is deurgaans sigbaar en
    // draai hul kop soos die kamera verbygaan.
    function openingsAfkoms(rung, ontsloteBewoners) {
      const ontslote = ontsloteBewoners || MILESTONE_RUNGS.filter((n) => n <= rung);
      for (const n of MILESTONE_RUNGS) stelBewonerZigbaarheid(n, ontslote.includes(n));
      setViewBox(kruinView());
      setKlimmerPos(markerPos[rung].x, markerPos[rung].y);
      const DUUR = 3500;
      if (!isReducedMotion()) skeduleerKopdraaie(ontslote, DUUR);
      return animateViewBox(kruinView(), viewBoxForMarker(rung), DUUR, { skippable: true });
    }

    // === Kaart 5 (+ Kaart 7-vervolg): Kapok se gedragstelsel (§5.4) ===
    function kapokEl() { return document.getElementById('kapok-sprite'); }

    // Wissel Kapok se vertoonde posisie (kuns) om -- geen effek as die kuns
    // nog nie gelaai het nie (bly die plekhouer-sirkel).
    function stelKapokPos(naam) {
      const art = document.getElementById('kapok-art');
      if (!art) return; // kuns nie gelaai nie -- niks om te wissel nie
      const crop = KAPOK_POSES[naam] || KAPOK_POSES.draf;
      const skaal = KAPOK_ICON_MAXDIM / Math.max(crop.w, crop.h);
      const w = crop.w * skaal, h = crop.h * skaal;
      art.setAttribute('x', -w / 2); art.setAttribute('y', -h / 2);
      art.setAttribute('width', w); art.setAttribute('height', h);
      art.setAttribute('viewBox', `${crop.x} ${crop.y} ${crop.w} ${crop.h}`);
    }

    function kapokBlaf() {
      const el = kapokEl();
      if (!el || isReducedMotion()) return;
      el.style.transition = 'transform 120ms ease-out';
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
      el.style.transform = 'scale(1.4)';
      setTimeout(() => { el.style.transform = 'scale(1)'; }, 130);
    }

    // Vreugde-oomblik (mat): wissel na die "bly"-sprongposisie (indien kuns
    // gelaai het) en gee 'n klein bons; sonder kuns bly die ou rotasie-tol.
    function kapokTolVanVreugde() {
      const el = kapokEl();
      if (!el) return;
      const hetKuns = !!document.getElementById('kapok-art');
      if (isReducedMotion()) return;
      if (hetKuns) {
        stelKapokPos('bly');
        el.style.transition = 'transform 260ms ease-out';
        el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
        el.style.transform = 'scale(1.22) translateY(-6px)';
        setTimeout(() => { el.style.transition = 'transform 340ms ease-in'; el.style.transform = 'scale(1) translateY(0)'; }, 270);
        setTimeout(() => { stelKapokPos('draf'); }, 900);
      } else {
        el.style.transition = 'transform 700ms ease-in-out';
        el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
        el.style.transform = 'rotate(360deg)';
        setTimeout(() => { el.style.transition = 'none'; el.style.transform = 'rotate(0deg)'; }, 720);
      }
    }

    function kapokOreVlat() {
      const el = kapokEl();
      if (!el || isReducedMotion()) return;
      el.style.transition = 'transform 300ms ease-in';
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
      el.style.transform = 'scaleY(0.55)';
      setTimeout(() => { el.style.transition = 'transform 400ms ease-out'; el.style.transform = 'scaleY(1)'; }, 900);
    }

    // Kunsies (§5.4): ligte-pas animasies, suiwer kosmeties, werk op enige
    // posisie (kuns of plekhouer) omdat dit die hele #kapok-sprite transform.
    const KUNSIE_ANIMASIES = {
      'modder-skud': (el) => { el.style.transition = 'transform 120ms ease-in-out'; el.style.transform = 'rotate(-15deg)'; setTimeout(() => { el.style.transform = 'rotate(15deg)'; }, 130); setTimeout(() => { el.style.transform = 'rotate(0deg)'; }, 260); },
      'stok-gaan-haal': (el) => { el.style.transition = 'transform 300ms ease-out'; el.style.transform = 'translateX(24px)'; setTimeout(() => { el.style.transition = 'transform 400ms ease-in'; el.style.transform = 'translateX(0)'; }, 320); },
      'klip-tot-klip-spring': (el) => { el.style.transition = 'transform 150ms ease-out'; el.style.transform = 'translateY(-14px)'; setTimeout(() => { el.style.transform = 'translateY(0)'; }, 160); setTimeout(() => { el.style.transform = 'translateY(-14px)'; }, 340); setTimeout(() => { el.style.transform = 'translateY(0)'; }, 500); },
      'sneeu-engel': (el) => { el.style.transition = 'transform 500ms ease-in-out'; el.style.transform = 'scaleX(1.8) scaleY(0.6)'; setTimeout(() => { el.style.transform = 'scale(1)'; }, 900); },
    };
    function kapokKunsie(naam) {
      const el = kapokEl();
      if (!el || isReducedMotion()) return;
      el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center';
      const anim = KUNSIE_ANIMASIES[naam];
      if (anim) anim(el);
    }

    // §4.2: klim (slaag) -- kamera + klimmer een merker op, ~1.5s. Kaart
    // 7-vervolg: Kapok wissel na sy klim-posisie (voorpote teen die rots)
    // vir die duur van die animasie, en keer terug na draf ná afloop.
    function klim(vanRung, naRung) {
      const hetKuns = !!document.getElementById('kapok-art');
      if (hetKuns && !isReducedMotion()) stelKapokPos('klimOnder');
      return Promise.all([
        animateViewBox(viewBoxForMarker(vanRung), viewBoxForMarker(naRung), 1500),
        animateKlimmerTo(vanRung, naRung, 1500),
      ]).then((res) => {
        if (hetKuns) stelKapokPos('draf');
        return res;
      });
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
      const nabyBewoner = { x: p.x - 42, y: p.y - 108, w: 230, h: 180 };
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
      kapokBlaf, kapokTolVanVreugde, kapokOreVlat, kapokKunsie, stelKapokPos,
      _forseerVerminderdeBeweging: (v) => { reducedMotionOverride = v; },
      _kunsGereed: () => kunsGereed,
    };
  }

  root.BergEngine = createEngine();
})(typeof window !== 'undefined' ? window : this);
