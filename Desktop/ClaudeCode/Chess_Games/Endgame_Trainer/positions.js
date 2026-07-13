// ─── Skaakmat Afrigter — Posisies Databasis ──────────────────────────────────
// Alle 20 eindspel-tipes is gedefinieer sodat die kenteken-kaart van die begin
// af volledig vertoon. Posisies (FENs) word per tipe bygevoeg soos elke sprint
// voltooi word.
//
// Tier bewegingsgrense: brons = 12 volle beurte, silwer = 24, goud = 36
// "Volle beurt" = een wit-skuif + een swart-reaksie

const ENDGAME_TYPES = [
  { id: 1,  name: 'Koning & Koningin teen Koning',     icon: '♛' },
  { id: 2,  name: 'Koning & Toring teen Koning',        icon: '♜' },
  { id: 3,  name: 'Koning & Twee Lopers teen Koning',   icon: '♝' },
  { id: 4,  name: 'Koning, Loper & Ruiter teen Koning', icon: '🐴' },
  { id: 5,  name: 'Koning & Twee Ruiters teen Koning',  icon: '🏇' },
  { id: 6,  name: 'Koning & Pion teen Koning',          icon: '♟' },
  { id: 7,  name: 'Verbygeraakte Pion Wedren',          icon: '🏁' },
  { id: 8,  name: 'Opposisie & Koningaktiwiteit',       icon: '👑' },
  { id: 9,  name: 'Zugzwang',                           icon: '⚡' },
  // Tipe 10 (Driehoeksbeweging) permanent gesny (Opdrag 6b) — sien CLAUDE.md.
  { id: 11, name: 'Piondeurbraak',                      icon: '💥' },
  { id: 12, name: 'Buitenste Verbygeraakte Pion',       icon: '🎯' },
  { id: 13, name: 'Lucena-posisie',                     icon: '🏛️' },
  { id: 14, name: 'Philidor-posisie',                   icon: '📐' },
  { id: 15, name: 'Toring Agter Verbygeraakte Pion',    icon: '🚂' },
  { id: 16, name: 'Aktiewe vs Passiewe Toring',         icon: '⚔️' },
  { id: 17, name: 'Goeie Loper vs Slegte Loper',        icon: '🌓' },
  { id: 18, name: 'Loper teen Ruiter',                  icon: '🐎' },
  { id: 19, name: 'Verkeerde Kleur Loper',              icon: '🔲' },
  { id: 20, name: 'Koningin teen Pion op 7de Ry',       icon: '🎖️' },
]

// ─── Tier-konfigurasie ────────────────────────────────────────────────────────
const TIERS = {
  bronze: { label: 'Brons',  moveLimit: 12, hintMoveLimit: null }, // wenke altyd beskikbaar
  silver: { label: 'Silwer', moveLimit: 24, hintMoveLimit: 10   }, // wenke vir eerste 10 skuiwe
  gold:   { label: 'Goud',   moveLimit: 36, hintMoveLimit: 0    }, // geen wenke
}
const TIER_ORDER = ['bronze', 'silver', 'gold']

// ─── Posisie Databasis ────────────────────────────────────────────────────────
// Struktuur: POSITIONS[typeId] = { bronze: [...], silver: [...], gold: [...] }
// Elke posisie: { fen, note }
//
// Wit speel altyd. Alle FENs is met die hand geverifieer.
// Moontlikheidsraming (ideale skuiwe tot mat): brons ≈ 6–8, silwer ≈ 12–18, goud ≈ 20–28

const POSITIONS = {

  // ── Tipe 1: Koning & Koningin teen Koning ─────────────────────────────────
  // Tegniek: gebruik die koningin om die swart koning af te kap en hoek toe te dryf;
  // lewer mat met koningsteun. Grootste gevaar: toevallige pat.
  1: {
    bronze: [
      // B1: Kd1 Qf1 vs Ke5 — beide konings sentraal, goeie beginpunt
      { fen: '8/8/8/4k3/8/8/8/3K1Q2 w - - 0 1',
        note: 'Klassieke sentrale posisie — dryf die swart koning na die rand', moveLimit: 14 },
      // B2: Kc1 Qd2 vs Kc4 — konings op dieselfde kolom
      { fen: '8/8/8/8/2k5/8/3Q4/2K5 w - - 0 1',
        note: 'Konings op dieselfde kolom — dryf swart se koning na die rand' },
      // B3: Kd1 Qg2 vs Kd3 — konings baie naby mekaar
      { fen: '8/8/8/8/8/3k4/6Q1/3K4 w - - 0 1',
        note: 'Konings naby mekaar — kortste pad tot mat' },
      // B4: Kf3 Qa1 vs Kg6 — koningin ver, moet afkap
      { fen: '8/8/6k1/8/8/5K2/8/Q7 w - - 0 1',
        note: 'Koningin ver weg — kap eers die swart koning af' },
      // B5: Kc3 Qf4 vs Ka6 — swart koning naby die rand
      { fen: '8/8/k7/8/5Q2/2K5/8/8 w - - 0 1',
        note: 'Swart koning naby die rand — klaar halfpad' },
    ],
    silver: [
      // S1: Ka2 Qg1 vs Ke5 — koningin in die hoek, langer roete
      { fen: '8/8/8/4k3/8/8/K7/6Q1 w - - 0 1',
        note: 'Koningin in die hoek — moet eers sentraal speel' },
      // S2: Kb1 Qh8 vs Kd5 — koningin ver van die aksie
      { fen: '7Q/8/8/3k4/8/8/8/1K6 w - - 0 1',
        note: 'Koningin aan die oorkant van die bord' },
      // S3: Ka1 Qh4 vs Kd6 — beide stukke ver van swart koning
      { fen: '8/8/3k4/8/7Q/8/8/K7 w - - 0 1',
        note: 'Beide stukke ver weg — vereis beplanning' },
    ],
    gold: [
      // G1: Ka1 Qh1 vs Kd4 — koningin op agterste ry, langer tegniek
      { fen: '8/8/8/8/3k4/8/8/K6Q w - - 0 1',
        note: 'Koningin op agterste ry — vereis akkurate spel' },
      // G2: Kd1 Qa7 vs Ke4 — koningin ver weg
      { fen: '8/Q7/8/8/4k3/8/8/3K4 w - - 0 1',
        note: 'Koningin ver weg van die aksie — vereis langste tegniek' },
    ],
  },

  // ── Tipe 2: Koning & Toring teen Koning ───────────────────────────────────
  // Tegniek: gebruik die toring om die swart koning af te kap op 'n ry of kolom,
  // bring dan die wit koning nader, en dryf die swart koning na die rand.
  // Grootste gevaar: pat (soos by KQ vs K).
  2: {
    bronze: [
      // B1: Ka5 (rand), Kb2, Rh1 — swart koning naby rand, wit kan vinnig afkap
      { fen: '8/8/8/k7/8/8/1K6/7R w - - 0 1',
        note: 'Swart koning naby die a-rand — kap hom af met die toring', moveLimit: 16 },
      // B2: Ka4, Kd2, Rh1 — swart koning aan die rand, wit speelruimte
      { fen: '8/8/8/8/k7/8/3K4/7R w - - 0 1',
        note: 'Toring op die agterste ry — dryf swart na die hoek', moveLimit: 16 },
      // B3: Ka3, Kd2, Rh1 — soortgelyk, 'n rang verder
      { fen: '8/8/8/8/8/k7/3K4/7R w - - 0 1',
        note: "Swart net 'n rang van die hoek — koordineer koning en toring", moveLimit: 16 },
      // B4: Ka2, Kd2, Rh1 — swart op dieselfde rang as wit (maklik gespeel)
      { fen: '8/8/8/8/8/8/k2K4/7R w - - 0 1',
        note: 'Konings op dieselfde rang — toring kap die rand af' },
      // B5: Kc4, Ka1, Rd1 — toring op d-kolom, swart naby die hoek
      { fen: '8/8/8/8/2k5/8/8/K2R4 w - - 0 1',
        note: 'Toring op d1, swart naby die hoek — bring die wit koning nader', moveLimit: 19 },
    ],
    silver: [
      // S1: Kd5 (sentraal), Kd2, Rh1 — standaard sentraal posisie
      { fen: '8/8/8/3k4/8/8/3K4/7R w - - 0 1',
        note: 'Swart sentraal — dryf hom eers na die rand' },
      // S2: Kd6, Kd2, Ra1 — toring in hoek, langer roete
      { fen: '8/8/3k4/8/8/8/3K4/R7 w - - 0 1',
        note: 'Toring in die hoek — sentreer dit eers' },
      // S3: Kd4, Ka1, Rh1 — konings ver uitmekaar, toring op h-kolom
      { fen: '8/8/8/8/3k4/8/8/K6R w - - 0 1',
        note: 'Wit koning ver — vereis koördinasie oor die hele bord' },
    ],
    gold: [
      // G1: Ke7 (ver kant), Ke2, Ra1 — konings regoor mekaar, toring in hoek
      { fen: '8/4k3/8/8/8/8/4K3/R7 w - - 0 1',
        note: 'Konings ver uiteen op dieselfde kolom — langste afstand' },
      // G2: Kd7, Kd2, Ra1 — soortgelyk op d-kolom
      { fen: '8/3k4/8/8/8/8/3K4/R7 w - - 0 1',
        note: 'Maksimum afstand — toring en koningsteun nodig' },
    ],
  },

  // ── Tipe 6: Koning & Pion teen Koning ─────────────────────────────────────
  // Tegniek: bring die wit koning op die sleutelblokkie voor die pion;
  // dryf die pion tot bevordering. Groot gevaar: pat (veral met toring-pion).
  // Alle posisies gebruik middelste pione (d of e) om patgevaar te beperk.
  // Opdrag 6: alle tien re-getag na 'promote' (die K+D-mat wat volg is Fase-1-
  // eiendom; dit elke ronde te herhaal is herhaling, nie leer nie). Limiete
  // herbereken uit selfspel-uitrol × 60/75/85%-begrotingsreël (sien
  // Opdrag_06_Pioneindspele.md §1) — mat-era-limiete (14-17) laat vaar.
  6: {
    bronze: [
      // B1: Pd7, Kc6, Kd1 — pion 'n stap van bevordering, wit koning ondersteun
      // Uitrol: bevorder wit-skuif 3. Begroting (60%): limiet 6 (3/6=50%, gemaklik binne).
      { fen: '8/3P4/2K5/8/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 7de ry, een stap van sy sleutelblokkie — bevorder!',
        winCondition: 'promote', moveLimit: 6 },
      // B2: Pe7, Kd6, Kg1 — e-pion op 7de, swart koning ver
      // (Swart koning verskuif van e1 na g1 — Opdrag 6 se vertaling-bewuste
      // duplikaat-skandering het B1/B2 as eksakte lêer-skuif-tweelinge gevind.)
      // Uitrol: bevorder wit-skuif 3.
      { fen: '8/4P3/3K4/8/8/8/8/6k1 w - - 0 1',
        note: 'e-pion byna tuis — pasop vir pat, dan bevorder',
        winCondition: 'promote', moveLimit: 6 },
      // B3: Kd6, Pe6, Kd1 — pion op 6de met wit koning voor hom
      // Uitrol: bevorder wit-skuif 3. Begroting (60%): limiet 6.
      { fen: '8/8/3KP3/8/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 6de ry — die koning lei, twee stappe tot sy sleutelblokkie',
        winCondition: 'promote', moveLimit: 6 },
      // B4: Ke6, Pf6, Kc1 — f-pion op 6de, wit koning op sleutelblokkie
      // (Swart koning verskuif van e1 na c1 — Opdrag 6 se vertaling-bewuste
      // duplikaat-skandering het B3/B4 as eksakte lêer-skuif-tweelinge gevind.)
      // Uitrol: bevorder wit-skuif 4. Begroting (60%): limiet 8.
      { fen: '8/8/4KP2/8/8/8/8/2k5 w - - 0 1',
        note: 'f-pion, wit koning al voor die pion op sy sleutelblokkie — bevorder!',
        winCondition: 'promote', moveLimit: 8 },
      // B5: Kd6, Pd5, Kd1 — pion op 5de met aktiewe wit koning
      // Uitrol: bevorder wit-skuif 6. Begroting (60%): limiet 11.
      { fen: '8/8/3K4/3P4/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 5de, wit koning aktief — drie sleutelblokkies tot bevordering',
        winCondition: 'promote', moveLimit: 11 },
    ],
    silver: [
      // S1: Kd5, Pe5, Kd1 — pion op 5de, wit koning op sleutelblokkie
      // Uitrol: bevorder wit-skuif 4. Begroting (75%): limiet 7.
      { fen: '8/8/8/3KP3/8/8/8/3k4 w - - 0 1',
        note: 'Wit koning op sleutelblokkie — gebruik jou voordeel',
        winCondition: 'promote', moveLimit: 7 },
      // S2: Kd4, Pe4, Kd1 — pion op 4de, moet nog vooruitbeweeg
      // Uitrol: bevorder wit-skuif 9. Begroting (75%): limiet 13.
      { fen: '8/8/8/8/3KP3/8/8/3k4 w - - 0 1',
        note: 'Pion op die 4de ry — die koning lei na die volgende sleutelblokkie',
        winCondition: 'promote', moveLimit: 13 },
      // S3: Kd3, Pe3, Kd1 — pion op 3de, swart koningsteun nodig
      // Uitrol: bevorder wit-skuif 8. Begroting (75%): limiet 12.
      { fen: '8/8/8/8/8/3KP3/8/3k4 w - - 0 1',
        note: 'Pion op die 3de ry — sleutelblok-teorie in aksie, stap vir stap',
        winCondition: 'promote', moveLimit: 12 },
    ],
    gold: [
      // G1: Ka2, Pd3, Kf2 — wit koning op a2, swart NIE voor die pion nie
      // Uitrol: bevorder wit-skuif 6. Begroting (85%): limiet 9.
      { fen: '8/8/8/8/8/3P4/K4k2/8 w - - 0 1',
        note: 'Wit koning op a2 — bereik d6 se sleutelblokkie voordat swart die pion blokkeer',
        winCondition: 'promote', moveLimit: 9 },
      // G2: Kd3, Pd4, Kf1 — wit koning naas die pion, swart ver (nie voor nie)
      // Uitrol: bevorder wit-skuif 5. Begroting (85%): limiet 7.
      { fen: '8/8/8/8/3P4/3K4/8/5k2 w - - 0 1',
        note: 'Wit koning naas pion op d4 — bereik die sleutelblokkie (d6) voor swart',
        winCondition: 'promote', moveLimit: 7 },
    ],
  },

  // ── Tipe 3: Koning & Twee Lopers teen Koning ──────────────────────────────
  // Tegniek: dryf die swart koning na die rand, dan na 'n hoek met die regte
  // kleur. Gebruik beide lopers saam om die vlug-sones te beperk.
  // BELANGRIK: lopers MOET op verskillende kleure wees (Bc1=donker + Bf1=lig).
  3: {
    bronze: [
      // B1: Ka8 vs Kc6 Bc8(lig) Bc7(donker) — swart gevang, mat ~5 skuiwe
      // Ka8 nie in skaak nie; Bc8(lig,c+8=11√) Bc7(donker,c+7=10√)
      // Konings: c6 vs a8 = afstand 2 (nie adjacent nie) √
      { fen: 'k1B5/2B5/2K5/8/8/8/8/8 w - - 0 1',
        note: 'Swart sit vasgevang by a8 — sluit die mat af!' },
      // B2: Ka8 vs Kb6 Bc8(lig) Bc7(donker) — wit koning nader, mat ~4 skuiwe
      // Konings: b6 vs a8 = afstand 2 (|b-a|=1, |6-8|=2) √
      // AFGETREE 2026-07-09: mat-in-1 waar 12/19 wettige skuiwe onmiddellik pat
      // gee — as ongemerkte brons-posisie is dit 'n slaggat, nie 'n les nie.
      { fen: 'k1B5/2B5/1K6/8/8/8/8/8 w - - 0 1',
        note: 'Wit koning by b6 — een skuif meer en swart is gemat',
        retired: true },
      // B3: Ka8 vs Kc7 Bd8(donker,d+8=12√) Ba6(lig,a+6=7√) — ander hoekmat
      // Konings: c7 vs a8 = afstand 2 (|c-a|=2, |7-8|=1) √
      { fen: 'k2B4/2K5/B7/8/8/8/8/8 w - - 0 1',
        note: 'Lopers op d8 en a6 sluit die hoek toe — vind die mat!' },
    ],
    silver: [
      // S1: Kd1 Bc1 Bf1 vs Kd5 — swart sentraal, langer herding
      { fen: '8/8/8/3k4/8/8/8/2BK1B2 w - - 0 1',
        note: 'Swart in die sentrum — dryf eers na die rand' },
      // S2: Kd1 Bc1 Bf1 vs Kd7 — swart naby die rand
      { fen: '8/3k4/8/8/8/8/8/2BK1B2 w - - 0 1',
        note: 'Swart naby die rand — gebruik die lopers om die hoek toe te dryf' },
      // S3: Kd1 Bc1 Bf1 vs Ke4 — swart meer sentraal
      { fen: '8/8/8/8/4k3/8/8/2BK1B2 w - - 0 1',
        note: 'Swart aktief in die sentrum — vereis presisie' },
    ],
    gold: [
      // G1: Ka1 Bc1(donker) Bf1(lig) vs Ke5 — wit koning ver in hoek
      { fen: '8/8/8/4k3/8/8/8/K1B2B2 w - - 0 1',
        note: 'Wit koning in die hoek — alles moet saamwerk' },
      // G2: Ka1 Bc1 Bf1 vs Kh8 — maksimum afstand
      { fen: '7k/8/8/8/8/8/8/K1B2B2 w - - 0 1',
        note: 'Maksimum afstand — die langste twee-loper-eindspel' },
    ],
  },

  // ── Tipe 20: Koningin teen Pion op 7de Ry ─────────────────────────────────
  // Tegniek: gebruik die koningin om die swart koning in "skaak-en-dwing"-modus
  // voor sy eie pion te forseer terwyl die wit koning nader beweeg.
  // Werk goed teen d- en e-pione; rante- en f-pione kan soms gelykspel gee.
  20: {
    bronze: [
      // B1: Kd4 Qa1 vs pd2 Ke2 — wit koning al op die 4de ry
      { fen: '8/8/8/8/3K4/8/3pk3/Q7 w - - 0 1',
        note: 'Wit koning al naby — gebruik die koningin om pion te stop' },
      // B2: Ke4 Qa1 vs pe2 Kf2 — e-pion variant
      { fen: '8/8/8/8/4K3/8/4pk2/Q7 w - - 0 1',
        note: 'e-pion variant — skaak-en-dwing tegniek' },
      // B3: Kd4 Qa1 vs pe2 Kf2 — koningin in hoek, kort pad
      { fen: '8/8/8/8/3K4/8/4pk2/Q7 w - - 0 1',
        note: 'Koningin in die hoek, wit koning aktief — geforseerde wen', moveLimit: 17 },
    ],
    silver: [
      // S1: Kd5 Qa1 vs pd2 Ke2 — wit koning 'n ry verder
      { fen: '8/8/8/3K4/8/8/3pk3/Q7 w - - 0 1',
        note: "Wit koning op die 5de ry — nog 'n ronde skaak-en-dwing nodig" },
      // S2: Kd5 Qa1 vs pe2 Kf2 — e-pion, wit koning op 5de ry
      { fen: '8/8/8/3K4/8/8/4pk2/Q7 w - - 0 1',
        note: 'e-pion met wit koning verder weg — presisie vereis' },
      // S3: Ke5 Qa1 vs pe2 Kf2 — sentrale wit koning
      { fen: '8/8/8/4K3/8/8/4pk2/Q7 w - - 0 1',
        note: 'Wit koning sentraal op 5de ry — aktiewe koningspel' },
    ],
    gold: [
      // G1: Ke8 Qa1 vs pd2 Ke2 — wit koning op die oorkant van die bord
      { fen: '4K3/8/8/8/8/8/3pk3/Q7 w - - 0 1',
        note: 'Wit koning op die 8ste ry — lank pad terug, baie skaak-en-dwing' },
      // G2: Ka1 Qh1 vs pd2 Ke2 — koningin agter, koning ver
      { fen: '8/8/8/8/8/8/3pk3/K6Q w - - 0 1',
        note: 'Wit koningin en koning in teenoorgestelde hoeke — die moeilikste variant' },
    ],
  },

  // ── Tipe 4: Koning, Loper & Ruiter teen Koning ────────────────────────────
  // Tegniek: dryf die swart koning na die hoek van DIE SELFDE KLEUR as die loper.
  // Lig-loper (Bc8/Bf1 ens.) → mat by a8 of h1.
  // Gebruik die "W-maneuver" met die ruiter om die swart koning te forseer.
  // Brons-posisies begin al met swart in die hoek — minder as 12 skuiwe tot mat.
  4: {
    bronze: [
      // B1: Bc8(lig), Kc7, Nd6 vs Ka8 — swart in die lig-hoek, byna gemat
      { fen: 'k1B5/2K5/3N4/8/8/8/8/8 w - - 0 1',
        note: 'Swart gevang by a8 — forseer mat met loper en ruiter' },
      // B2: Bg4(lig), Ne3, Kg3 vs Kh1 — swart in h1-hoek, byna gemat
      { fen: '8/8/8/8/6B1/4N1K1/8/7k w - - 0 1',
        note: 'Swart vasgevang by h1 — ruiter en loper saamwerk' },
      // B3: Bh3(lig), Nf4, Kf3 vs Kh1 — alternatiewe aanvalshoek
      { fen: '8/8/8/8/5N2/5K1B/8/7k w - - 0 1',
        note: 'Swart in die hoek — loper op h3 versper die ontsnapping' },
    ],
    silver: [
      // S1: Ba2(lig), Nd5, Ke4 vs Kh5 — swart op die rand, ver van regte hoek
      { fen: '8/8/8/3N3k/4K3/8/B7/8 w - - 0 1',
        note: 'Swart op die rand — dryf hom na die lig-hoek (a8 of h1)' },
      // S2: Bf1(lig), Ng1, Ka1 vs Kd5 — swart sentraal, wit in hoek
      // AFGETREE 2026-07-09: eksakte DTM 31/29 — goud-diepte materiaal, nie silwer nie.
      // Vervang deur twee nuwe silwers hieronder (Opdrag 3).
      { fen: '8/8/8/3k4/8/8/8/K4BN1 w - - 0 1',
        note: 'Swart in die sentrum — begin die herding met ruiter voor',
        retired: true },
      // S3: Be2(lig), Nd3, Kc1 vs Kf6 — swart op die 6de ry
      // AFGETREE 2026-07-09: eksakte DTM 31/29 — goud-diepte materiaal, nie silwer nie.
      // Vervang deur twee nuwe silwers hieronder (Opdrag 3).
      { fen: '8/8/5k2/8/8/3N4/4B3/2K5 w - - 0 1',
        note: 'Swart op die 6de ry — koördineer al drie stukke',
        retired: true },
      // S4: Kg4 Ba3(donker) Nc8 vs Kg7 — nuut, Opdrag 3. Vervang S2.
      // Gegenereer-en-geverifieer: tabelbasis DTM=14 (binne silwer-begroting 18.0),
      // C4 0/19 pat-slaggate, swart koning 8 wettige skuiwe by die begin, geen
      // duplikaat nie. Enjin se beste lyn: 1.Kf5! (koning-sentralisasie).
      { fen: '2N5/6k1/8/8/6K1/B7/8/8 w - - 0 1',
        note: 'Donker-vierkant loper — dryf swart na die a1- of h8-hoek. Begin met 1.Kf5! om die koning te sentraliseer' },
      // S5: Kc5 Bg2(lig) Ne6 vs Kh2 — nuut, Opdrag 3. Vervang S3.
      // Gegenereer-en-geverifieer: tabelbasis DTM=17 (binne silwer-begroting 18.0),
      // C4 0/24 pat-slaggate, swart koning 5 wettige skuiwe by die begin, geen
      // duplikaat nie. Enjin se beste lyn: 1.Bf3! (loper herposisioneer).
      { fen: '8/8/4N3/2K5/8/8/6Bk/8 w - - 0 1',
        note: 'Lig-vierkant loper — dryf swart na die a8- of h1-hoek. Begin met 1.Bf3! om die loper te herposisioneer' },
    ],
    gold: [
      // G1: Bd3(lig), Nc3, Ka2 vs Ke6 — swart sentraal, langste roete
      { fen: '8/8/4k3/8/8/2NB4/K7/8 w - - 0 1',
        note: 'Swart sentraal — die volle KLR-tegniek van die begin af' },
      // G2: Bg2(lig), Nf1, Ka1 vs Kd6 — wit kluster in hoek, swart vry
      { fen: '8/8/3k4/8/8/8/6B1/K4N2 w - - 0 1',
        note: 'Wit stukke in die hoek — vereis presisie oor die hele bord' },
    ],
  },

  // ── Tipe 9: Zugzwang ───────────────────────────────────────────────────────
  // Kontrak (Opdrag 6): Die wagskuif wen — die natuurlike, aktiewe skuif gooi
  // die wen weg; net stil geduld werk. Alle aktiewe posisies C5-strict-
  // gesertifiseer (presies 1 wen-skuif, minstens een natuurlike faal-skuif).
  9: {
    bronze: [
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 2 wen-skuiwe (Ke6,Kc6) > drempel 1.
      { fen: '3k4/8/3K4/3P4/8/8/8/8 w - - 0 1',
        note: 'Kc6! — swart moet die weg vrygee en die pion bevorder', moveLimit: 22,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 2 wen-skuiwe (Kf6,Kd6) > drempel 1.
      { fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        note: 'Kf6! plaas swart in zugzwang — die pion kan nie gestop word nie', moveLimit: 22,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 5 wen-skuiwe (Kd7,Kc7,Kd6,Kb6,Kd5) > drempel 1.
      { fen: 'k7/8/2K5/2P5/8/8/8/8 w - - 0 1',
        note: 'Kb6! — swart in die hoek, pion bevorder onvermydelik', moveLimit: 22,
        retired: true },
      // ── Opdrag 6 herbou: 3 nuwe brons, C5-strict-gesertifiseer (presies 1 wen-skuif) ──
      // B4: Ke5 Pd3 vs Kd7 — C5S: 1 wen-skuif (Kd5); natuurlike faal: Kf6, Kf5.
      // Uitrol: bevorder wit-skuif 8. Begroting (60%): limiet 15.
      { fen: '8/3k4/8/4K3/8/3P4/8/8 w - - 0 1',
        note: 'Die wagskuif wen — Kd5! plaas swart in zugzwang. Enige ander koningskuif gee dit weg',
        winCondition: 'promote', moveLimit: 15 },
      // B5: Kc3 Pd4 vs Kd5 — C5S: 1 wen-skuif (Kd3); natuurlike faal: Kb4, Kb3.
      // (Oorspronklike keuse — Kc4 Pb4 vs Kc7 — het gebots met T8 Goud #3,
      // eksak dieselfde posisie; vervang deur die vertaling-bewuste
      // duplikaat-skandering, Opdrag 6 §2.)
      // Uitrol: bevorder wit-skuif 18. Begroting (60%): limiet 31.
      { fen: '8/8/8/3k4/8/2K5/3P4/8 w - - 0 1',
        note: 'Kd3! — die stil skuif wat wen. Swart het geen goeie antwoord nie',
        winCondition: 'promote', moveLimit: 31 },
      // B6: Kf3 Pf4 vs Kh7 — C5S: 1 wen-skuif (Ke4); natuurlike faal: Kg4, Kg3.
      // Uitrol: bevorder wit-skuif 14. Begroting (60%): limiet 25.
      { fen: '8/7k/8/8/5P2/5K2/8/8 w - - 0 1',
        note: 'Ke4! — geduld wen. Kg4 of Kg3 lyk aktief maar gooi dit weg',
        winCondition: 'promote', moveLimit: 25 },
    ],
    silver: [
      // S1 ("die pêrel"): Kd4 Pd5 vs Kf6 — Kc5 is die enigste wen-skuif (eng.-
      // geverifieer, Opdrag 3 §2d); ALLE ander koningskuiwe (Ke4/Kc4/Ke3/Kd3/Kc3)
      // sowel as d6 gee gelykspel. Ou nota het "Kd5!" aanbeveel — onwettig (wit
      // se eie pion staan op d5). Reggestel 2026-07-09. Bly onveranderd
      // (Opdrag 6: die sjabloon) — slegs re-getag na promote en herlimiet.
      // Uitrol: bevorder wit-skuif 7. Begroting (75%): limiet 11.
      { fen: '8/8/5k2/3P4/3K4/8/8/8 w - - 0 1',
        note: 'Kc5! — die enigste wen-skuif. Enige ander koningskuif of d6 gee gelykspel. Waarom werk juis hierdie een?',
        winCondition: 'promote', moveLimit: 11 },
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW — swart hou die opposisie.
      { fen: '8/8/8/4k3/4P3/4K3/8/8 w - - 0 1',
        note: 'Kd4! — nader via die d-lêer. Hoekom maak die kant saak?',
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW — swart hou die opposisie.
      { fen: '8/8/8/2k5/2P5/2K5/8/8 w - - 0 1',
        note: 'Hoe nader jy die sleutelblokkie as die direkte pad geblokkeer is?',
        retired: true },
      // ── Opdrag 6 herbou: 2 nuwe silwer, ryker materiaal (K+2P teen K+P) ──
      // S2: Kc3 Pa3 Pd4 vs Kb5 pd5 — geblokkeerde hoofpaar d4/d5, wit se
      // ekstra pion op a3 is die egte wenmiddel. C5S: 1 wen-skuif (Kb3);
      // natuurlike faal: Kd3. Uitrol: bevorder wit-skuif 17. Begroting (75%): limiet 24.
      { fen: '8/8/8/1k1p4/3P4/P1K5/8/8 w - - 0 1',
        note: 'Twee pionne teen een — maar dis steeds die wagskuif wat wen. Kb3! plaas swart in zugzwang',
        winCondition: 'promote', moveLimit: 24 },
      // S3: Kg4 Pf4 Ph3 vs Kh6 pf5 — geblokkeerde hoofpaar f4/f5, ekstra
      // pion op h3. C5S: 1 wen-skuif (Kh4); natuurlike faal: Kf4.
      // Uitrol: bevorder wit-skuif 20. Begroting (75%): limiet 28.
      { fen: '8/8/5p1k/5P2/6K1/7P/8/8 w - - 0 1',
        note: 'Kh4! — die stil skuif. Kf4 lyk natuurlik maar gee die opposisie weg',
        winCondition: 'promote', moveLimit: 28 },
    ],
    gold: [
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW — die trebuchet is 0.00 met wit aan die beurt.
      { fen: '8/8/3p1k2/3P4/4K3/8/8/8 w - - 0 1',
        note: 'Trebuchet! Pione vasgehaak — wit moet driehoeksvorm om die beurt aan swart te gee',
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW.
      { fen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
        note: 'Lang driehoeksbeweging — bereik die sleutelposisie met swart aan die beurt, dan bevorder',
        retired: true },
      // ── Opdrag 6 herbou: 2 nuwe goud, ryker materiaal, verste bord-afstand ──
      // G3: Kc4 Pa4 Pc5 vs Ka7 pc6 — C5S: 1 wen-skuif (Kd4); natuurlike faal: Kb4.
      // Uitrol: bevorder wit-skuif 9. Begroting (85%): limiet 12.
      { fen: '8/k7/2p5/2P5/P1K5/8/8/8 w - - 0 1',
        note: 'Tel die tempo\'s: wie se beurt maak eintlik saak hier? Kd4! is die enigste antwoord',
        winCondition: 'promote', moveLimit: 12 },
      // G4: Kf3 Pe4 Ph3 vs Kg5 pe5 — C5S: 1 wen-skuif (Kg3); natuurlike faal: Ke3.
      // Uitrol: bevorder wit-skuif 16. Begroting (85%): limiet 20.
      { fen: '8/8/8/4p1k1/4P3/5K1P/8/8 w - - 0 1',
        note: 'Herken eers wie se beurt saak maak — dan wen Kg3! die wagspeletjie',
        winCondition: 'promote', moveLimit: 20 },
    ],
  },

  // ── Tipe 10: Driehoeksbeweging ────────────────────────────────────────────
  // Kontrak (Opdrag 6): Verloor 'n tempo om die deur oop te maak — wederkerige
  // zugzwang bestaan, en wit moet na dieselfde posisie terugkeer met swart
  // aan die beurt. Alle vier vorige aktiewe posisies (B1, B2, S2, S3) is
  // C7-getoets en het GEFAAL — geen wederkerige-zugzwang-driehoeksiklus in
  // die tabelbasis-optimale lyn nie (bevestig deur meting, nie net oordeel
  // nie). Die tipe herbegin — sien tools/verification_report.md en die
  // skoonmaak-manifes vir die volledige soektog wat hiertoe gelei het.
  10: {
    bronze: [
      // AFGETREE 2026-07-11 (Opdrag 6): C7 ERROR — geen wederkerige-zugzwang-siklus
      // in die tabelbasis-optimale lyn nie.
      { fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
        note: "Direk vorentoe gee gelykspel — loop 'n driehoek om die beurt te verspil", moveLimit: 16,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C7 ERROR — geen wederkerige-zugzwang-siklus
      // in die tabelbasis-optimale lyn nie.
      { fen: '5k2/8/3K4/4P3/8/8/8/8 w - - 0 1',
        note: 'Wit voor die pion, swart sykant — loop die korrekte pad na die sleutelblokkie sonder pat', moveLimit: 16,
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): DTM=19 > limiet 16.
      { fen: '8/8/8/4k3/8/2K5/2P5/8 w - - 0 1',
        note: 'Swart hou opposisie teen direkte spel — vind die driehoek wat dit breek', moveLimit: 16,
        retired: true },
    ],
    silver: [
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW.
      { fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
        note: 'Swart op e5 hou opposisie — watter driehoek breek dit?',
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C7 ERROR — geen wederkerige-zugzwang-siklus
      // in die tabelbasis-optimale lyn nie.
      { fen: '8/8/2k5/8/8/2K5/2P5/8 w - - 0 1',
        note: 'Konings op dieselfde kolom — driehoek via b3–b4 om verby die blokkade te kom',
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C7 ERROR — geen wederkerige-zugzwang-siklus
      // in die tabelbasis-optimale lyn nie.
      { fen: '8/8/5k2/8/8/5K2/5P2/8 w - - 0 1',
        note: 'f-pion variant — identifiseer die driehoek en klim een ry op',
        retired: true },
    ],
    gold: [
      // G1: Kc1 Pd4 vs Kd6 — wit koning ver in die hoek, lang mars voor die driehoek kan werk;
      // Wit moet eers die pion se sleutelblokkie (c6/d6/e6) identifiseer, dan driehoeksvorm
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/8/3k4/8/3P4/8/8/2K5 w - - 0 1',
        note: 'Wit koning ver weg — bereik die regte sleutelblokkie met swart aan die beurt',
        retired: true },
      // G2: Ke1 Pe3 vs Ke5 — maksimum afstand op dieselfde kolom;
      // Wit moet twee keer driehoeksvorm: eerste ry win, dan weer sleutelblokkies klim
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/8/8/4k3/8/4P3/8/4K3 w - - 0 1',
        note: 'Maksimum afstand — die langste driehoeksbeweging-eindspel',
        retired: true },
    ],
  },

  // ── Tipe 8: Opposisie & Koningaktiwiteit ──────────────────────────────────
  // Kontrak (Opdrag 6): Opposisie is die sleutel tot die deur — die wen bestaan
  // net vir die speler wat die opposisie neem (of behou), verre opposisie by
  // goud ingesluit. Alle agt C5-strict-gesertifiseer (≤2 wen-skuiwe, minstens
  // een natuurlike koning-vorentoe skuif faal). Herbou van voor af nadat die
  // Opdrag-6-oudit al agt oorspronklike posisies (5B/3S, plus die 2 reeds-
  // afgetree goue) C5-strict laat faal het — sien die skoonmaak-manifes.
  8: {
    bronze: [
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kf6,Kf5,Kd5) > drempel 2.
      { fen: '8/3k4/8/4K3/4P3/8/8/8 w - - 0 1',
        note: 'Wit koning voor die pion — stap vir stap na die 6de ry, bevorder en lewer mat', moveLimit: 24,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kc7,Ke6,Kc6) > drempel 2.
      { fen: '4k3/8/3K4/3P4/8/8/8/8 w - - 0 1',
        note: 'Wit al op die 6de ry — een skuif na die sleutelblokkie, dan bevorder', moveLimit: 16,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kd6,Kf5,Kd5) > drempel 2.
      { fen: '8/5k2/8/4K3/4P3/8/8/8 w - - 0 1',
        note: 'Wit naby die sleutelblokkie — dryf swart opsy en bevorder', moveLimit: 16,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kd6,Kc6,Kb6) > drempel 2.
      { fen: '2k5/8/8/2K5/2P5/8/8/8 w - - 0 1',
        note: 'Kant-benadering — watter rigting vermy die pat-gevaar?', moveLimit: 16,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 5 wen-skuiwe (Ke7,Kd7,Kf6,Kd6,Kd5) > drempel 2.
      { fen: '6k1/8/4K3/4P3/8/8/8/8 w - - 0 1',
        note: 'Koningaktiwiteit — wit druk tot die 7de ry, swart het geen verweer nie', moveLimit: 16,
        retired: true },
      // ── Opdrag 6 herbou: agt nuwe posisies, C5-strict-gesertifiseer (≤2 wen-skuiwe) ──
      // B6: Kd4 Pc4 vs Kb6 — C5S: 1 wen-skuif (Kd5); natuurlike faal: Ke5, Ke4.
      // Uitrol: bevorder wit-skuif 8. Begroting (60%): limiet 15.
      { fen: '8/8/1k6/8/2PK4/8/8/8 w - - 0 1',
        note: 'Neem die opposisie met Kd5 — enige ander koningskuif gee dit vir swart',
        winCondition: 'promote', moveLimit: 15 },
      // B7: Kh4 Pg4 vs Kg7 — C5S: 1 wen-skuif (Kg5); natuurlike faal: Kh5.
      // Uitrol: bevorder wit-skuif 10 (selfspel-uitrol is movetime-gebaseer en
      // nie ten volle deterministies nie — 'n verse lopie kan 11 wys; limiet
      // bumped vir 'n gemakliker marge, Opdrag 6).
      { fen: '8/6k1/8/8/6PK/8/8/8 w - - 0 1',
        note: 'Opposisie is die sleutel tot die deur — Kg5 neem dit, Kh5 gee dit weg',
        winCondition: 'promote', moveLimit: 22 },
      // B8: Kg5 Pe5 vs Kf8 — C5S: 1 wen-skuif (Kf6); natuurlike faal: Kh6, Kg6, Kh5, Kf5.
      // Uitrol: bevorder wit-skuif 6 (limiet bumped vir margin teen uitrol-variansie).
      { fen: '5k2/8/8/4P1K1/8/8/8/8 w - - 0 1',
        note: 'Kf6 neem die opposisie reguit — enige ander koningskuif laat swart hom behou',
        winCondition: 'promote', moveLimit: 15 },
      // B9: Kc6 Pd4 vs Ke6 — C5S: 2 wen-skuiwe (Kc5, d5+); natuurlike faal: Kc7, Kb7, Kb6.
      // Uitrol: bevorder wit-skuif 7. Begroting (60%): limiet 13.
      { fen: '8/8/2K1k3/8/3P4/8/8/8 w - - 0 1',
        note: 'Twee weë wen hier — Kc5 behou die opposisie, of stoot dadelik met d5+',
        winCondition: 'promote', moveLimit: 13 },
      // B10: Kc5 Pb3 vs Kc7 — C5S: 2 wen-skuiwe (Kb5, b4); natuurlike faal: Kd5.
      // Uitrol: bevorder wit-skuif 10 (limiet bumped vir margin teen uitrol-variansie).
      { fen: '8/2k5/8/2K5/8/1P6/8/8 w - - 0 1',
        note: 'Kb5 hou die opposisie vas — Kd5 lyk natuurlik maar gee dit vir swart',
        winCondition: 'promote', moveLimit: 22 },
    ],
    silver: [
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kf4,Kf3,Kd3) > drempel 2.
      { fen: '8/8/8/3k4/8/4K3/4P3/8 w - - 0 1',
        note: 'Watter kant loop jy om? Die direkte pad gee swart die opposisie op d4', moveLimit: 27,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 3 wen-skuiwe (Kc4,Ke3,Kc3) > drempel 2.
      { fen: '8/8/8/4k3/8/3K4/3P4/8 w - - 0 1',
        note: 'Swart aktief in die sentrum — vind die roete na d6 wat swart se opposisie omseil', moveLimit: 27,
        retired: true },
      // AFGETREE 2026-07-11 (Opdrag 6): C5S ERROR — 4 wen-skuiwe (Kd4,Kc4,Kc3,Kc2) > drempel 2.
      { fen: '8/8/8/8/5k2/3K4/3P4/8 w - - 0 1',
        note: 'Swart probeer die sleutelblokkie onderskep — presisie vereis',
        retired: true },
      // ── Opdrag 6 herbou ──
      // S4: Kg6 Pe5 vs Ke8 — C5S: 1 wen-skuif (Kf6); natuurlike faal: Kg7.
      // (Oorspronklike keuse — Kg4 Pf4 vs Kf7 — was 'n lêer-skuif van T8
      // Brons #7; vervang deur die vertaling-bewuste duplikaat-skandering, Opdrag 6 §2.)
      // Uitrol: bevorder wit-skuif 4. Begroting (75%): limiet 7.
      { fen: '4k3/8/6K1/4P3/8/8/8/8 w - - 0 1',
        note: 'Kf6! neem die opposisie — die enigste skuif wat die deur oopmaak',
        winCondition: 'promote', moveLimit: 7 },
      // S5: Kf4 Pg4 vs Kh6 — C5S: 1 wen-skuif (Kf5); natuurlike faal: Ke5, Ke4.
      // Uitrol: bevorder wit-skuif 10. Begroting (75%): limiet 15.
      { fen: '8/8/7k/8/5KP1/8/8/8 w - - 0 1',
        note: 'Kf5 hou die opposisie — swart se koning kan nie verby nie',
        winCondition: 'promote', moveLimit: 15 },
      // S6: Kb5 Pc4 vs Kd7 — C5S: 1 wen-skuif (Kb6); natuurlike faal: Ka6, Kc5, Ka5.
      // Uitrol: bevorder wit-skuif 6. Begroting (75%): limiet 9.
      { fen: '8/3k4/8/1K6/2P5/8/8/8 w - - 0 1',
        note: 'Kb6 neem die opposisie op die kritieke oomblik',
        winCondition: 'promote', moveLimit: 9 },
    ],
    gold: [
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW — swart bereik die blokkade met opposisie.
      { fen: '8/8/8/3k4/8/4P3/4K3/8 w - - 0 1',
        note: 'Lang pad na die sleutelblokkie — swart bewaak die direkte roete, vind die ompad',
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): tabelbasis DRAW — swart bereik die blokkade met opposisie.
      { fen: '8/8/8/3k4/8/3P4/8/3K4 w - - 0 1',
        note: 'Maksimum afstand op dieselfde kolom — die volledige opposisie-tegniek',
        retired: true },
      // ── Opdrag 6: verre opposisie (goud kontrak-vereiste) ──
      // G3: Kc4 Pb4 vs Kc7 — konings op dieselfde LÊER, 3 blokkies uitmekaar (onewe).
      // C5S: 1 wen-skuif (Kc5); natuurlike faal: Kd5, Kb5, Kd4.
      // Uitrol: bevorder wit-skuif 15 (limiet bumped vir margin teen uitrol-variansie).
      { fen: '8/2k5/8/8/1PK5/8/8/8 w - - 0 1',
        note: 'Verre opposisie — konings 3 blokkies uitmekaar op dieselfde lêer. Kc5 behou dit; enigiets anders gee dit weg',
        winCondition: 'promote', moveLimit: 24 },
      // G4: Ka2 Pb3 vs Kd5 — konings op dieselfde DIAGONAAL, 3 blokkies uitmekaar (onewe).
      // C5S: 1 wen-skuif (Ka3); natuurlike faal: Kb2.
      // Uitrol: bevorder wit-skuif 17. Begroting (85%): limiet 21.
      { fen: '8/8/8/3k4/8/1P6/K7/8 w - - 0 1',
        note: 'Verre opposisie op die diagonaal — Ka3 neem dit oor die afstand, Kb2 lyk natuurlik maar verloor dit',
        winCondition: 'promote', moveLimit: 21 },
    ],
  },

  // ── Tipe 7: Verbygeraakte Pion Wedren ─────────────────────────────────────
  // Tegniek: bereken wie eerste bevorder deur die pion-skuiwe te tel.
  // Gebruik die "blokvierhoek" om te bepaal of swart se koning die pion kan vang.
  // Na bevordering: gebruik die koningin om die swart pion te stop terwyl jy mat lewer.
  // Brons: Wit is 2+ tempos voor of swart buite die blokvierhoek.
  // Silwer: Wit 1 tempo voor — koningin moet die swart pion onderskep ná bevordering.
  // Goud: Bevordering-met-skaak — die finesse wat wen selfs al bevorder swart ook.
  // Opdrag 7: alle tien herdoop na winCondition 'promote' (§2 se geharde
  // bevorder-wagter besluit self of dit dadelik wen). Brons/silwer bly
  // "skoon wedrenne" (swart bevorder nooit, in rollout of tabelbasis-
  // optimale spel) — limiete uit rollout-data (60/75/85% marge). Goud is
  // die "finesse"-vlak: 'n bevordering-met-skaak wat swart se eie
  // bevordering (wat regtig gebeur in die rollout!) onmiddellik beslis.
  7: {
    bronze: [
      // B1: Ke6 Pe7 vs Kc8 — pion een stap van bevordering, wit koningsteun
      { fen: '2k5/4P3/4K3/8/8/8/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Pion een stap van bevordering — bevorder en lewer dan mat met koningsteun' },
      // B2: Ka6 Pc6 vs Ka8 — hoekval, mat in drie skuiwe
      // 1.c7+ Kb8 2.Kb6 Ka8 3.c8=Q#
      { fen: 'k7/8/K1P5/8/8/8/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Hoekval — konings by a8, pion by c6. Skaakmat in drie!', moveLimit: 20 },
      // B3: Ka8 Pb7 vs Kf1 — blokvierhoek: swart buite die vierhoek, pion bevorder dadelik
      // moveLimit 15: rollout wys mat teen beurt 11 (movetime-rollout, nie volle diepte nie) — marge vir produksie-sterkte Stockfish
      { fen: 'K7/1P6/8/8/8/8/8/5k2 w - - 0 1', winCondition: 'promote', moveLimit: 15,
        note: 'Swart buite die vierhoek — die pion kan nie gevang word nie, bevorder!' },
      // B4: Ke5 Pa6 vs Ke3 Ph5 — pion wedren, Wit 2 tempos voor
      // moveLimit 15: rollout wys mat teen beurt 12 — marge (budget, soos B3)
      { fen: '8/8/P7/4K2p/8/4k3/8/8 w - - 0 1', winCondition: 'promote', moveLimit: 15,
        note: 'Pion wedren — Wit twee tempos voor. Bevorder eerste, stop dan swart se pion!' },
      // B5: Kg3 Pd5 vs Ka2 Ph3 — wit se koning vang die swart pion, dan bevorder d-pion
      // 1.Kxh3 Ka3 2.d6 Ka4 3.d7 Ka5 4.d8=Q → K+Q vs K mat
      { fen: '8/8/8/3P4/8/6Kp/k7/8 w - - 0 1', winCondition: 'promote', moveLimit: 20,
        note: 'Vang eers die swart pion — dan bevorder die d-pion en lewer mat!' },
    ],
    silver: [
      // S1: Ka5 Pa6 vs Kf4 Ph4 — een tempo voor; na bevordering gebruik Qa1 om h1 te stop
      // 1.a7 h3 2.a8=Q h2 3.Qa1! (beheer h1 langs die 1ste ry) dan mat
      { fen: '8/8/P7/K7/5k1p/8/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Een tempo voor — bevorder eers, speel dan Qa1 om die swart pion op h1 te stop' },
      // S2: Kd5 Pa6 vs Ke3 Ph5 — een tempo voor, koningin moet h-pion onderskep
      // 1.a7 h4 2.a8=Q h3 3.Qa3+! (skuif koningin nader aan h-pion) dan stop h1
      { fen: '8/8/P7/3K3p/8/4k3/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Bevorder eerste — gebruik dan die koningin om die h-pion te onderskep' },
      // S3: Kd4 Pa6 vs Ke6 pb5 — a-pion teen b-pion op verskillende lêers
      // 1.a7 b4 2.a8=Q b3 3.Qa1! (beheer b1 langs die 1ste ry) b2 4.Qa1 (hou b1)
      { fen: '8/8/P3k3/1p6/3K4/8/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Wedren op verskillende lêers — bevorder a-pion, stop dan die swart b-pion' },
    ],
    gold: [
      // G1 (Opdrag 7 — vervang): Kb1 Pb7 vs Kg3 Pg2. Tabelbasis-bevestig
      // 'win'; die enigste bevorderingskuif is b8=Q+ (skaak langs die
      // b8-h2-diagonaal) — swart moet die koning wegskuif, en bevorder self
      // (rollout: beurt 2!) terwyl wit se skaak-finesse reeds beslis het.
      { fen: '8/1P6/8/8/8/6k1/6p1/1K6 w - - 0 1', winCondition: 'promote',
        note: 'Bevorder met skaak! Swart bevorder ook — maar jou skaak wen eers' },
      // G2 (Opdrag 7 — vervang): Kg1 Pa7 vs Kf3 Pg2. Tabelbasis-bevestig
      // 'win'; a8=Q+ langs die a8-h1-diagonaal (koning op f3 lê op die
      // diagonaal). Rollout: swart bevorder ook (beurt 4), wit se skaak wen steeds.
      { fen: '8/P7/8/8/8/5k2/6p1/6K1 w - - 0 1', winCondition: 'promote',
        note: 'Dieselfde idee, ander lêer — bevorder met skaak voor swart kan reageer' },
    ],
  },

  // ── Tipe 5: Koning & Twee Ruiters teen Koning ────────────────────────────
  // AFGETREE 2026-07-09 (heel tipe — "In herbou 🔧"): drie posisies is teoreties
  // gelykspel of verlore (tabelbasis), drie is cursed-win (wen eers na 50+
  // skuiwe), twee is wel wen maar DTM 84-86 teenoor limiete van 22-34 — die
  // onakkuraatheidsreël (Opdrag 2 verwyder) was die enigste ding wat dit ooit
  // haalbaar gemaak het. Opdrag 5 herbou hierdie tipe van voor af.
  // Tegniek (histories): dryf die swart koning na 'n hoek.
  // Brons: swart in of naby hoek, ruiters aktief — mat binne 22 beurte.
  // Silwer: swart meer sentraal — langer maneuver benodig (34 beurte).
  // Goud: swart ver van hoek — volle hoek-dryf-tegniek (46 beurte).
  5: {
    bronze: [
      // B1: Kd1 Nd4 Ne4 vs Ke7 ph7 — pion op 7de ry gee swart 'n haak
      // AFGETREE 2026-07-09: DTM=86 > limiet 22 (enjin-geverifieer, Opdrag 3).
      { fen: '8/4k2p/8/8/3NN3/8/8/3K4 w - - 0 1',
        note: 'Swart se pion op h7 gee jou die haak — dryf die swart koning na h8 en gebruik die pion om pat te vermy',
        moveLimit: 22, retired: true },
      // B2: Kd1 Nd2 Ne2 vs Ka4 ph7 — swart reeds op rand, pion op 7de ry
      // AFGETREE 2026-07-09: DTM=84 > limiet 22 (enjin-geverifieer, Opdrag 3).
      { fen: '8/7p/8/8/k7/8/3NN3/3K4 w - - 0 1',
        note: 'Swart op die a-lyn met pion op h7 — dryf na a1-hoek terwyl die pion die pat-gevaar verwyder',
        moveLimit: 22, retired: true },
      // B3: Kg1 Nf2 Ng2 vs Kf3 pa7 — pion op 7de ry, swart naby h-hoek
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/p7/8/8/8/5k2/5NN1/6K1 w - - 0 1',
        note: 'Pion op a7, swart naby die h-hoek — druk die koning toe met Nh4 en Nf4, gebruik die pion as haak',
        moveLimit: 22, retired: true },
      // ── Opdrag 5 herbou: agt nuwe posisies, Troitsky-metode, tabelbasis-gesertifiseer ──
      // B4: Kb5 Nc5 Nf8 vs Kb8 pc6 — pion op c6 (Troitsky-lyn), ruiter op c5 blokkeer direk
      // Tabelbasis: category=win, DTM=8 wit-skuiwe (sien verslag)
      { fen: '1k3N2/8/2p5/1KN5/8/8/8/8 w - - 0 1',
        note: 'Die ruiter op c5 hou die pion vas — bring jou koning nader met Kb6! en onthou: los die pion op die regte oomblik om die laaste net te voltooi.',
        moveLimit: 22 },
      // B5: Kd4 Na5 Ne1 vs Ka1 pa6 — pion op a6 (Troitsky-lyn), ruiter op a5 blokkeer direk
      // Tabelbasis: category=win, DTM=9 wit-skuiwe (sien verslag)
      { fen: '8/8/p7/N7/3K4/8/8/k3N3 w - - 0 1',
        note: 'Die ruiter op a5 hou die pion vas — druk met Kc3! na die a1-hoek. Te vroeg gelos = die pion hardloop; te laat gelos = pat. Vind die presiese oomblik!',
        moveLimit: 22 },
      // B6: Ke6 Nd5 Ne3 vs Kg8 pe4 — pion op e4 (Troitsky-lyn), ruiter op e3 blokkeer direk
      // Tabelbasis: category=win, DTM=8 wit-skuiwe (sien verslag)
      { fen: '6k1/8/4K3/3N4/4p3/4N3/8/8 w - - 0 1',
        note: 'Die ruiter op e3 hou die pion vas — Kf6! sit die laaste stuk van die net vas voor jy die pion op die regte oomblik los.',
        moveLimit: 22 },
    ],
    silver: [
      // S1: Kd1 Nd4 Ne4 vs Kd7 ph5 — pion op 5de ry, swart middelblok
      // AFGETREE 2026-07-09: tabelbasis CURSED-WIN — wen eers na 50+ skuiwe (Opdrag 3).
      { fen: '8/3k4/8/7p/3NN3/8/8/3K4 w - - 0 1',
        note: 'Pion op h5, swart middelblok — kombineer ruiter-maneuvers om na hoek te dryf voor die pion te ver vorder',
        moveLimit: 34, retired: true },
      // S2: Kd1 Nd2 Ne2 vs Ka5 ph5 — pion op 5de ry, swart op rand
      // AFGETREE 2026-07-09: tabelbasis CURSED-WIN — wen eers na 50+ skuiwe (Opdrag 3).
      { fen: '8/8/8/k6p/8/8/3NN3/3K4 w - - 0 1',
        note: 'Pion op h5 met swart op a5 — jaag na die hoek terwyl jy die pion se vordering dophou',
        moveLimit: 34, retired: true },
      // S3: Kd1 Nd2 Ne2 vs Ka8 ph5 — swart in hoek maar wit ver weg, pion dreig
      // AFGETREE 2026-07-09: tabelbasis CURSED-WIN — wen eers na 50+ skuiwe (Opdrag 3).
      { fen: 'k7/8/8/7p/8/8/3NN3/3K4 w - - 0 1',
        note: 'Swart in a8-hoek met pion op h5 — wit moet vinnig mat gee voor die pion bevorder!',
        moveLimit: 34, retired: true },
      // ── Opdrag 5 herbou ──
      // S4: Ke6 Nc5 Ne2 vs Ka2 pc6 — pion op c6 (Troitsky-lyn), ruiter op c5 blokkeer direk
      // Tabelbasis: category=win, DTM=17 wit-skuiwe (sien verslag)
      { fen: '8/8/2p1K3/2N5/8/8/k3N3/8 w - - 0 1',
        note: 'Die swart koning is amper in die hoek — Ke5! druk verder na die a1-hoek toe, terwyl die ruiter op c5 die pion vashou vir die res van die druk.',
        moveLimit: 34 },
      // S5: Kd5 Nh5 Nd4 vs Kd8 ph6 — pion op h6 (Troitsky-lyn), ruiter op h5 blokkeer direk
      // Tabelbasis: category=win, DTM=20 wit-skuiwe (sien verslag)
      { fen: '3k4/8/7p/3K3N/3N4/8/8/8 w - - 0 1',
        note: 'Nog \'n stuk pad om te loop — Kd6! begin die tweede helfte van die druk, terwyl die ruiter op h5 die pion geduldig vashou.',
        moveLimit: 34 },
      // S6: Ke3 Ne4 Nc1 vs Kg1 pe5 — pion op e5 (Troitsky-lyn), ruiter op e4 blokkeer direk
      // Tabelbasis: category=win, DTM=20 wit-skuiwe (sien verslag)
      { fen: '8/8/8/4p3/4N3/4K3/8/2N3k1 w - - 0 1',
        note: 'Kf3! sit die druk na die g1-hoek voort — die ruiter op e4 hou die pion vas totdat die net byna toe is.',
        moveLimit: 34 },
    ],
    gold: [
      // G1: Kd1 Nd4 Ne4 vs Ka7 ph2 — pion op 2de ry, amper bevordering, dringende mat
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/k7/8/8/3NN3/8/7p/3K4 w - - 0 1',
        note: "Pion op h2, een skuif van bevordering — dryf swart na a8 met presisie voor die pion 'n koningin word",
        moveLimit: 46, retired: true },
      // G2: Kd1 Nd2 Ne2 vs Ke8 ph2 — swart sentraal, pion op h2, langste uitdaging
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '4k3/8/8/8/8/8/3NN2p/3K4 w - - 0 1',
        note: 'Pion op h2 dreig bevordering — dryf swart na hoek en lewer mat presies voor dit te laat is',
        moveLimit: 46, retired: true },
      // ── Opdrag 5 herbou ──
      // G3: Ke2 Nc5 Ne8 vs Kh5 pc6 — pion op c6 (Troitsky-lyn), ruiter op c5 blokkeer direk
      // Tabelbasis: category=win, DTM=28 wit-skuiwe (sien verslag)
      { fen: '4N3/8/2p5/2N4k/8/8/4K3/8 w - - 0 1',
        note: 'Die volle Troitsky-tog begin hier — die koning is nog sentraal. Kf3! begin die lang dryf na die hoek, terwyl die ruiter op c5 die pion geduldig vashou vir die hele reis.',
        moveLimit: 46 },
      // G4: Ke1 Ne3 Nb5 vs Kb1 pe4 — pion op e4 (Troitsky-lyn), ruiter op e3 blokkeer direk.
      // Bewustelik anders as G3: hier is die TWEEDE ruiter (b5) reeds naby die
      // swart koning; die BLOKKEERDER (e3) is ver weg en moet later oorreis
      // ná loslating — 'n omgekeerde verhaal, ander hoek (a-kant/1ste ry vs
      // G3 se h-kant/8ste ry), en dieper DTM (32 vs 28).
      // Tabelbasis: category=win, DTM=32 wit-skuiwe (sien verslag)
      { fen: '8/8/8/1N6/4p3/4N3/8/1k2K3 w - - 0 1',
        note: '\'n Ander reis: die ruiter op b5 is klaar naby, maar die blokkeerder op e3 moet later ver oorreis. Kd2! begin die laaste toedraai na die a1-hoek.',
        moveLimit: 46 },
    ],
  },

  // ── Tipe 11: Piondeurbraak ────────────────────────────────────────────────
  // Tegniek: offer die middelste pion om 'n verbygeraakte pion te skep!
  // Opdrag 7 herbou heeltemal: die ses oorspronklike posisies (B1, S1-3, G1-2)
  // het almal die nuwe C5-deurbraak-sertifiseerder gedruip — met konings so ver
  // is party koning-skuiwe (soos "niks doen nie") self ook wen-evaluasies, wat
  // die offer dekoratief maak (nie bindend nie). Al tien is vervang deur
  // konings NADER aan die muur te plaas (presies 2 lêers + 1 ry vanaf die
  // middelpion se lêer) — hier wen slegs die middelpion se twee vangskuiwe
  // (nie die buitenste terug-vangskuiwe nie), en ELKE koning-skuif verloor.
  // Silwer gebruik dieselfde geometrie op nuwe lêers (die presiese koning-
  // plasing bepaal self reeds watter vangorde bind — "moenie huiwer nie").
  // Goud voeg 'n eggo van T7 by: 'n verafgeleë swart teen-pion wat regtig
  // hardloop in eie-spel (H1: h-pion bereik h2 voor mat! G2: a-pion stoot).
  11: {
    bronze: [
      // Br1 (Opdrag 7): Kd3 Pa5b5c5 vs Kd7 pa6b6c6 — C5: slegs bxc6+/bxa6 wen,
      // alle 8 koning-skuiwe verloor. Rollout: mat teen beurt 15.
      { fen: '8/3k4/ppp5/PPP5/8/3K4/8/8 w - - 0 1', winCondition: 'promote', moveLimit: 18,
        note: "Offer om deur te breek — speel bxc6+ of bxa6, nie die buitenste pion nie!" },
      // Br2 (Opdrag 7): Kf2 Pb5c5d5 vs Ke7 pb6c6d6 — b-c-d lêers
      { fen: '8/4k3/1ppp4/1PPP4/8/8/5K2/8 w - - 0 1', winCondition: 'promote', moveLimit: 18,
        note: 'Deurbraak op b-c-d lêers — die middelpion se vangskuif is die deurslag' },
      // Br3 (Opdrag 7): Ke1 Pc5d5e5 vs Kf7 pc6d6e6 — c-d-e lêers
      { fen: '8/5k2/2ppp3/2PPP3/8/8/8/4K3 w - - 0 1', winCondition: 'promote', moveLimit: 18,
        note: 'Deurbraak op c-d-e lêers — dieselfde beginsel, nuwe plek op die bord' },
      // Br4 (Opdrag 7): Kd1 Pd5e5f5 vs Kg7 pd6e6f6 — d-e-f lêers
      { fen: '8/6k1/3ppp2/3PPP2/8/8/8/3K4 w - - 0 1', winCondition: 'promote', moveLimit: 18,
        note: 'Deurbraak op d-e-f lêers — vind die vangskuif wat bind' },
      // Br5 (Opdrag 7): Kc1 Pe5f5g5 vs Kh7 pe6f6g6 — e-f-g lêers
      { fen: '8/7k/4ppp1/4PPP1/8/8/8/2K5 w - - 0 1', winCondition: 'promote', moveLimit: 18,
        note: 'Deurbraak op e-f-g lêers — die randlêer se muur' },
      // AFGETREE (Opdrag 7): oorspronklike B1 — koningskuiwe soos Ke5/Ke4 hou
      // ook 'n wen-evaluasie (konings te ver), die offer is dus dekoratief
      // onder die nuwe C5-sertifiseerder. Vervang deur Br1 hierbo.
      { fen: '8/8/ppp5/PPP5/3K4/8/3k4/8 w - - 0 1',
        note: "Die klassieke deurbraak — speel 1.bxc6! en offer die pion om 'n verbygeraakte pion te skep",
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): DTM=13 > limiet 12. Bly afgetree.
      { fen: '8/8/1ppp4/1PPP4/5K2/8/5k2/8 w - - 0 1',
        note: "Deurbraak op b-c-d lêers — vind die offer-skuif wat 'n vrye pion skep!",
        retired: true },
      // AFGETREE 2026-07-09 (Opdrag 3): DTM=15 > limiet 12. Bly afgetree.
      { fen: '8/8/8/ppp5/PPP5/2K5/8/3k4 w - - 0 1',
        note: "Pionne op die vierde ry — 1.b5! is die deurbraak. Offer taktiek om 'n koningin te kry",
        retired: true },
    ],
    silver: [
      // Si1 (Opdrag 7): Kf3 Pb5c5d5 vs Ke7 pb6c6d6 — C5: slegs cxd6+/cxb6 wen,
      // alle 8 koning-skuiwe verloor. Presiese koning-plasing bepaal watter
      // vangorde bind — huiwer en jy verloor die geleentheid.
      { fen: '8/4k3/1ppp4/1PPP4/8/5K2/8/8 w - - 0 1', winCondition: 'promote',
        note: 'Deurbraak, maar swart se koning is nader — vind die regte vangskuif dadelik!' },
      // Si2 (Opdrag 7): Kd2 Pd5e5f5 vs Kg7 pd6e6f6 — C5: slegs exf6+/exd6 wen
      { fen: '8/6k1/3ppp2/3PPP2/8/8/3K4/8 w - - 0 1', winCondition: 'promote',
        note: 'Vind die deurbraakskuif dadelik — huiwer en swart se koning kry sy kans' },
      // Si3 (Opdrag 7): Kc2 Pe5f5g5 vs Kh7 pe6f6g6 — C5: slegs fxg6+/fxe6 wen
      { fen: '8/7k/4ppp1/4PPP1/8/8/2K5/8 w - - 0 1', winCondition: 'promote',
        note: 'Deurbraak op e-f-g lêers — presiese vangorde bind, geen huiwering nie' },
      // AFGETREE (Opdrag 7): oorspronklike S1 — Kd3/Kb3/Kb2 ens. hou ook 'n
      // wen-evaluasie, dieselfde dekoratiewe gebrek as die ou B1. Vervang deur Si1.
      { fen: '8/8/ppp5/PPP5/8/2K5/8/3k4 w - - 0 1',
        note: 'Deurbraak, maar swart se koning sal probeer inmeng — bevorder vinnig en stop die swart pion!',
        retired: true },
      // AFGETREE (Opdrag 7): oorspronklike S2 — selfde gebrek, vervang deur Si2.
      { fen: '8/8/1ppp4/1PPP4/8/5K2/8/5k2 w - - 0 1',
        note: 'Vind die deurbraakskuif en behou jou pion-voorsprong teen swart se koning',
        retired: true },
      // AFGETREE (Opdrag 7): oorspronklike S3 — selfde gebrek, vervang deur Si3.
      { fen: '8/8/3ppp2/3PPP2/8/5K2/8/4k3 w - - 0 1',
        note: 'Deurbraak op die d-e-f lêers — dieselfde beginsel, nuwe plek op die bord',
        retired: true },
    ],
    gold: [
      // G1 (Opdrag 7): Kd3 Pa5b5c5 + swart teen-pion h7 vs Kd7 ph6a6b6c6 —
      // C5 hou (slegs bxa6 wen, alle koning-skuiwe verloor); in eie-spel
      // hardloop swart se h-pion regtig — bereik h2 voor wit mat lewer!
      { fen: '8/3k3p/ppp5/PPP5/8/3K4/8/8 w - - 0 1', winCondition: 'promote',
        note: "Offer om deur te breek — maar hou ook swart se h-pion dop, hy hardloop!" },
      // G2 (Opdrag 7): Ke1 Pc5d5e5 + swart teen-pion a6 vs Kf7 pa6c6d6e6 —
      // C5 hou (slegs dxe6+/dxc6 wen); swart se a-pion is die teen-dreiging.
      { fen: '8/5k2/p1ppp3/2PPP3/8/8/8/4K3 w - - 0 1', winCondition: 'promote',
        note: 'Deurbraak op c-d-e lêers — swart se a-pion is die teen-dreiging, tel jou tempo\'s' },
      // AFGETREE (Opdrag 7): oorspronklike G1 — AL AGT koning-skuiwe hou ook
      // 'n wen-evaluasie (0 verloor-skuiwe) — konings heeltemal te ver
      // uitmekaar om die offer bindend te maak. Vervang deur nuwe G1 hierbo.
      { fen: '8/8/ppp5/PPP5/8/8/2K5/5k2 w - - 0 1',
        note: 'Deurbraak en dan koningin-eindspel teen swart se aktiewe koning — vind 1.bxc6! en wen dan presies',
        retired: true },
      // AFGETREE (Opdrag 7): oorspronklike G2 — selfde gebrek, vervang deur nuwe G2.
      { fen: '8/8/1ppp4/1PPP4/8/8/2K5/5k2 w - - 0 1',
        note: 'Deurbraak op b-c-d lêers, dan presisie-koningin-eindspel — die moeilikste pion-deurbraak-oefening',
        retired: true },
    ],
  },

  // ── Tipe 12: Buitenste Verbygeraakte Pion ────────────────────────────────
  // Tegniek: gebruik die ver buitenste verbygeraakte pion as LOKMIDDEL.
  // Swart se koning moet die ver pion gaan stop — intussen wen wit se koning die middelste pione.
  // Opdrag 7 herbou: B2/B3/S1/S3 het GEEN swart pionne gehad nie (soos B1 reeds
  // in Opdrag 3 gevind is) — sonder pionne is daar niks om te oes nie, geen
  // lokmiddel-tema moontlik nie. Slegs S2/G1 (wat wel f7/g7 het) het die nuwe
  // C8-lokmiddel-toets geslaag (koning-oes voor bevordering); G2 se "oes"
  // gebeur eers ná bevordering en met die koningin, nie die koning nie — swakker
  // C8-nakoming, vervang. Al tien nuwes gebruik dieselfde beginsel: die
  // lokmiddel-pion MOET op die buitenste lêer (a of h) wees — b/c- of e/f-
  // lêer weergawes het herhaaldelik in gelykspel-agtige pion-ruilings ontaard
  // in selfspel-toetsing (die lokmiddel was nie "buite" genoeg nie).
  12: {
    bronze: [
      // Br1 (Opdrag 7): h5/b7c7-lokmiddel, bKd5. Vinnige beslissende lyn.
      { fen: '8/1pp5/8/3k3P/8/8/1PP5/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 22,
        note: 'Die h-pion lok swart se koning weg — bevorder die b- en c-pione terwyl swart omgelei word' },
      // Br2 (Opdrag 7): h5/b7c7-lokmiddel, bKd4. Koning-oes bevestig (Kxb2).
      { fen: '8/1pp5/8/7P/3k4/8/1PP5/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 22,
        note: 'Buitenste h-pion as lokmiddel — beweeg dit voor sodat swart weggestuur word, dan bevorder b en c' },
      // Br3 (Opdrag 7): a5/g7h7-lokmiddel, bKe5.
      { fen: '8/6pp/8/P3k3/8/8/6PP/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 20,
        note: 'Die a-pion lok swart se koning weg — bevorder die g- en h-pione terwyl swart omgelei word' },
      // Br4 (Opdrag 7): a5/g7h7-lokmiddel, bKe6.
      { fen: '8/6pp/4k3/P7/8/8/6PP/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 22,
        note: 'Buitenste a-pion as lokmiddel — swart se koning moet kies: jaag die pion of verdedig eie pione' },
      // Br5 (Opdrag 7): h5/b7c7-lokmiddel, bKe5. Koning-oes bevestig (Kxh7).
      { fen: '8/1pp5/8/4k2P/8/8/1PP5/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 22,
        note: 'Swart se koning naby die b/c-pione — gebruik die ver h-pion om dit weg te lok' },
      // AFGETREE (Opdrag 7): oorspronklike B1 — bevorder eers op wit-skuif 20,
      // bly afgetree (Opdrag 3, §4-uitrol).
      { fen: '8/8/8/P1k5/8/8/5PP1/6K1 w - - 0 1',
        note: 'Die a-pion lok swart se koning weg — bevorder die f- en g-pione terwyl swart se koning omgelei word',
        winCondition: 'promote', retired: true },
      // AFGETREE (Opdrag 7): oorspronklike B2 — swart het geen pionne nie,
      // niks om te oes nie, geen lokmiddel-tema moontlik nie.
      { fen: '8/8/3k4/P7/8/6P1/8/6K1 w - - 0 1',
        note: 'Druk die a-pion voor — swart moet kies: stop die a- of die g-pion. Albei kan nie gestop word nie!',
        winCondition: 'promote', retired: true },
      // AFGETREE (Opdrag 7): oorspronklike B3 — selfde gebrek, geen swart pionne.
      { fen: '8/8/8/8/P1k5/8/5PP1/6K1 w - - 0 1',
        note: 'Buitenste a-pion as lokmiddel — beweeg dit voor sodat swart se koning gestuur word, dan bevorder f en g',
        winCondition: 'promote', retired: true },
    ],
    silver: [
      // Si1: bestaande S2, ongewysig — C8-getoets, koning oes f7 voor bevordering.
      { fen: '8/5pp1/3k4/P7/8/8/5PP1/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 28,
        note: 'Beide kante het pione — gebruik die buitenste a-pion as lokmiddel om swart se f/g-pione oop te laat' },
      // Si2 (Opdrag 7): a5/g7h7-lokmiddel, bKd6. Koning oes g6 én h3.
      { fen: '8/6pp/3k4/P7/8/8/6PP/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 28,
        note: 'Swart se koning is sentraal — kies presies wanneer om die a-pion te stoot sodat die g/h-pione vry is' },
      // Si3 (Opdrag 7): a5/g7h7-lokmiddel, bKd7. Koning oes h6 én g4.
      { fen: '3k4/6pp/8/P7/8/8/6PP/6K1 w - - 0 1', winCondition: 'promote', moveLimit: 30,
        note: 'Swart se koning moet kies: jaag die a-pion of verdedig die g/h-pione — albei kan nie nie' },
      // AFGETREE (Opdrag 7): oorspronklike S1 — geen swart pionne nie, selfde
      // gebrek as B2/B3 (eers hier ontdek by die C8-oudit).
      { fen: '8/8/8/P7/8/2k5/5PP1/6K1 w - - 0 1',
        note: 'Swart se koning is sentraal — bereken presies wanneer om die a-pion te stoot sodat die f/g-pione vry is',
        winCondition: 'promote', retired: true },
      // AFGETREE (Opdrag 7): oorspronklike S3 — selfde gebrek, geen swart pionne.
      { fen: '8/8/8/P7/8/8/k4PP1/6K1 w - - 0 1',
        note: 'Swart se koning is al op die a-lyn — vind die regte volgorde om die f/g-pione te bevorder',
        winCondition: 'promote', retired: true },
    ],
    gold: [
      // G1: bestaande, ongewysig — C8-getoets, koning oes f4 én g3 tydens die jag.
      { fen: '8/5pp1/8/P2k4/8/8/5PP1/6K1 w - - 0 1', winCondition: 'promote',
        note: 'Swart se aktiewe koning dreig beide kante — bereken presies wie eerste bevorder met die buitenste pion as lokmiddel' },
      // G2 (Opdrag 7 — vervang): h5/b7c7-lokmiddel, bKe6. Koning oes DRIE
      // pionne (h5-vangs, c6, b2) voor bevordering — sterk C8-nakoming.
      { fen: '8/1pp5/4k3/7P/8/8/1PP5/6K1 w - - 0 1', winCondition: 'promote',
        note: 'Swart se koning naby die b/c-pione — gebruik die ver h-pion as lokmiddel, dan wen die pion-wedren' },
      // AFGETREE (Opdrag 7): oorspronklike G2 — die "oes" gebeur eers ná
      // bevordering en met die koningin, nie die koning nie — swakker
      // C8-nakoming as die nuwe G2 hierbo.
      { fen: '8/5pp1/8/P7/4k3/8/5PP1/6K1 w - - 0 1',
        note: 'Swart se koning naby die f/g-pione — gebruik die ver a-pion om dit weg te lok, dan wen die pion-wedren',
        winCondition: 'promote', retired: true },
    ],
  },

  // ── Tipe 13: Lucena-posisie ───────────────────────────────────────────────
  // Tegniek: bou die "brug" — die witste toring beweeg na die 4de ry om die koninguitgang te skerm.
  // Witste koning staan voor die pion op die 8ste ry. Swart se toring gee aanhoudende skaak.
  // Die brug-bou-tegniek: 1.Td4! (of soortgelyk) — dan as swart skaak gee, skerp die toring.
  // Brons: Brug halfpad gebou — vind die laaste skerm-skuif.
  // Silwer: Brug moet van voor af gebou word — vind 1.Td4!
  // Goud: Swart se koning is aktief naby die pion — moeiliker uitvoering van die brug.
  13: {
    // Opdrag 3, §2a: die Lucena se payoff IS die bevordering — die brug bestaan
    // om dit te forseer. Re-getag as promote (al agt), wat die B1/S1/S2
    // nul-speling-probleme en die B2 moontlik-onmoontlike-mat in een slag oplos.
    bronze: [
      // B1: Kd8 Pd7 Td1 vs Kg3 ta2 — bou die brug: 1.Td4! dan skerp teen skaak
      { fen: '3K4/3P4/8/8/8/6k1/r7/3R4 w - - 0 1',
        note: 'Lucena: bou die brug met 1.Td4! — dan wanneer swart skaak gee, skerp jou toring om die koning te beskerm', moveLimit: 24,
        winCondition: 'promote' },
      // B2: Ke8 Pe7 Te4 vs Kd1 ta1 — brug reeds op e4, voer die afskerming uit
      { fen: '4K3/4P3/8/8/4R3/8/8/r2k4 w - - 0 1',
        note: 'Die brug is reeds op e4 gebou — vind die regte oomblik om die toring as skerm te gebruik', moveLimit: 24,
        winCondition: 'promote' },
      // B3: Kc8 Pc7 Tc1 vs Kf3 ta2 — c-pion weergawe van die Lucena
      { fen: '2K5/2P5/8/8/8/5k2/r7/2R5 w - - 0 1',
        note: 'Lucena met die c-pion — bou die brug op c4 en skerp teen skaak om te bevorder', moveLimit: 24,
        winCondition: 'promote' },
    ],
    silver: [
      // S1: Kd8 Pd7 Td1 vs Kf3 ta2 — brug moet gebou word, swart se koning meer aktief
      { fen: '3K4/3P4/8/8/8/5k2/r7/3R4 w - - 0 1',
        note: 'Bou die brug van voor af — swart se aktiewe koning maak dit moeiliker. Vind 1.Td4!', moveLimit: 22,
        winCondition: 'promote' },
      // S2: Kf8 Pf7 Tf1 vs Kd3 ta2 — f-pion Lucena, swart se koning meer sentraal
      { fen: '5K2/5P2/8/8/8/3k4/r7/5R2 w - - 0 1',
        note: 'Lucena met die f-pion — bou die brug op f4 terwyl swart se toring aanhoudende skaak gee', moveLimit: 22,
        winCondition: 'promote' },
      // S3: Kc8 Pc7 Tc1 vs Kb3 ta2 — swart se koning aggressief naby die brug
      { fen: '2K5/2P5/8/8/8/1k6/r7/2R5 w - - 0 1',
        note: 'Swart se koning is naby en aggressief — bou die brug op c4 presies terwyl die aanvalle afgeweer word', moveLimit: 22,
        winCondition: 'promote' },
    ],
    gold: [
      // G1: Ke8 Pe7 Te1 vs Kb3 ta2 — swart se koning aktief, komplekse brug-bou
      { fen: '4K3/4P3/8/8/8/1k6/r7/4R3 w - - 0 1',
        note: 'Swart se aktiewe kb3-koning bemoeilik die brug — voer die Lucena-tegniek presies uit teen sterk verdediging', moveLimit: 21,
        winCondition: 'promote' },
      // G2: Kd8 Pd7 Td1 vs Kb3 ta2 — d-pion, swart se koning by b3, moeilikste weergawe
      { fen: '3K4/3P4/8/8/8/1k6/r7/3R4 w - - 0 1',
        note: 'Die moeilikste Lucena — swart se kb3-koning dreig om die pion te help stop. Bou die brug perfek!', moveLimit: 21,
        winCondition: 'promote' },
    ],
  },

  // ── Tipe 14: Philidor-posisie ─────────────────────────────────────────────
  // Tegniek: as aanvaller moet jy die PHILIDOR-verdediging VERMY deur eers die
  // koning na die 6de ry te bring VOORDAT die pion na die 6de ry beweeg.
  // Swart se verdediging: toring op die 3de ry solank die pion op die 5de ry is —
  // wanneer dit na die 6de ry beweeg, gee swart skaak van agter af.
  // As wit verkeerd speel, kan swart dit gelykspel maak. Speel dus Lucena-georiënteerd!
  // Brons: Pion al op die 6de ry, koning voor die pion — Lucena-tegniek van hier af.
  // Silwer: Pion op die 5de ry — bring eers die koning voor, dan beweeg die pion.
  // Goud: Swart se toring aktief, swart se koning nader — presisiespel vereiste.
  14: {
    bronze: [
      // B1: Kd8 Pd6 Td1 vs Kh3 ta4 — pion op 6de ry, voer Lucena-tegniek uit
      { fen: '3K4/3P4/8/8/r7/7k/8/3R4 w - - 0 1',
        note: 'Pion op d6 met die koning op d8 — bou die brug op d4 en bevorder. Moenie pat gee nie!', moveLimit: 26 },
      // B2: Ke8 Pe6 Te1 vs Kh3 ta4 — e-pion weergawe, pion op 6de ry
      { fen: '4K3/8/4P3/8/r7/7k/8/4R3 w - - 0 1',
        note: 'e-pion op e6 — bou die brug op e4 en skerm teen die skaak-van-agter af tegniek', moveLimit: 26 },
      // B3: Kf8 Pf6 Tf1 vs Kh3 ta4 — f-pion, pion op 6de ry
      { fen: '5K2/8/5P2/8/r7/7k/8/5R2 w - - 0 1',
        note: 'f-pion op f6 — dieselfde Philidor/Lucena-samesmelting: bou die brug en bevorder', moveLimit: 26 },
    ],
    silver: [
      // S1: Ke8 Pe5 Te1 vs Kh3 ta4 — pion op 5de ry, bring eers die koning na e7/e6
      { fen: '4K3/8/8/4P3/r7/7k/8/4R3 w - - 0 1',
        note: 'Pion nog op e5 — MOENIE die pion eerste beweeg nie! Bring die koning na e7 eers, dan beweeg die pion', moveLimit: 25 },
      // S2: Kd8 Pd5 Td1 vs Kh3 ta4 — d-pion op 5de ry
      { fen: '3K4/8/8/3P4/r7/7k/8/3R4 w - - 0 1',
        note: 'Pion op d5 — die Philidor-verdediging dreig. Beweeg die koning na d7 voor jy die pion stoot', moveLimit: 26 },
      // S3: Ke8 Pe5 Te1 vs Kh3 ta2 — swart se toring op 2de ry, meer aktief
      { fen: '4K3/8/8/4P3/8/7k/r7/4R3 w - - 0 1',
        note: 'Swart se toring op a2 is meer aktief — bring die koning voor, dan beweeg die pion presies', moveLimit: 25 },
    ],
    gold: [
      // G1: Ke8 Pe5 Te1 vs Kh2 ta2 — swart se koning nader, moeiliker uitvoering
      { fen: '4K3/8/8/4P3/8/8/r6k/4R3 w - - 0 1',
        note: 'Swart se Kh2 is aggressief nader — voer die anti-Philidor-tegniek perfek uit teen sterk verdediging', moveLimit: 24 },
      // G2: Kd8 Pd5 Td1 vs Kh2 ta2 — d-pion, swart aktief
      { fen: '3K4/8/8/3P4/8/8/r6k/3R4 w - - 0 1',
        note: 'Die moeilikste Philidor-oefening — swart se koning en toring beide aktief. Speel die korrekte volgorde!', moveLimit: 24 },
    ],
  },

  // ── Tipe 15: Toring Agter Verbygeraakte Pion ─────────────────────────────
  // Tegniek: ALTYD plaas jou toring AGTER jou eie verbygeraakte pion (nie voor of langs nie).
  // Die toring agter die pion ondersteun elke skuif van die pion en behou maksimale aktiwiteit.
  // Swart se toring moet ook agter die pion geplaas word om dit te stop.
  // Brons: Duidelike demonstrasie — toring agter die pion wen maklik, geen swart toring.
  // Silwer: Swart het ook toring — vind die regte posisie vir jou toring om te wen.
  // Goud: Swart se toring aktief met skaakgewing — handhaaf die toring-agter-pion-beginsel.
  15: {
    bronze: [
      // B1: Kc5 Pa6 Ta1 vs Kd3 — toring agter pion, bevorder maklik
      { fen: '8/8/P7/2K5/8/3k4/8/R7 w - - 0 1',
        note: 'Toring op a1 AGTER die a6-pion — druk die pion vorentoe en bevorder. Die toring ondersteun elke stap!' },
      // B2: Kc5 Pa6 Ta1 vs Kd2 Tf1 — swart se toring probeer inmeng
      { fen: '8/8/P7/2K5/8/8/3k4/R4r2 w - - 0 1',
        note: 'Swart se toring probeer inmeng — hou jou toring agter die a-pion en bevorder voor swart kan stop' },
      // B3: Kc5 Ph6 Th1 vs Kd2 — toring agter h-pion
      { fen: '8/8/7P/2K5/8/8/3k4/7R w - - 0 1',
        note: 'Toring agter die h-pion op h1 — bevorder die h-pion na h8 met die toring wat elke skuif steun' },
    ],
    silver: [
      // S1: Kc5 Pa6 Ta1 vs Kd3 Td6 — swart se toring voor die pion, wit se toring agter
      { fen: '8/8/P2r4/2K5/8/3k4/8/R7 w - - 0 1',
        note: 'Swart se toring staan VOOR die pion op d6 — jou toring is agter op a1. Wys die verskil: toring agter wen!' },
      // S2: Kc5 Ph6 Th1 vs Kd3 Th2 — swart se toring net agter die pion
      { fen: '8/8/7P/2K5/8/3k4/7r/7R w - - 0 1',
        note: 'Swart se toring op h2 probeer ook agter die pion kom — wen die toring-agter-pion-geveg' },
      // S3: Kc5 Pa6 Ta1 vs Kd3 Tg1 — swart se toring verre skaak
      { fen: '8/8/P7/2K5/8/3k4/8/R5r1 w - - 0 1',
        note: 'Swart se toring op g1 gee skake van die kant — hou die beginsel: toring agter die pion, moenie paniekerig skuif nie' },
    ],
    gold: [
      // G1: Kd5 Pa6 Ta1 vs Kb3 Ta2 — swart se toring ook agter die pion, aktiewe koning
      { fen: '8/8/P7/3K4/8/1k6/r7/R7 w - - 0 1',
        note: 'Swart se toring ook op die a-lyn — aktiewe swart koning by b3. Handhaaf die voordeel: toring agter wen die posisie' },
      // G2: Kd4 Ph6 Th1 vs Kb3 Th2 — h-pion wedstryd, swart aktief
      { fen: '8/8/7P/8/3K4/1k6/7r/7R w - - 0 1',
        note: 'h-pion met aktiewe swart koning en toring — die moeilikste toring-agter-pion-oefening. Verslaan die aggressiewe verdediging!' },
    ],
  },

  // ── Tipe 16: Aktiewe vs Passiewe Toring ──────────────────────────────────
  // Tegniek: AKTIEWE toring = op die 7de ry of agter verbygeraakte pione, dreig konstant.
  // PASSIEWE toring = agter sy eie pione vasgesit of ver van die aksie.
  // Die aktiewe toring wen deur materiaal te wen of deur bevordering te dwing.
  // Brons: Wit se toring op die 7de ry — swart se toring is passief op ry 1.
  // Silwer: Swart se koning meer aktief — handhaaf die toring-aktiwiteit teen teenstaan.
  // Goud: Swart se koning sentraal, dreig om die bevordering te stop — hou die toring aktief!
  16: {
    bronze: [
      // B1: Ke8 Td4 Pd7 vs Kf6 Ta1 — Lucena-tipe: pion op 7de ry, wit koning voor, toring aktief
      { fen: '4K3/3P4/5k2/8/R7/8/8/r7 w - - 0 1',
        note: 'Pion op die 7de ry — wit se aktiewe toring op a4 bou die "brug" en verdryf swart se toring van die 1ste ry' },
      // B2: Kd8 Tb4 Pe7 vs Kg6 Ta1 — soortgelyke Lucena tegniek, swart koning sykant
      { fen: '3K4/4P3/6k1/8/1R6/8/8/r7 w - - 0 1',
        note: 'Pion op e7, wit aktief — bou die brug met die toring en bevorder terwyl swart se passiewe toring toekyk' },
      // B3: Kf4 Tb7 Pg4 vs Kg6 Tb1 — toring aktief op 7de ry, g-pion naby
      { fen: '8/1R6/6k1/8/5KP1/8/8/1r6 w - - 0 1',
        note: 'Toring op b7 verskaar die 7de ry aktief — bevorder die g-pion terwyl swart se toring vasgesit is', moveLimit: 14 },
    ],
    silver: [
      // S1: Kd4 Tb7 Pg4 vs Kg5 Tb1 — swart se koning aktief naby die pion
      { fen: '8/1R6/8/6k1/3K2P1/8/8/1r6 w - - 0 1',
        note: 'Swart se koning is aktief by g5 en dreig die g-pion — hou jou toring op die 7de ry aktief om die bevorderingsdreigement lewendig te hou' },
      // S4 (Opdrag 8): dieselfde geraamte as S1, swart koning by g6.
      { fen: '8/1R6/6k1/8/3K2P1/8/8/1r6 w - - 0 1',
        note: 'Swart se koning probeer die g-pion van agter aanval — hou jou toring op die 7de ry aktief en bevorder deur' },
      // S5 (Opdrag 8): dieselfde geraamte, swart koning by h6.
      { fen: '8/1R6/7k/8/3K2P1/8/8/1r6 w - - 0 1',
        note: 'Swart se koning is aan die rand — gebruik jou aktiewe toring om die bevordering te dwing terwyl swart se toring passief bly' },
      // S2: Kd4 Tc7 Pg2 vs Kg4 Tb1 — langer pad na bevordering, aktiewe toring hou druk
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/2R5/8/8/3K2k1/8/6P1/1r6 w - - 0 1',
        note: 'g-pion ver terug maar toring aktief op c7 — hou die aktiwiteit terwyl die pion gevorder word',
        retired: true },
      // S3: Kd4 Te7 Pe2 vs Kf5 Tb1 — toring aktief op e7, pion bevorder langs die e-lyn
      // AFGETREE 2026-07-09: tabelbasis DRAW (Opdrag 3).
      { fen: '8/4R3/8/5k2/3K4/8/4P3/1r6 w - - 0 1',
        note: 'Aktiewe toring op e7 ondersteun die e-pion van agter — swart se passiewe toring op b1 kan nie inmeng nie',
        retired: true },
    ],
    gold: [
      // G1: Kd4 Tb7 Pg2 vs Kf5 Tb1 — swart se koning sentraal, dreig pion
      { fen: '8/1R6/8/5k2/3K4/8/6P1/1r6 w - - 0 1',
        note: 'Swart se Kf5 dreig die g-pion — hou jou toring aktief op die 7de ry terwyl die pion vorder. Aktiwiteit wen die eindspel!' },
      // G2: Kd4 Te7 Pe2 vs Kb5 Tb1 — swart aktiewe koning naby bevorderingsveld
      { fen: '8/4R3/8/1k6/3K4/8/4P3/1r6 w - - 0 1',
        note: 'Swart se Kb5 is aggressief geplaas — die aktiewe toring op e7 moet swart se verdediging verpletter. Aktiwiteit vs passiwiteit beslis hier!' },
    ],
  },

  // ── Tipe 17: Goeie Loper vs Slegte Loper ─────────────────────────────────
  // Tegniek: GOEIE loper = eie pione op die TEENOORGESTELDE kleur van die loper (oop diagonale).
  // SLEGTE loper = eie pione op DIESELFDE kleur as die loper (geblokkeer deur eie pione).
  // Wit se loper (donker vierkante, Be3) het oop diagonale. Swart se loper (ook donker) word
  // geblokkeer deur sy eie pione op donker vierkante (c5, e5).
  // Die wenplan: gebruik die konings-infiltrasie op die lig vierkante wat swart nie kan verdedig.
  17: {
    // Opdrag 3, §2a: hierdie is winnende omskakelings (+2.6 tot +38) wat net
    // die (nou verwyderde) wobble "nodig gehad het" omdat mat buite bereik was.
    // Re-getag as promote — hulle is vandag speelbaar. G2 is 'n egte gelykspel
    // en is afgetree (sien retirement-blok hieronder).
    bronze: [
      // B1: Ke2 Be3 Pc4 Pe4 vs Kd6 be7 pc5 pe5 — goeie loper teen slegte loper (be7 geblokkeer)
      // AFGETREE 2026-07-09: die §4 selfspel-uitrol (Opdrag 3) is hoogs wisselvallig
      // hier (28 op een lopie, 42 op 'n vars een) — dis 'n stadige posisionele
      // opbou, nie 'n geforseerde taktiek nie (diepte-24 PV vind selfs geen
      // bevordering binne die soektog nie). 'n veilige limiet (~50) is nie meer
      // 'n brons-posisie nie — selfde gebrek-klas as T04 S2/S3, T10 B3, T12 B1.
      { fen: '8/4b3/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Wit se Be3 het oop diagonale (goeie loper) — swart se be7 is geblokkeer deur sy eie pione op dieselfde kleur (slegte loper). Infiltreer met die koning!', moveLimit: 26,
        winCondition: 'promote', retired: true },
      // B2: Ke2 Be3 Pc4 Pe4 vs Kd6 bf6 pc5 pe5 — slegte loper op f6
      { fen: '8/8/3k1b2/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bf6 is op dieselfde donker kleur as sy pione op c5 en e5 — goeie vs slegte loper. Gebruik die lig vierkante om in te dring!', moveLimit: 26,
        winCondition: 'promote' },
      // B3: Ke2 Be3 Pc4 Pe4 vs Kd6 bg7 pc5 pe5 — slegte loper op g7
      { fen: '8/6b1/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bg7 vasgesit agter sy pione — infiltreer met die wit koning op die lig vierkante wat swart se slegte loper nie kan beskerm nie', moveLimit: 26,
        winCondition: 'promote' },
      // B4 (Opdrag 8): dieselfde geraamte, slegte loper op d8. Selfspel: bevorder op wit-skuif 20.
      { fen: '3b4/8/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bd8 is ver terug en steeds op donker vierkante — infiltreer met die koning op die lig vierkante', moveLimit: 26,
        winCondition: 'promote' },
    ],
    silver: [
      // S1: Ke2 Be3 Pc4 Pe4 vs Kd6 bc7 pc5 pe5 — slegte loper op c7
      { fen: '8/2b5/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bc7 is passief en geblokkeer — dring deur op die lig vierkante wat die slegte loper nie kan dek nie', moveLimit: 25,
        winCondition: 'promote' },
      // S2: Ke2 Be3 Pc4 Pe4 vs Kd6 bh6 pc5 pe5 — slegte loper op h6
      { fen: '8/8/3k3b/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bh6 lyk aktief maar is geblokkeer deur donker-kleur pione — die goeie loper-konings-kombinasie wen die strukturele geveg', moveLimit: 25,
        winCondition: 'promote' },
      // S3: Ke2 Be3 Pc4 Pe4 Pf4 vs Kd6 bf6 pc5 pe5 — wit het ekstra f-pion
      { fen: '8/8/3k1b2/2p1p3/2P1PP2/4B3/4K3/8 w - - 0 1',
        note: 'Wit het ekstra Pf4 — gebruik die goeie loper saam met die ekstra pion om deur te breek teen die geblokkeerde slegte loper', moveLimit: 25,
        winCondition: 'promote' },
    ],
    gold: [
      // G1: Ke2 Be3 Pc4 Pe4 vs Kd6 ba5 pc5 pe5 — slegte loper op a5, aktiefer geplaas
      // moveLimit 24→30 2026-07-09: die §4 selfspel-uitrol (Opdrag 3) bevorder
      // op wit-skuif 25 — net bo die vorige limiet van 24. 30 bly ruim binne
      // goud se tipiese omvang (verstek 36).
      { fen: '8/8/3k4/b1p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se ba5 lyk aktief — maar dis steeds op dieselfde donker kleur as sy pione. Wen die goeie-loper-eindspel teen die mees aktiewe slegte loper', moveLimit: 30,
        winCondition: 'promote' },
      // G3 (Opdrag 8): dieselfde geraamte, slegte loper op b4 — nog aktiewer geplaas. Selfspel: bevorder op wit-skuif 28.
      { fen: '8/8/3k4/2p1p3/1bP1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bb4 is die aktiefste plasing nog — steeds op donker vierkante. Voer die presisiespel uit om deur te breek', moveLimit: 32,
        winCondition: 'promote' },
      // G2: Kd2 Be3 Pc4 Pe4 vs Kd6 bh4 pc5 pe5 — slegte loper by h4, aktiewe swart
      // AFGETREE 2026-07-09: egte gelykspel (enjin: DRAWN +0.08 op diepte 28) — die
      // slegte loper hou wel die vesting. Opdrag 9 (minder-stuk-eindspels) herbou dit.
      { fen: '8/8/3k4/2p1p3/2P1P1b1/4B3/3K4/8 w - - 0 1',
        note: 'Die moeilikste weergawe — swart se bh4 is aktief maar steeds geblokkeer deur donker pione. Voer die presisiespel uit om deur die verdediging te breek', moveLimit: 24,
        retired: true },
    ],
  },

  // ── Tipe 18: Loper teen Ruiter ───────────────────────────────────────────
  // Tegniek: in OOP posisies met pione op BEIDE vleuels is die loper sterker as die ruiter.
  // Die loper beheer BEIDE vleuels gelyktydig — die ruiter kan nie twee plekke gelyk wees nie.
  // Die wit loper op b3 het oop diagonale en ondersteun die a-pion TERWYL dit die h-pion monitor.
  // Die swart ruiter moet tussen die twee dreigemente pendel — dit kan dit nie.
  // Brons: Maklike wen — swart se ruiter en pion ver van mekaar.
  // Silwer: Swart se ruiter meer sentraal, probeer beide dreigemente bestuur.
  // Goud: Swart se ruiter en koning aktief, langer tegniek benodig.
  18: {
    bronze: [
      // B1: Kc5 Bd4 Pa6 vs Ke8 Ng8 — pion bevorder, ruiter vasgesit in hoek ver weg
      { fen: '4k1n1/8/P7/2K5/3B4/8/8/8 w - - 0 1',
        note: 'Pion op a6 bevorder terwyl die ruiter op g8 té ver is — die loper dek die sleutelblokkie, ruiter kan nie help nie', moveLimit: 14 },
      // B2: Ke6 Bf5 Pf6 vs Ka8 Ng8 — ruiter in hoek, pion bevorder met loper-steun
      { fen: 'k5n1/8/4KP2/5B2/8/8/8/8 w - - 0 1',
        note: 'Pion op f6 bevorder — swart se ruiter op g8 is opgesluit, die loper op f5 beheer die sleuteldiagonale' },
      // B3: Ke6 Bc4 Pf6 vs Kg8 Na8 — ruiter op a8 vasgesit, loper en pion wen
      { fen: 'n5k1/8/4KP2/8/2B5/8/8/8 w - - 0 1',
        note: 'Ruiter op a8 is beknop — bevorder die f-pion met loper-steun terwyl die ruiter magteloos toekyk' },
    ],
    // AFGETREE 2026-07-09 (al vyf oorspronklikes): al vyf was tabelbasis DRAW
    // (0.00) — die loper-teen-ruiter-tema werk nie oor daardie afstande soos
    // gekonstrueer nie. Opdrag 8 herbou silwer/goud op 'n ander tema: die loper
    // se TWEE wyd-geskeide verbygeraakte pionne (a- en h-lêer) wat die kaal
    // ruiter nie gelyktydig kan jaag én blokkeer nie — tabelbasis-gesertifiseer
    // (≤7 stukke, kategorie 'win', C4 0-pat-slaggate op almal vier).
    silver: [
      // S4 (Opdrag 8): Kd4 Bb3 Pa2 Ph2 vs Kg6 Ng2 — twee wyd-geskeide pionne,
      // die ruiter kan nie albei jaag nie. Tabelbasis DTM=31 (16 wit-skuiwe).
      { fen: '8/8/6k1/8/3K4/1B6/P5n1/8 w - - 0 1',
        note: "Jou a- en h-pionne is te ver uitmekaar — swart se ruiter kan nie altwee jaag nie. Loop met die koning en bevorder!",
        winCondition: 'promote' },
      // S5 (Opdrag 8): Kd1 Bc4 Pa2 Ph2 vs Ke5 Ng2 — soortgelyk, ander koningplasing.
      // Tabelbasis DTM=27 (14 wit-skuiwe).
      { fen: '8/8/8/4k3/2B5/8/P3n2P/3K4 w - - 0 1',
        note: 'Die loper beheer beide vleuels gelyktydig terwyl die ruiter magteloos pendel — dryf een van die twee pionne deur',
        winCondition: 'promote' },
    ],
    gold: [
      // G3 (Opdrag 8): Kd1 Bc4 Pa2 Ph2 vs Kd6 Ng2 — swart se koning sentraal
      // aktief, moeiliker tegniek. Tabelbasis DTM=49 (25 wit-skuiwe).
      { fen: '8/8/3k4/8/2B5/8/P4n1P/3K4 w - - 0 1',
        note: 'Swart se aktiewe koning probeer help — maar die ruiter kan steeds nie beide verbygeraakte pionne keer nie. Presisie benodig!',
        winCondition: 'promote' },
      // G4 (Opdrag 8): Kd1 Bc4 Pa2 Ph2 vs Kc5 Ne5 — swart se ruiter sentraal
      // geplaas, probeer albei vleuels bedien. Tabelbasis DTM=51 (26 wit-skuiwe).
      { fen: '8/8/8/2k1n3/2B5/8/P6P/3K4 w - - 0 1',
        note: 'Die moeilikste weergawe — swart se ruiter staan sentraal en probeer albei vleuels bedien, maar kan dit nie regkry nie. Wen met noukeurige tempo-berekening', moveLimit: 32,
        winCondition: 'promote' },
    ],
  },

  // ── Tipe 19: Verkeerde Kleur Loper ───────────────────────────────────────
  // Tegniek: met 'n toringspion (a- of h-pion) en die VERKEERDE KLEUR loper is die eindspel
  // normaalweg GELYKSPEL — swart hou net die koning in die hoek.
  // Die "redding": 'n EKSTRA pion op 'n ander lyn verbreek die gelykspel-verdediging.
  // As jy slegs die toringspion het, moet jy WEET dat dit gelyk is en tydig help soek.
  // Brons: Verkeerde kleur loper + toringspion (gelyk sonder ekstra pion) MAAR wit het ekstra redder-pion.
  // Silwer: Swart het ekstra verdedigende pione — moeiligere pad na bevordering.
  // Goud: Swart se koning aktief, delikate volgorde benodig om die gelykspel-slaggat te vermy.
  19: {
    bronze: [
      // B1: Ka6 Pa7 Bc5(donker,VERKEERD vir a8-lig) Pf4 vs Ka8 — f-pion breek die gelykspel
      // AFGETREE 2026-07-09: C4 pat-mynveld — 12/14 wettige skuiwe gee onmiddellike
      // pat, INSLUITEND die skuif wat die nota self aanbeveel (f5). Vervang deur
      // twee nuwe posisies hieronder (Opdrag 3, §3).
      { fen: 'k7/P7/K7/2B5/5P2/8/8/8 w - - 0 1',
        note: "Die Bc5 is VERKEERDE KLEUR vir a8 — Pa7 alleen gee gelykspel! Maar Pf4 is die redder: bevorder die f-pion om mat te lewer", moveLimit: 14,
        retired: true },
      // B2: Ka1 Pa4 Bf5(lig,VERKEERD vir h8-donker) Ph5 vs Kh6 — a-pion breek die gelykspel
      { fen: '8/8/7k/5B1P/P7/8/8/K7 w - - 0 1',
        note: "Bf5 is VERKEERDE KLEUR vir h8 — die h-pion alleen kan nie wen nie! Gebruik die a-pion as redder om deur te breek", moveLimit: 19 },
      // B3: Kh6 Ph7 Bb5(lig,VERKEERD vir h8-donker) Pa3 vs Kh8 — a-pion beweeg swart se koning
      // AFGETREE 2026-07-09: C4 pat-mynveld — 11/13 wettige skuiwe gee onmiddellike
      // pat. Vervang deur twee nuwe posisies hieronder (Opdrag 3, §3).
      { fen: '7k/7P/7K/1B6/8/P7/8/8 w - - 0 1',
        note: "Bb5 is VERKEERDE KLEUR vir h8 — swart bly net op h8 en dit is gelyk! Maar Pa3 dwing swart se koning om te beweeg sodat Ph7 kan bevorder", moveLimit: 14,
        retired: true },
      // B4: Ke1 Pa6 Bg6(lig,VERKEERD vir h8-donker) Ph5 vs Kh6 — nuut, Opdrag 3 §3
      // Vervang B1. Gegenereer-en-geverifieer: tabelbasis DTM=7 (binne brons-begroting
      // 8.4), C4 0/14 pat-slaggate, swart koning 3 wettige skuiwe by die begin,
      // geen duplikaat nie. Enjin se beste lyn: 1.a7! Kg5 2.a8=Q Kf6 3.Qh8+ (mat in 9).
      { fen: '8/8/P5Bk/7P/8/8/8/4K3 w - - 0 1',
        note: 'Bg6 is VERKEERDE KLEUR vir h8 — die h-pion alleen sou net gelykspel gee! Maar die a-pion is die redder: bevorder dit met 1.a7! om mat te lewer',
        moveLimit: 14 },
      // B5: Kf1 Pa5 Bg6(lig,VERKEERD vir h8-donker) Ph7 vs Kh8 — nuut, Opdrag 3 §3
      // Vervang B3. Gegenereer-en-geverifieer: tabelbasis DTM=7 (binne brons-begroting
      // 8.4), C4 0/14 pat-slaggate, swart koning 3 wettige skuiwe by die begin,
      // geen duplikaat nie. Enjin se beste lyn: 1.a6! Kg7 2.a7 Kxg6 3.h8=Q (mat in 7).
      { fen: '7k/7P/6B1/P7/8/8/8/5K2 w - - 0 1',
        note: 'Bg6 is VERKEERDE KLEUR vir h8 — Ph7 alleen sou net gelykspel gee, want swart se koning bly net in die hoek! Maar die a-pion is die redder: bevorder dit met 1.a6! om deur te breek',
        moveLimit: 14 },
    ],
    silver: [
      // S1: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pc4 — swart het ekstra verdedigingspion
      { fen: 'k7/P7/K7/2B5/2p2P2/8/8/8 w - - 0 1',
        note: "Swart het 'n pc4 om verdediging te kompliseer — vind die korrekte volgorde om die f-pion te bevorder teen die verkeerde-kleur-loper-verdediging" },
      // S2: Ka1 Bf5(verkeerd) Ph5 Pa3 vs Kh6 — swart se aktiewe koning
      { fen: '8/8/7k/5B1P/8/P7/8/K7 w - - 0 1',
        note: "Swart se Kh6 is aktief naby die h-pion — bevorder die a-pion as redder terwyl jy die gelykspel-slaggat vermy" },
      // S6 (Opdrag 8): die _dev hold-toetsposisie (Opdrag 2), nou 'n regte T19
      // silwer — wit is hier die SWAKKER kant en moet die verkeerde-kleur-hoek
      // (h1, lig) hou teen swart se donker loper + h-pion. Reeds gebou en
      // geverifieer in Opdrag 2; _dev-merker hieronder afgetree.
      { fen: '8/8/8/8/3b4/5k1p/8/6K1 w - - 0 1', winCondition: 'hold', holdMoves: 12,
        note: "Die verkeerde loper kan nie die hoek dek nie — bly in die hoek en hou die gelykspel" },
      // S3: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pd3 — swart se pion dreig bevordering
      // AFGETREE 2026-07-09: tabelbasis DRAW — swart se teenpion red die halfpunt (Opdrag 3).
      { fen: 'k7/P7/K7/2B5/5P2/3p4/8/8 w - - 0 1',
        note: "Swart se pd3 dreig ook te bevorder — bevorder jou f-pion eerste en gebruik die koningin om dan die verkeerde-kleur-probleem op te los",
        retired: true },
    ],
    gold: [
      // G1: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pc4 pd3 — twee verdedigingspione
      // AFGETREE 2026-07-09: tabelbasis DRAW — swart se teenpione red die halfpunt (Opdrag 3).
      { fen: 'k7/P7/K7/2B5/2p2P2/3p4/8/8 w - - 0 1',
        note: "Twee swart pione bemoeilik die redding — vind die korrekte volgorde om die verkeerde-kleur-loper-gelykspel te verbreek met jou f-pion",
        retired: true },
      // G2: Kf6 Ph7 Bb5(lig,VERKEERD vir h8-donker) Pa3 vs Kh8 — delicate volgorde om pat te vermy
      { fen: '7k/7P/5K2/1B6/8/P7/8/8 w - - 0 1',
        note: "Die gevaarlikste verkeerde-kleur-posisie — een verkeerde skuif gee PAT! Beweeg die a-pion om swart se koning uit die hoek te dwing, bevorder dan Ph7" },
      // G3 (Opdrag 8): dieselfde B4/B5-geraamte (Kf1 Pa5 Bg6-verkeerd Ph7 vs Kh8),
      // met 'n ekstra swart pg2 as verdedigingshulpbron naby wit se koning.
      // Gegenereer-en-geverifieer soos B4/B5: tabelbasis DTM=15 (8 wit-skuiwe),
      // C4 0/5 pat-slaggate. Enjin se beste lyn: 1.Kxg2 Kg7 2.a6 ... mat in 8.
      { fen: '7k/7P/6B1/P7/8/8/6p1/5K2 w - - 0 1', moveLimit: 14,
        note: "Bg6 is VERKEERDE KLEUR vir h8 — maar swart se pg2 gee 'n mikro-hulpbron naby jou koning. Vang dit eers, dan bevorder die a-pion om deur te breek" },
    ],
  },

  // ── _dev: Tydelike hold-modus toetsposisie (Opdrag 2, §6) ──────────────────
  // TYDELIK — toetsposisie vir hold-modus. Die enigste posisie is gepromoveer
  // na 'n regte T19 silwer-posisie (Opdrag 8, sien Tipe 19 silwer S6 hierbo)
  // en hier verwyder (nie afgetree nie — _dev is nooit deel van die
  // gesertifiseerde audit-trail-konvensie wat op die 20 regte tipes van
  // toepassing is nie, en 'n retired-kopie met identiese FEN sou net
  // scan_duplicates.py se eksakte-duplikaat-toets onnodig laat faal). Die
  // _dev-sleutel self bly leeg (nie verwyder nie) — buildPool() in app.js
  // sluit dit steeds eksplisiet uit.
  _dev: {
    bronze: [],
    silver: [],
    gold: [],
  },

}
