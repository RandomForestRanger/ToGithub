// Sneeuluiperd se Kruin — Kaart 5: klank (§7 Kaart 5).
// Oorspronklik alles gesintetiseer via die Web Audio API (geen eksterne
// klanklêers nie -- die suite se konvensie, sien Kamp Karpov). Kaart 7-
// vervolg (2026-08-20) het dit stelselmatig met regte opnames vervang soos
// dit beskikbaar geword het:
// - Windgeluid (openingsafkoms) → `s_afkoms.mp3`, 'n snit (`ffmpeg`) van
//   `s_sneeu_two.mp3` se begin, met 'n wegvaag aan die einde (gebruiker-
//   versoek; oorspronklik 1s, later na 3s verdriedubbel).
// - Wenk-hokkleur-blaf (§2.7) → hergebruik doelbewus die opgaan-blaf-lêer
//   (geen aparte opname nie, gebruiker-versoek), net teen 75%-volume op sy
//   eie `<audio>`-element om dit van die volledige-volume opgaan-blaf te
//   onderskei.
// Al die ander klanke (drie Kapok-blaf-opnames, 'n rivier-agtergrondlus,
// sewe sone-geur-/vlak-klaar-klanke) is reeds regte opnames, sien
// BLAF_LEERS/OMGEWING_LEERS.
// **Een gesintetiseerde klank bly doelbewus oor: `speelMatKlok()`** (die
// mat-klokkie) is aanvanklik verwyder, toe op gebruiker-versoek teruggebring
// as 'n veiligheidsnet vir die een oorblywende sukses-geval waar geen regte
// opname sou speel nie (geslaag, aan die plafon -- sport 30, geen hoër
// sport om na te klim nie -- én geen wenk betrokke nie; sien app.js se
// voltooiUitkomste()). Regte opnames gebruik gewone <audio>-elemente. Almal
// demp-baar, voorkeur oorleef 'n herlaai.
// Kaart 9-regstelling (bug-verslag): stelStil(true) het voorheen net nuwe
// klanke geblokkeer -- iets wat reeds speel (die rivier-agtergrondlus veral)
// het eenvoudig voortgespeel tot sy natuurlike einde. stelStil() pouseer nou
// ALLES wat reeds geskep is (sien die funksie self hieronder) sodat die
// stil-wisselaar werklik onmiddellik alles stilmaak.
(function (root) {
  'use strict';

  const STIL_SLEUTEL = 'sneeuluiperd_klank_stil';
  let stil = localStorage.getItem(STIL_SLEUTEL) === '1';

  // Kaart 7-vervolg (2026-08-21): klanklêer-paaie los op relatief tot
  // klank.js SE EIE ligging (Berg/kruin/), nie tot die dokument wat dit
  // laai nie -- kruin.html woon langs klank.js (Berg/kruin/), maar
  // berg-demo2.html (vir gou klank-toetsing, gebruiker-versoek) woon in
  // Berg/berg/, 'n ander gids. document.currentScript is net tydens
  // sinchrone skrip-uitvoering geldig, dus heel bo vasgevang.
  const SKRIP_BASIS = (function () {
    var skrip = document.currentScript;
    if (!skrip || !skrip.src) return ''; // terugval: relatief tot dokument
    return skrip.src.slice(0, skrip.src.lastIndexOf('/') + 1);
  })();

  // Kaart 7-vervolg (2026-08-21): sommige blaaiers blokkeer outo-speel-met-
  // klank vir 'n bladsy se HEEL EERSTE geluid as die bladsy self self deur
  // 'n klik-gedrewe navigasie bereik is (bv. welkom.html se spelerkaart ->
  // location.href = 'kruin.html') -- die "gebruiker-gebaar" wat die klik
  // gegee het, geld nie meer betroubaar teen die tyd wat 'n paar
  // belofte-wendings later (BergEngine.init().then(...)) die eerste .play()
  // regtig probeer nie. .play() se verwerping (Promise-afwysing) word
  // stilweg geslik (soos voorheen), maar 'n eenmalige "pointerdown"-
  // luisteraar op die dokument probeer dieselfde klank een slag oor sodra
  // die speler self weer met HIERDIE bladsy interaksie het (bv. 'n
  // skaakblok kliek) -- gewoonlik binne oomblikke.
  function speelMetOntsluit(el) {
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        const herprobeer = () => { el.play().catch(() => {}); };
        document.addEventListener('pointerdown', herprobeer, { once: true });
      });
    }
  }

  // Kaart 7-vervolg (2026-08-20, herroep): 'n Web Audio-konteks is weer
  // nodig -- speelMatKlok() (hieronder) is teruggebring as 'n veiligheidsnet
  // vir die oorblywende geval waar geen regte opname sou gespeel het nie
  // (sien app.js se voltooiUitkomste()).
  let ctx = null;
  function kryConteks() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Kaart 7-vervolg: regte opname-lêers. Paaie is relatief tot klank.js SE
  // EIE ligging (Berg/kruin/, sien SKRIP_BASIS hierbo) -- dus `afkoms`
  // (langs klank.js) sonder "../", die Kapok-blaf-lêers met.
  const BLAF_LEERS = {
    opgaan: { pad: '../Kapok/opgaan_blaf.mp3', volume: 1 },
    afgaan: { pad: '../Kapok/afgaan_blaf.mp3', volume: 1 },
    nuweBioom: { pad: '../Kapok/nuwe_bioom_blaf.mp3', volume: 1 },
    // Kaart 7-vervolg (2026-08-20): geen aparte wenk-blaf-opname nie --
    // hergebruik doelbewus die opgaan-blaf, net sagter (gebruiker-versoek).
    wenkBlaf: { pad: '../Kapok/opgaan_blaf.mp3', volume: 0.75 },
    // Kaart 7-vervolg (2026-08-20): vervang die gesintetiseerde windgeluid.
    afkoms: { pad: 's_afkoms.mp3', volume: 1 },
  };
  const blafElemente = {}; // naam -> HTMLAudioElement, lui geskep+gekas
  function speelBlafLeer(naam) {
    if (stil) return;
    let el = blafElemente[naam];
    if (!el) {
      const cfg = BLAF_LEERS[naam];
      el = new Audio(SKRIP_BASIS + cfg.pad);
      el.preload = 'auto';
      el.volume = cfg.volume;
      blafElemente[naam] = el;
    }
    el.currentTime = 0;
    speelMetOntsluit(el);
  }

  // Kaart 7-vervolg (2026-08-20): omgewingsklanke -- die moeras-rivier-
  // agtergrondlus, vier sone-geur-eenmaligklanke (moeras/woud/rotse/sneeu,
  // laasgenoemde drie verskillende lêers), en die twee "vlak-klaar"-fanfares.
  // Almal woon direk langs klank.js (Berg/kruin/), dus geen "../" nodig
  // soos die Kapok-blafte nie. Volume verlaag (0.45) vir die agtergrond-/
  // geur-klanke sodat hulle nie kort voorgrond-klanke (blaf, fanfare, mat-
  // klokkie) oorstem nie -- 'n ongetoetste oordeelsoproep (geen manier om
  // dit hierdie sessie te beluister nie), pas aan indien nodig.
  // Kaart 7-vervolg (2026-08-21): rivier 10% sagter op versoek (0.45 -> 0.405).
  const OMGEWING_LEERS = {
    rivier: { pad: 's_moeras_rivier.mp3', loop: true, volume: 0.405 },
    moeras: { pad: 's_moeras.mp3', loop: false, volume: 0.45 },
    woud: { pad: 's_forest.mp3', loop: false, volume: 0.45 },
    rotse: { pad: 's_kranse.mp3', loop: false, volume: 0.45 },
    sneeuEen: { pad: 's_sneeu_one.mp3', loop: false, volume: 0.45 },
    sneeuTwee: { pad: 's_sneeu_two.mp3', loop: false, volume: 0.45 },
    sneeuDrie: { pad: 's_sneeu_three.mp3', loop: false, volume: 0.45 },
    vlakKlaarEen: { pad: 's_level_done_one.mp3', loop: false, volume: 1 },
    vlakKlaarTwee: { pad: 's_level_done_two.mp3', loop: false, volume: 1 },
  };
  const omgewingElemente = {}; // naam -> HTMLAudioElement, lui geskep+gekas
  function kryOmgewingEl(naam) {
    let el = omgewingElemente[naam];
    if (!el) {
      const cfg = OMGEWING_LEERS[naam];
      el = new Audio(SKRIP_BASIS + cfg.pad);
      el.preload = 'auto';
      el.loop = cfg.loop;
      el.volume = cfg.volume;
      omgewingElemente[naam] = el;
    }
    return el;
  }
  // Eenmalige omgewingsklank (sone-geur, vlak-klaar-fanfare): begin altyd
  // van voor af.
  function speelEenmaligOmgewing(naam) {
    if (stil) return;
    const el = kryOmgewingEl(naam);
    el.currentTime = 0;
    speelMetOntsluit(el);
  }
  // Kaart 7-vervolg (2026-08-21): infasering vir die rivier-agtergrondlus
  // (gebruiker-versoek). Gewone <audio>-elemente het nie 'n ingeboude
  // volume-oorgang nie, dus 'n eenvoudige requestAnimationFrame-helling.
  // 'n Oplopende "fase-id" op die element self laat 'n nuwe (of 'n stop)
  // enige reeds-lopende infasering ongeldig maak, sodat 'n vinnige
  // speel/stop-opeenvolging nie oor mekaar veg nie.
  function faseInVolume(el, teikenVolume, duurMs) {
    const eieId = (el._faseId = (el._faseId || 0) + 1);
    const t0 = performance.now();
    el.volume = 0;
    (function stap(nou) {
      if (el._faseId !== eieId) return; // oorheers deur 'n nuwer fase/stop
      const t = Math.min(1, (nou - t0) / duurMs);
      el.volume = teikenVolume * t;
      if (t < 1) requestAnimationFrame(stap);
    })(t0);
  }
  // Rivier-agtergrondlus: "speel terwyl die speler speel" (gebruiker-
  // versoek). Word op ELKE uitkoms (sukses óf mislukking) gestop
  // (app.js se verwerkUitkomste()) en hier weer van voor af begin in die
  // volgende beginPoging() -- die "as dit nie reeds speel nie"-wagter is
  // dus meestal 'n stil geen-effek (dit sal byna altyd reeds gestop wees),
  // maar bly 'n veilige verstek as speelRivierAmbient() ooit direk geroep
  // word terwyl dit per ongeluk nog loop. Faseer elke keer in oor 2s
  // (gebruiker-versoek: "fade the water in").
  function speelRivierAmbient() {
    if (stil) return;
    const el = kryOmgewingEl('rivier');
    if (!el.paused) return;
    faseInVolume(el, OMGEWING_LEERS.rivier.volume, 2000);
    speelMetOntsluit(el);
  }
  function stopRivierAmbient() {
    const el = omgewingElemente.rivier;
    if (!el) return;
    el._faseId = (el._faseId || 0) + 1; // kanselleer enige lopende infasering
    el.pause();
    el.currentTime = 0;
  }

  // Kaart 9-regstelling: 'n toggle na stil het voorheen net TOEKOMSTIGE
  // klanke geblokkeer (speelBlafLeer/speelEenmaligOmgewing se "if (stil)
  // return;") -- enigiets wat REEDS speel (veral die lang rivier-
  // agtergrondlus) het eenvoudig uitgespeel. Nou pouseer 'n toggle na stil
  // dadelik alles wat al geskep is (blafElemente + omgewingElemente, plus 'n
  // lopende Web Audio-konteks vir speelMatKlok()), sodat "stil" werklik
  // onmiddellik stil beteken.
  function stelStil(v) {
    stil = !!v;
    localStorage.setItem(STIL_SLEUTEL, stil ? '1' : '0');
    if (stil) {
      for (const el of Object.values(blafElemente)) { try { el.pause(); } catch (e) { /* stilweg ignoreer */ } }
      for (const el of Object.values(omgewingElemente)) { try { el.pause(); } catch (e) { /* stilweg ignoreer */ } }
      if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) { /* stilweg ignoreer */ } }
    }
  }
  function isStil() { return stil; }

  // Kaart 7-vervolg: Kapok se drie regte blaf-opnames.
  function speelOpgaanBlaf() { speelBlafLeer('opgaan'); }     // geslaagde klim, binne dieselfde sone
  function speelAfgaanBlaf() { speelBlafLeer('afgaan'); }     // mislukking (daal)
  function speelNuweBioomBlaf() { speelBlafLeer('nuweBioom'); } // geslaagde klim wat 'n nuwe sone binnegaan
  // Kaart 7-vervolg (2026-08-20): vervang die twee laaste gesintetiseerde klanke.
  function speelWenkBlaf() { speelBlafLeer('wenkBlaf'); }     // wenk-hokkleure kom aan (§2.7) -- opgaan-blaf, 75% volume
  function speelAfkomsKlank() { speelBlafLeer('afkoms'); }    // tydens die openingsafkoms

  // Kaart 7-vervolg: sone-geur-eenmaligklanke (op gekose sporte, sien app.js).
  function speelMoerasKlank() { speelEenmaligOmgewing('moeras'); }
  function speelWoudKlank() { speelEenmaligOmgewing('woud'); }
  function speelRotseKlank() { speelEenmaligOmgewing('rotse'); }
  function speelSneeuEenKlank() { speelEenmaligOmgewing('sneeuEen'); }
  function speelSneeuTweeKlank() { speelEenmaligOmgewing('sneeuTwee'); }
  function speelSneeuDrieKlank() { speelEenmaligOmgewing('sneeuDrie'); }
  // Kaart 7-vervolg: "vlak-klaar"-fanfare -- vervang Kapok se blaf wanneer 'n
  // mat met "Wys my hoe" (die wenk) aan behaal word (geen klim gebeur dan
  // nie, sien app.js se voltooiUitkomste()).
  function speelVlakKlaarEen() { speelEenmaligOmgewing('vlakKlaarEen'); }
  // Kaart 10-nota: speelVlakKlaarTwee() se oorspronklike rol (die "tweede
  // stadium" van 'n nou-laat-vaar-de twee-stadium skoon-herhaling-reël ná 'n
  // wenk) bestaan nie meer nie -- die wenkstelsel is vereenvoudig na een
  // enkele reël (enige wenk-aangeholpe mat vorder nie; sien vorderRung in
  // app.js). Nie meer vanuit app.js geroep nie, maar hier behou (ongebruik)
  // ingeval 'n toekomstige ontwerp weer 'n tweede fanfare-oomblik nodig het.
  function speelVlakKlaarTwee() { speelEenmaligOmgewing('vlakKlaarTwee'); }

  // Kaart 7-vervolg (2026-08-20, herroep): mat-klokkie teruggebring as
  // veiligheidsnet -- gesintetiseer (soos oorspronklik), aangesien geen
  // opname vir hierdie spesifieke leemte-geval verskaf is nie. Twee note
  // (kwint), kort vervalomhulsel.
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

  root.Klank = {
    speelAfkomsKlank, speelWenkBlaf,
    speelOpgaanBlaf, speelAfgaanBlaf, speelNuweBioomBlaf,
    speelMatKlok,
    speelRivierAmbient, stopRivierAmbient,
    speelMoerasKlank, speelWoudKlank, speelRotseKlank,
    speelSneeuEenKlank, speelSneeuTweeKlank, speelSneeuDrieKlank,
    speelVlakKlaarEen, speelVlakKlaarTwee,
    stelStil, isStil,
  };
})(typeof window !== 'undefined' ? window : this);
