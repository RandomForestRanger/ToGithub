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
// BEWONER_KUNS/KAPOK_POSES vir die crop-koördinate. Kaart 7-vervolg
// (2026-08-19): 'n tweede kuns-lewering (Four_animals_additional.jpg) het
// Padda/Papegaai/Klipdassie/Sneeuman bygevoeg (Padda en Sneeuman vervang/
// hernoem "Akkedis"/"Lammergier" -- 'n padda en 'n sneeuman i.p.v. 'n
// akkedis en 'n lammergier, op die gebruiker se versoek; sien CLAUDE.md).
// Slegs Bergkraai het nog geen kuns nie en bly die kleur+letter-plekhouer
// van Kaart 4 tot sy kuns ook opgelaai word.
(function (root) {
  'use strict';

  const N_RUNGS = 30;
  const MILESTONE_RUNGS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  const ZONE_OF = (n) => (n <= 6 ? 'moeras' : n <= 14 ? 'woud' : n <= 22 ? 'rotse' : 'sneeu');

  // Plekhouer-silhoeëtte per bewoner: 'n kleur + 'n kort letter-etiket.
  // Bewoners met werklike kuns (sien BEWONER_KUNS) gebruik dit i.p.v. hierdie
  // sirkel; die res val terug op hierdie plekhouer tot hul kuns ook inkom.
  // Kaart 7-vervolg (2026-08-19): Padda (was "Akkedis") en Sneeuman (was
  // "Lammergier") is hernoem toe hul kuns (Four_animals_additional.jpg --
  // 'n padda, 'n papegaai, 'n klipdassie, 'n sneeuman) 'n regte inhoud-
  // wysiging was, nie net 'n herskin nie -- op die gebruiker se uitdruklike
  // versoek. Lae risiko: `naam` word net as 'n verborge `data-naam`-DOM-
  // attribuut gebruik, nooit deur enige dialoog aangehaal nie.
  const BEWONER_INFO = {
    3: { naam: 'Padda', kleur: '#7a9c5c', letter: 'Pd' },
    6: { naam: 'Aksolotl', kleur: '#e8a0c0', letter: 'Ax' },
    9: { naam: 'Papegaai', kleur: '#3fa34d', letter: 'Pa' },
    12: { naam: 'Apie', kleur: '#8a5a3c', letter: 'Ap' },
    15: { naam: 'Klipdassie', kleur: '#a08060', letter: 'Kd' },
    18: { naam: 'Ibeks', kleur: '#c9a876', letter: 'Ib' },
    21: { naam: 'Bergkraai', kleur: '#3a3a3a', letter: 'Bk' },
    24: { naam: 'Sneeuhaas', kleur: '#f0f0f0', letter: 'Sh' },
    27: { naam: 'Sneeuman', kleur: '#8a7060', letter: 'Sm' },
    30: { naam: 'Sneeuluiperd', kleur: '#dfe6ea', letter: 'Sl' },
  };

  // Kaart 7-vervolg: werklike kuns per bewoner. 'crop'-tipe deel dieselfde
  // vlak-paaie (creature-fur/tan/outline/highlight) uit "four creatures.svg"
  // -- net die viewBox-crop verskil per dier, presies soos Kapok se vier
  // posisies een gedeelde pad-stel deel. 'group'-tipe (Sneeuluiperd) is
  // klaar 'n eie <g>-groep. Let wel: die bronlêer se eie vierde gedeelde
  // vlak (die naby-wit/-romerige "agtergrond-was", #f9faf6) word steeds nie
  // gebruik nie -- dit was 'n ondeurskynende vlak wat byna die hele
  // 1408x768-doek dek, wat 'n lelike reghoekige wit blok om elke dier gegee
  // het toe dit uitgesny is. Sien CLAUDE.md "Kaart 7-vervolg" vir die
  // volledige diagnose.
  //
  // Kaart 7-vervolg (2026-08-20): `creature-fur` -- die kapok-fur-tegniek
  // (outline-laag hoë-resolusie gerender, scipy binary_fill_holes, skimage
  // find_contours-vektorisering) toegepas op al vier diere, nie net die
  // Sneeuhaas nie. Eerste poging het slegs die Sneeuhaas reggemaak (op die
  // aanname dat "Aksolotl/Apie/Ibeks se liggame kom reeds van ander vlakke"
  // uit 'n vroeëre kaart se nota) -- die gebruiker het toe self opgemerk dat
  // die ander drie in-game óók sketterig/deursigtig lyk. Regte oorsaak: al
  // vier diere se buitelyn het dieselfde soort hiaat as Kapok s'n (sien
  // onder), dit was nooit net 'n Sneeuhaas-eiendomlikheid nie -- die eerste
  // "lyk reg"-oordeel was op 'n te-klein voorskou-beeld gebaseer.
  //
  // Twee slaggate wat eers ontdek moes word (anders as Kapok se enkele-
  // silhoeët-doek):
  // (1) Aksolotl/Apie/Ibeks staan elk in 'n omraamde "kaart" in die bronlêer
  //     (Sneeuhaas nie). 'n Reguit doek-wye vulling sou elke hele raam-
  //     reghoek gevul het (dieselfde "wit blok"-fout, van 'n raam-lyn i.p.v.
  //     die was-vlak). Oplossing: die WAND-MASKER (nie net die eindresultaat
  //     nie) word EERS na elke dier se eie crop-rehoek (+12px marge)
  //     uitgeknip, VOORDAT closing/fill_holes loop -- die raam se lynwerk
  //     bestaan dan eenvoudig nie in die berekening nie, dus kan dit nooit
  //     die vulling insleep nie.
  // (2) elke dier het sy eie minimum binary_closing-iterasietal nodig gehad
  //     voor die gevulde fraksie spring/stabiliseer (Aksolotl 2, Apie 4,
  //     Ibeks 6, Sneeuhaas 8 -- getoets oor 'n reeks 0-16 per dier, nie
  //     aanvaar dat een waarde vir almal sou werk nie). By Ibeks het 'n te-
  //     hoë waarde (8) sy liggaam met 'n aparte kaart-basislyn-versiering
  //     laat saamsmelt tot een gevulde vorm; die uiteindelike keuse (6) plus
  //     'n "hou net die grootste verbonde komponent"-filter (laat vaar die
  //     versiering as 'n aparte, kleiner stuk) los dit op. **Les:** moenie
  //     aanvaar dieselfde sluitings-waarde (of dieselfde "dit lyk reg"-
  //     oordeel by klein voorskou-grootte) oor bronlêers of selfs oor diere
  //     binne een bronlêer heen werk nie -- toets die gevulde fraksie oor 'n
  //     reeks waardes per dier en kyk teen werklike speletjie-ikoon-grootte.
  const CREATURE_USE_IDS = ['creature-fur', 'creature-tan', 'creature-outline', 'creature-highlight'];
  // Kaart 7-vervolg (2026-08-19): 'raster'-tipe (Padda/Papegaai/Klipdassie/
  // Sneeuman, uit Four_animals_additional.jpg) -- soos Stapper Seun, 'n
  // reeds-volledig-geverfde JPEG-illustrasie, nie plat SVG-lynwerk nie, dus
  // elke dier 'n eie, volledige raster-beeld (`<image id="creature2-...">`
  // in <defs>) i.p.v. 'n gedeelde-canvas viewBox-crop. bouRasterSnit()
  // hanteer hierdie tipe (analoog aan stelStapperPos()). Agtergrond hier
  // was NIE by die raam se rand betroubaar nie -- die sneeuman se ysige
  // pels en die papegaai se kop is self amper suiwer wit, so 'n suiwer
  // kleursleutel (soos vir Stapper Seun) sou hulle laat vergrys teen 'n
  // donker agtergrond. Rand-verbondenheid (net wit wat aan die beeld se
  // buiterand raak, tel as agtergrond) los dit reg op: wit binne 'n
  // geslote silhoeët (soos die pels) bly ondeurskynend. Sien CLAUDE.md.
  const BEWONER_KUNS = {
    3: { type: 'raster', id: 'creature2-padda', maxDim: 42 },      // Padda (was Akkedis)
    6: { type: 'crop', ids: CREATURE_USE_IDS, crop: [55, 70, 355, 235], maxDim: 42 },   // Aksolotl
    9: { type: 'raster', id: 'creature2-papegaai', maxDim: 42 },   // Papegaai
    12: { type: 'crop', ids: CREATURE_USE_IDS, crop: [585, 50, 210, 275], maxDim: 42 }, // Apie
    15: { type: 'raster', id: 'creature2-klipdassie', maxDim: 42 }, // Klipdassie
    18: { type: 'crop', ids: CREATURE_USE_IDS, crop: [1035, 55, 290, 280], maxDim: 42 }, // Ibeks
    24: { type: 'crop', ids: CREATURE_USE_IDS, crop: [585, 405, 235, 270], maxDim: 42 }, // Sneeuhaas
    27: { type: 'raster', id: 'creature2-sneeuman', maxDim: 42 },  // Sneeuman (was Lammergier)
    30: { type: 'group', id: 'sneeuluiperd-figure', crop: [130, 35, 1080, 733], maxDim: 80 }, // Sneeuluiperd (2026-08-20: 56 -> 67 -> 80, twee opeenvolgende 20%-versoeke)
  };

  // 2026-08-20 (gebruiker-versoek): die Sneeuluiperd sit nie langs merker 30
  // nie (soos die ander nege bewoners, translate(p.x+26,p.y-26)) -- sy sit by
  // die roete se ware eindpunt (t=1.0, ná merker 30 se t=30/31 -- die klein
  // marge wat §2.1 doelbewus tussen die laaste merker en die kruin los), 'n
  // paar wêreld-eenhede hoër as merker 30. SNEEULUIPERD_VERSET is die
  // verset t.o.v. daardie ware eindpunt (nie t.o.v. 'n merker nie, anders as
  // elke ander bewoner) -- geverifieer teen die werklike roetepad + agtergrond
  // dat sy net bo-op die bergpiek se rots sit, met die roete wat reg by haar
  // pote eindig.
  // 2026-08-20-vervolg: nog 'n versoek om "'n bietjie hoër" te skuif -- +20
  // wêreld-eenhede opwaarts bygevoeg (-15 -> -35). Hierdie is wêreld-
  // koördinaat-eenhede in die 720x2036-ruimte, nie skerm-pixels nie, maar
  // wel dieselfde ruimte as VENSTER_W/H (360x280) se kamera-venster -- 20
  // eenhede is dus ~5.5% van die sigbare vensterwydte, 'n werklik sigbare
  // skuif, nie kosmeties klein nie. Geverifieer teen die werklike agtergrond
  // dat sy (met haar nou-groter maxDim: 80) steeds binne die 720x2036-wêreld
  // se boonste rand bly (ore net-net onder y=0; die rotsperskie se ink self
  // het marge in sy crop-rehoek, dus geen werklike afsny nie).
  const SNEEULUIPERD_VERSET = { x: 0, y: -28 }; // 2026-08-20-vervolg: -35 -> -31 -> -28 (twee opeenvolgende "'n bietjie laer"-versoeke)

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

  // Kaart 7-vervolg (2026-08-18): Stapper Seun -- die klimmer self, uit
  // Stapper_seun.jpg (vier uitrustings, een per sone: Moeras/Woud/Rotse/
  // Sneeu, in daardie volgorde in die bronlêer). Anders as Kapok se
  // bronlêer is dit 'n plat JPEG op 'n effe wit agtergrond, nie 'n SVG met
  // 'n bruikbare buitelynlaag nie -- die "fill-holes"-tegniek van kapok-fur
  // pas dus nie hier nie. In plaas daarvan is elke posisie met 'n kleur-
  // sleutel uitgesny (agtergrond se ware wit, #fff, wêreldwyd verwyder --
  // nie net wat aan die raam se rand raak nie, sodat toevallige omsluite
  // gaatjies -- die tou-lus in Woud, die ysbyl-band in Sneeu -- ook reg
  // deursigtig word, nie as lelike reghoekige wit kolle bly nie), sagte
  // rand-vervaging via 'n afstand-tot-wit-helling, dan as PNG (nie SVG-pad
  // nie, aangesien dit 'n volledige geverfde illustrasie is, nie plat
  // lynwerk om te vektoriseer nie) ingebed. Elke uitrusting staan as sy eie
  // <image id="stapper-<sone>">-element in <defs> (kruin.html/
  // berg-demo2.html), verwys deur STAPPER_ZONE_IDS hieronder. Sien
  // CLAUDE.md vir die volledige metode.
  const STAPPER_ZONE_IDS = { moeras: 'stapper-moeras', woud: 'stapper-woud', rotse: 'stapper-rotse', sneeu: 'stapper-sneeu' };
  const STAPPER_ICON_MAXDIM = 54;

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
    let kruinPos = null; // die roete se ware eindpunt (t=1.0) -- sien SNEEULUIPERD_PLASING
    let reducedMotionOverride = null;
    let kunsGereed = false; // true sodra kuns-bates.svg se <defs> ingespuit is
    let stapperKunsGereed = false; // true sodra Stapper Seun se <defs>-beelde teenwoordig is

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
      stapperKunsGereed = !!svg.querySelector('#' + STAPPER_ZONE_IDS.moeras);
      if (!stapperKunsGereed && typeof console !== 'undefined') {
        console.warn('Stapper Seun se kuns (#stapper-moeras) nie in die SVG-merkup gevind nie -- die plekhouer-sirkel bly geld.');
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

    // Kaart 7-vervolg: soos bouKunsSnit(), maar vir 'n volledige, aparte
    // raster-beeld (geen gedeelde canvas/viewBox-crop nodig nie) -- gebruik
    // deur BEWONER_KUNS se 'raster'-tipe. Gee null terug as die <defs>-
    // beeld ontbreek, sodat die roeper op die plekhouer kan terugval.
    function bouRasterSnit(imgDefId, maxDim) {
      const bron = document.getElementById(imgDefId);
      if (!bron) return null;
      const w = Number(bron.getAttribute('width')), h = Number(bron.getAttribute('height'));
      const skaal = maxDim / Math.max(w, h);
      const dispW = w * skaal, dispH = h * skaal;
      return svgEl('image', {
        href: bron.getAttribute('href'),
        x: -dispW / 2, y: -dispH / 2, width: dispW, height: dispH,
      });
    }

    function init(svgEl_, opts) {
      opts = opts || {};
      svg = svgEl_;
      routePath = svg.querySelector('#roete');
      routeLen = routePath.getTotalLength();
      kruinPos = routePath.getPointAtLength(routeLen); // t=1.0, die roete se ware eindpunt
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
        // Sneeuluiperd (n=30) sit by die roete se ware eindpunt (kruinPos),
        // nie langs haar merker soos die ander nege bewoners nie -- sien
        // SNEEULUIPERD_VERSET.
        const tx = n === 30 ? kruinPos.x + SNEEULUIPERD_VERSET.x : markerPos[n].x + 26;
        const ty = n === 30 ? kruinPos.y + SNEEULUIPERD_VERSET.y : markerPos[n].y - 26;
        const g = svgEl('g', {
          id: 'bewoner-' + n,
          transform: `translate(${tx},${ty})`,
          visibility: 'hidden',
          'data-naam': info.naam,
        });
        const kuns = kunsGereed ? BEWONER_KUNS[n] : null;
        let kunsEl = null;
        if (kuns && kuns.type === 'crop') {
          kunsEl = bouKunsSnit(kuns.ids, kuns.crop, kuns.maxDim);
        } else if (kuns && kuns.type === 'group') {
          kunsEl = bouKunsSnit([kuns.id], kuns.crop, kuns.maxDim);
        } else if (kuns && kuns.type === 'raster') {
          kunsEl = bouRasterSnit(kuns.id, kuns.maxDim); // null as <defs>-beeld ontbreek -- val terug op plekhouer
        }
        if (kunsEl) {
          g.appendChild(kunsEl);
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

      // Stapper Seun: vervang die plekhouer-sirkel <circle id="klimmer-lyf">
      // met 'n <image>-element (indien kuns teenwoordig); die sirkel bly
      // andersins as plekhouer staan. Anders as Kapok se <use>-gebaseerde
      // snit (een gedeelde canvas, viewBox-crop per posisie) is elke
      // Stapper Seun-uitrusting 'n volledige, aparte raster-illustrasie --
      // stelStapperPos() wissel bloot watter <defs>-beeld se href/afmetings
      // op die sigbare <image> toegepas word, geen crop-venster nodig nie.
      const klimmerLyf = document.getElementById('klimmer-lyf');
      if (klimmerLyf && stapperKunsGereed) {
        klimmerLyf.replaceWith(svgEl('image', { id: 'stapper-sprite' }));
      }

      const beginRung = opts.beginRung || 1;
      setViewBox(viewBoxForMarker(beginRung));
      setKlimmerPos(markerPos[beginRung].x, markerPos[beginRung].y);
      stelStapperPos(ZONE_OF(beginRung));
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
      stelStapperPos(ZONE_OF(rung));
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

    // Kaart 7-vervolg: wissel Stapper Seun se vertoonde uitrusting om na sy
    // huidige sone (Moeras/Woud/Rotse/Sneeu) -- geen effek as die kuns nog
    // nie gelaai het nie (bly die plekhouer-sirkel). Elke uitrusting is 'n
    // volledige, aparte raster-beeld (nie 'n gedeelde-canvas crop soos
    // Kapok nie), dus stel dit bloot href + skaalafmetings, geen viewBox
    // nodig nie. Anker: voete op die roetelyn (y=0), gesentreer horisontaal.
    function stelStapperPos(zone) {
      const img = document.getElementById('stapper-sprite');
      if (!img) return; // kuns nie gelaai nie -- niks om te wissel nie
      const bron = document.getElementById(STAPPER_ZONE_IDS[zone] || STAPPER_ZONE_IDS.moeras);
      if (!bron) return;
      const w = Number(bron.getAttribute('width')), h = Number(bron.getAttribute('height'));
      const skaal = STAPPER_ICON_MAXDIM / Math.max(w, h);
      const dispW = w * skaal, dispH = h * skaal;
      img.setAttribute('href', bron.getAttribute('href'));
      img.setAttribute('width', dispW); img.setAttribute('height', dispH);
      img.setAttribute('x', -dispW / 2); img.setAttribute('y', -dispH);
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
      stelStapperPos(ZONE_OF(naRung));
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
      stelStapperPos(ZONE_OF(naRung));
      return Promise.all([
        animateViewBox(viewBoxForMarker(vanRung), viewBoxForMarker(naRung), 2200),
        animateKlimmerTo(vanRung, naRung, 2200),
      ]);
    }

    // §4.2: bewoner-onthulling -- pan nader, vervaag die dier in, hou, pan terug. ~10s.
    function bewonerOnthulling(rung) {
      if (!MILESTONE_RUNGS.includes(rung)) return Promise.resolve();
      const huidige = viewBoxForMarker(rung);
      // Sneeuluiperd (n=30) sit by kruinPos, nie by haar merker nie (sien
      // SNEEULUIPERD_VERSET) -- die onthullingsvenster volg dieselfde plek.
      const bx = rung === 30 ? kruinPos.x + SNEEULUIPERD_VERSET.x : markerPos[rung].x;
      const by = rung === 30 ? kruinPos.y + SNEEULUIPERD_VERSET.y : markerPos[rung].y;
      const nabyBewoner = rung === 30
        ? { x: bx - 130, y: by - 20, w: 230, h: 180 } // gekalibreer om binne die 720x2036-wêreld te bly (sy sit naby die boonste/regterrand); y-verset verklein van 40->20 toe sy hoër geskuif is
        : { x: bx - 42, y: by - 108, w: 230, h: 180 };
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
      stelStapperPos,
      _forseerVerminderdeBeweging: (v) => { reducedMotionOverride = v; },
      _kunsGereed: () => kunsGereed,
      _stapperKunsGereed: () => stapperKunsGereed,
    };
  }

  root.BergEngine = createEngine();
})(typeof window !== 'undefined' ? window : this);
