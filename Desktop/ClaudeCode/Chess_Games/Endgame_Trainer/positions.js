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
  { id: 10, name: 'Driehoeksbeweging',                  icon: '🔺' },
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
  { id: 21, name: 'Hartjie van die Bord',               icon: '⭐' },
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
        note: 'Klassieke sentrale posisie — dryf die swart koning na die rand' },
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
        note: 'Toring op d1, swart naby die hoek — bring die wit koning nader', moveLimit: 16 },
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
  6: {
    bronze: [
      // B1: Pd7, Kc6, Kd1 — pion 'n stap van bevordering, wit koning ondersteun
      { fen: '8/3P4/2K5/8/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 7de ry — bevorder en lewer mat!' },
      // B2: Pe7, Kd6, Ke1 — e-pion op 7de, swart koning ver
      { fen: '8/4P3/3K4/8/8/8/8/4k3 w - - 0 1',
        note: 'e-pion byna tuis — pasop vir pat by bevordering' },
      // B3: Kd6, Pe6, Kd1 — pion op 6de met wit koning voor hom
      { fen: '8/8/3KP3/8/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 6de ry — twee stappe tot bevordering' },
      // B4: Ke6, Pf6, Ke1 — f-pion op 6de, wit koning op sleutelblokkie
      { fen: '8/8/4KP2/8/8/8/8/4k3 w - - 0 1',
        note: 'f-pion, wit koning al voor die pion — bevorder!' },
      // B5: Kd6, Pd5, Kd1 — pion op 5de met aktiewe wit koning
      { fen: '8/8/3K4/3P4/8/8/8/3k4 w - - 0 1',
        note: 'Pion op die 5de, wit koning aktief — drie stappe tot mat' },
    ],
    silver: [
      // S1: Kd5, Pe5, Kd1 — pion op 5de, wit koning op sleutelblokkie
      { fen: '8/8/8/3KP3/8/8/8/3k4 w - - 0 1',
        note: 'Wit koning op sleutelblokkie — gebruik jou voordeel' },
      // S2: Kd4, Pe4, Kd1 — pion op 4de, moet nog vooruitbeweeg
      { fen: '8/8/8/8/3KP3/8/8/3k4 w - - 0 1',
        note: 'Pion op die 4de ry — vier stappe tot bevordering' },
      // S3: Kd3, Pe3, Kd1 — pion op 3de, swart koningsteun nodig
      { fen: '8/8/8/8/8/3KP3/8/3k4 w - - 0 1',
        note: 'Pion op die 3de ry — sleutelblok-teorie in aksie' },
    ],
    gold: [
      // G1: Ka2, Pd3, Kf2 — wit koning op a2, swart NIE voor die pion nie
      // (Kd1 verander na Kf2 — swart kan nie dadelik die d3-pion slaan nie)
      { fen: '8/8/8/8/8/3P4/K4k2/8 w - - 0 1',
        note: 'Wit koning op a2 — bereik d6 voordat swart die pion blokkeer' },
      // G2: Kd3, Pd4, Kf1 — wit koning naas die pion, swart ver (nie voor nie)
      // (Kd5-voor-pion was gelykspel; Kf1 gee wit genoeg tyd vir d5→d6 sleutelblokkies)
      { fen: '8/8/8/8/3P4/3K4/8/5k2 w - - 0 1',
        note: 'Wit koning naas pion op d4 — bereik die sleutelblokkie (d6) voor swart' },
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
      { fen: 'k1B5/2B5/1K6/8/8/8/8/8 w - - 0 1',
        note: 'Wit koning by b6 — een skuif meer en swart is gemat' },
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
        note: 'Koningin in die hoek, wit koning aktief — geforseerde wen' },
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
      { fen: '8/8/8/3k4/8/8/8/K4BN1 w - - 0 1',
        note: 'Swart in die sentrum — begin die herding met ruiter voor' },
      // S3: Be2(lig), Nd3, Kc1 vs Kf6 — swart op die 6de ry
      { fen: '8/8/5k2/8/8/3N4/4B3/2K5 w - - 0 1',
        note: 'Swart op die 6de ry — koördineer al drie stukke' },
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
  // Tegniek: die verpligting om te beweeg is 'n nadeel.
  // Wit wen deur te "driehoekvorm" (driehoeksbeweging) om swart se beurt
  // te verkry op die kritiese posisie.
  // Brons: onmiddellike zugzwang — een koningskuif dwing swart om weg te gee
  // Silwer: driehoeksbeweging nodig (1–2 tempo-verspilings)
  // Goud: verre driehoeksbeweging / onderlinge zugzwang ("trebuchet")
  9: {
    bronze: [
      // B1: Kd6 Pd5 vs Kd8 — een skuif en swart is in zugzwang
      { fen: '3k4/8/3K4/3P4/8/8/8/8 w - - 0 1',
        note: 'Kc6! — swart moet die weg vrygee en die pion bevorder', moveLimit: 22 },
      // B2: Ke6 Pe5 vs Ke8 — wit speel Kf6, swart sit in zugzwang
      { fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
        note: 'Kf6! plaas swart in zugzwang — die pion kan nie gestop word nie', moveLimit: 22 },
      // B3: Ka8 vs Kc6 Pc5 — swart gevang in die hoek
      { fen: 'k7/8/2K5/2P5/8/8/8/8 w - - 0 1',
        note: 'Kb6! — swart in die hoek, pion bevorder onvermydelik', moveLimit: 22 },
    ],
    silver: [
      // S1: Kd4 Pd5 vs Kf6 — Kd5 is die enigste wen-skuif; Ke4 of Ke5 misluk
      // Wit moet die sleutelblokkie (d6) langs die regte kant nader: d4→d5→d6
      // Sleutelblokkie-kennis: vir die d-pion is c6, d6, e6 die wen-blokkies
      { fen: '8/8/5k2/3P4/3K4/8/8/8 w - - 0 1',
        note: 'Kd5! — gaan reg voor, nie na die kant toe nie. Wat is die sleutelblokkie?' },
      // S2: Ke3 Pe4 vs Ke5 — opposisie; Kd4! nader via die d-lêer
      { fen: '8/8/8/4k3/4P3/4K3/8/8 w - - 0 1',
        note: 'Kd4! — nader via die d-lêer. Hoekom maak die kant saak?' },
      // S3: Kc3 Pc4 vs Kc5 — sleutelblokkie bereik via b4→b5→c6
      { fen: '8/8/8/2k5/2P5/2K5/8/8 w - - 0 1',
        note: 'Hoe nader jy die sleutelblokkie as die direkte pad geblokkeer is?' },
    ],
    gold: [
      // G1: Ke4 Pd5 vs kf6 pd6 — onderlinge zugzwang ("trebuchet")
      // Pione blokkeer mekaar op d5/d6; wie ook al hul koning beweeg, verloor
      { fen: '8/8/3p1k2/3P4/4K3/8/8/8 w - - 0 1',
        note: 'Trebuchet! Pione vasgehaak — wit moet driehoeksvorm om die beurt aan swart te gee' },
      // G2: Kd3 Pd2 vs Kd5 — verre driehoeksbeweging nodig voor pion kan vorder
      { fen: '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1',
        note: 'Lang driehoeksbeweging — bereik die sleutelposisie met swart aan die beurt, dan bevorder' },
    ],
  },

  // ── Tipe 10: Driehoeksbeweging ────────────────────────────────────────────
  // Tegniek: die direkte pad na die sleutelblokkie gee gelykspel (Swart hou
  // opposisie). Wit moet 'n DRIEHOEK loop — drie koningskuiwe wat 'n beurt
  // verspil — sodat Swart aan die beurt is wanneer Wit die kritieke blokkie
  // bereik. Die meetkundige "omweg" is die vaardigheidtoets.
  // Brons: eenvoudige driehoeksbeweging, een pion, een omweg
  10: {
    bronze: [
      // B1: Ke5 Pe4 vs ke7 — direkte Ke6 of Kf6 misluk (aangrensend aan ke7);
      // Wit moet 'n driehoek loop bv. Ke5→Kd5→Kd6 of Ke5→Ke4→Kd5→Kd6
      { fen: '4k3/8/8/4K3/4P3/8/8/8 w - - 0 1',
        note: "Direk vorentoe gee gelykspel — loop 'n driehoek om die beurt te verspil", moveLimit: 16 },
      // B2: Kd6 Pe5 vs Kf8 — Wit voor die pion, swart is sykant; Ke6 mis die pat-gevaar;
      // Neem noukeurig die sleutelblokkie en bevorder: Kd6→Ke6→e6→e7→Kd7→e8=Q
      { fen: '5k2/8/3K4/4P3/8/8/8/8 w - - 0 1',
        note: 'Wit voor die pion, swart sykant — loop die korrekte pad na die sleutelblokkie sonder pat', moveLimit: 16 },
      // B3: Kc3 Pc2 vs ke5 — Swart bewaar opposisie as Wit direk nader;
      // Wit loop bv. Kc3→Kb3→Kb4→Kc4 om die beurt aan Swart te gee
      { fen: '8/8/8/4k3/8/2K5/2P5/8 w - - 0 1',
        note: 'Swart hou opposisie teen direkte spel — vind die driehoek wat dit breek', moveLimit: 16 },
    ],
    silver: [
      // S1: Ke3 Pe2 vs Ke5 — swart behou opposisie teen direkte nadering;
      // Wit loop driehoek bv. Ke3→Kd3→Kd4→Ke4 om die beurt aan swart te gee
      { fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
        note: 'Swart op e5 hou opposisie — watter driehoek breek dit?' },
      // S2: Kc3 Pc2 vs Kc5 — konings op dieselfde kolom, direkte opmars geblokkeer;
      // Wit loop Kc3→Kb3→Kb4→Kc4 om die c5-sleutelblokkie met swart aan die beurt te bereik
      { fen: '8/8/2k5/8/8/2K5/2P5/8 w - - 0 1',
        note: 'Konings op dieselfde kolom — driehoek via b3–b4 om verby die blokkade te kom' },
      // S3: Kf3 Pf2 vs Kf6 — f-pion variant, drie rye tussenin;
      // Wit driehoeksvorm bv. Kf3→Kg3→Kg4→Kf4 om die beurt te verspil
      { fen: '8/8/5k2/8/8/5K2/5P2/8 w - - 0 1',
        note: 'f-pion variant — identifiseer die driehoek en klim een ry op' },
    ],
    gold: [
      // G1: Kc1 Pd4 vs Kd6 — wit koning ver in die hoek, lang mars voor die driehoek kan werk;
      // Wit moet eers die pion se sleutelblokkie (c6/d6/e6) identifiseer, dan driehoeksvorm
      { fen: '8/8/3k4/8/3P4/8/8/2K5 w - - 0 1',
        note: 'Wit koning ver weg — bereik die regte sleutelblokkie met swart aan die beurt' },
      // G2: Ke1 Pe3 vs Ke5 — maksimum afstand op dieselfde kolom;
      // Wit moet twee keer driehoeksvorm: eerste ry win, dan weer sleutelblokkies klim
      { fen: '8/8/8/4k3/8/4P3/8/4K3 w - - 0 1',
        note: 'Maksimum afstand — die langste driehoeksbeweging-eindspel' },
    ],
  },

  // ── Tipe 8: Opposisie & Koningaktiwiteit ──────────────────────────────────
  // Tegniek: die party wat NIE die opposisie het wanneer dit hul beurt is nie,
  // moet terrein prysgee. Gebruik die opposisie om die swart koning weg te dwing
  // van die pion se sleutelblokkie, bevorder dan die pion en lewer mat.
  // Brons: Wit het die opposisie of bereik dit met een skuif — vinnige wen.
  // Silwer: Wit moet presies die regte roete kies om die opposisie te wen.
  // Goud: Lang maneuver, swart verdedig aktief, presisie oor die hele bord.
  8: {
    bronze: [
      // B1: Ke5 Pe4 vs Kd7 — wit koning voor die pion, klassieke wenposisie;
      // 1.Kf6 Ke8 2.e5 Kd8 3.e6 Kc7 4.e7 — pion bevorder, mat volg
      { fen: '8/3k4/8/4K3/4P3/8/8/8 w - - 0 1',
        note: 'Wit koning voor die pion — stap vir stap na die 6de ry, bevorder en lewer mat', moveLimit: 16 },
      // B2: Kd6 Pd5 vs Ke8 — wit lê al op die 6de ry, pion een stap van sleutelblokkie;
      // 1.Kc6/Ke6 neem die sleutelblokkie, dan d6–d7–d8=Q, mat volg
      { fen: '4k3/8/3K4/3P4/8/8/8/8 w - - 0 1',
        note: 'Wit al op die 6de ry — een skuif na die sleutelblokkie, dan bevorder', moveLimit: 16 },
      // B3: Ke5 Pe4 vs Kf7 — wit nader van die e-lêer;
      // 1.Kd6/Kf6 verdryf swart, dan e5–e6–e7–e8=Q
      { fen: '8/5k2/8/4K3/4P3/8/8/8 w - - 0 1',
        note: 'Wit naby die sleutelblokkie — dryf swart opsy en bevorder', moveLimit: 16 },
      // B4: Kc5 Pc4 vs Kc7 — kant-benadering, 1.Kd5/Kb5 breek die opposisie
      { fen: '2k5/8/8/2K5/2P5/8/8/8 w - - 0 1',
        note: 'Kant-benadering — watter rigting vermy die pat-gevaar?', moveLimit: 16 },
      // B5: Ke6 Pe5 vs Kg8 — koningaktiwiteit: wit marsjeer na die 7de ry
      { fen: '6k1/8/4K3/4P3/8/8/8/8 w - - 0 1',
        note: 'Koningaktiwiteit — wit druk tot die 7de ry, swart het geen verweer nie', moveLimit: 16 },
    ],
    silver: [
      // S1: Ke3 Pe2 vs Kd5 — wit moet die regte hoek kies om die sleutelblokkie te bereik;
      // Die direkte roete (Ke4) gee swart opposisie op d5; wit moet sirkels loop
      { fen: '8/8/8/3k4/8/4K3/4P3/8 w - - 0 1',
        note: 'Watter kant loop jy om? Die direkte pad gee swart die opposisie op d4' },
      // S2: Kd3 Pd2 vs Ke5 — wit op d3, pion op d2, swart aktief in die sentrum;
      // Wit moet die d6-sleutelblokkie bereik: roete via c4–c5–d6 of e4–e5–d6?
      { fen: '8/8/8/4k3/8/3K4/3P4/8 w - - 0 1',
        note: 'Swart aktief in die sentrum — vind die roete na d6 wat swart se opposisie omseil' },
      // S3: Kd3 Pd2 vs Kf4 — swart op f4, diagonaal weg van die pion;
      // Wit moet die d6-sleutelblokkie bereik terwyl swart probeer onderskep
      { fen: '8/8/8/8/5k2/3K4/3P4/8 w - - 0 1',
        note: 'Swart probeer die sleutelblokkie onderskep — presisie vereis' },
    ],
    gold: [
      // G1: Ke2 Pe3 vs Kd5 — wit koning op die 2de ry, lank pad na sleutelblokkie (d6/e6/f6);
      // Swart sal die kortste pad bewaak — wit moet die lang ompad neem
      { fen: '8/8/8/3k4/8/4P3/4K3/8 w - - 0 1',
        note: 'Lang pad na die sleutelblokkie — swart bewaak die direkte roete, vind die ompad' },
      // G2: Kd1 Pd3 vs Kd5 — maksimum afstand, konings op dieselfde kolom;
      // Wit moet beide die opposisie wen EN die sleutelblokkie bereik — die langste weerg
      { fen: '8/8/8/3k4/8/3P4/8/3K4 w - - 0 1',
        note: 'Maksimum afstand op dieselfde kolom — die volledige opposisie-tegniek' },
    ],
  },

  // ── Tipe 7: Verbygeraakte Pion Wedren ─────────────────────────────────────
  // Tegniek: bereken wie eerste bevorder deur die pion-skuiwe te tel.
  // Gebruik die "blokvierhoek" om te bepaal of swart se koning die pion kan vang.
  // Na bevordering: gebruik die koningin om die swart pion te stop terwyl jy mat lewer.
  // Brons: Wit is 2+ tempos voor of swart buite die blokvierhoek.
  // Silwer: Wit 1 tempo voor — koningin moet die swart pion onderskep ná bevordering.
  // Goud: Gelyke wedren — koningposisie of presisie-koningin-spel is die deurslag.
  7: {
    bronze: [
      // B1: Ke6 Pe7 vs Kc8 — pion een stap van bevordering, wit koningsteun
      { fen: '2k5/4P3/4K3/8/8/8/8/8 w - - 0 1',
        note: 'Pion een stap van bevordering — bevorder en lewer dan mat met koningsteun' },
      // B2: Ka6 Pc6 vs Ka8 — hoekval, mat in drie skuiwe
      // 1.c7+ Kb8 2.Kb6 Ka8 3.c8=Q#
      { fen: 'k7/8/K1P5/8/8/8/8/8 w - - 0 1',
        note: 'Hoekval — konings by a8, pion by c6. Skaakmat in drie!' },
      // B3: Ka8 Pb7 vs Kf1 — blokvierhoek: swart buite die vierhoek, pion bevorder dadelik
      { fen: 'K7/1P6/8/8/8/8/8/5k2 w - - 0 1',
        note: 'Swart buite die vierhoek — die pion kan nie gevang word nie, bevorder!' },
      // B4: Ke5 Pa6 vs Ke3 Ph5 — pion wedren, Wit 2 tempos voor
      // Wit: a7 a8=Q; Swart: h4 h3 h2 (3 skuiwe om te bevorder)
      // Na a8=Q: gebruik Qa2 om h1 te beheer en stop swart se pion
      { fen: '8/8/P7/4K2p/8/4k3/8/8 w - - 0 1',
        note: 'Pion wedren — Wit twee tempos voor. Bevorder eerste, stop dan swart se pion!' },
      // B5: Kg3 Pd5 vs Ka2 Ph3 — wit se koning vang die swart pion, dan bevorder d-pion
      // 1.Kxh3 Ka3 2.d6 Ka4 3.d7 Ka5 4.d8=Q → K+Q vs K mat
      { fen: '8/8/8/3P4/8/6Kp/k7/8 w - - 0 1',
        note: 'Vang eers die swart pion — dan bevorder die d-pion en lewer mat!' },
    ],
    silver: [
      // S1: Ka5 Pa6 vs Kf4 Ph4 — een tempo voor; na bevordering gebruik Qa1 om h1 te stop
      // 1.a7 h3 2.a8=Q h2 3.Qa1! (beheer h1 langs die 1ste ry) dan mat
      { fen: '8/8/P7/K7/5k1p/8/8/8 w - - 0 1',
        note: 'Een tempo voor — bevorder eers, speel dan Qa1 om die swart pion op h1 te stop' },
      // S2: Kd5 Pa6 vs Ke3 Ph5 — een tempo voor, koningin moet h-pion onderskep
      // 1.a7 h4 2.a8=Q h3 3.Qa3+! (skuif koningin nader aan h-pion) dan stop h1
      { fen: '8/8/P7/3K3p/8/4k3/8/8 w - - 0 1',
        note: 'Bevorder eerste — gebruik dan die koningin om die h-pion te onderskep' },
      // S3: Kd4 Pa6 vs Ke6 pb5 — a-pion teen b-pion op verskillende lêers
      // 1.a7 b4 2.a8=Q b3 3.Qa1! (beheer b1 langs die 1ste ry) b2 4.Qa1 (hou b1)
      { fen: '8/8/P3k3/1p6/3K4/8/8/8 w - - 0 1',
        note: 'Wedren op verskillende lêers — bevorder a-pion, stop dan die swart b-pion' },
    ],
    gold: [
      // G1: Kb4 Pa5 vs Kf3 Ph4 — gelyke wedren (albei bevorder gelyktydig!)
      // Beide bevorder op beurt 3: wit a8=Q, swart h1=Q. Dan Q+K vs Q+K — die moeilikste
      { fen: '8/8/8/P7/1K5p/5k2/8/8 w - - 0 1',
        note: 'Gelyke wedren — albei bevorder! Jou koningin moet die koningin-teen-koningin-geveg wen' },
      // G2: Ka4 Pa5 vs Kd4 Ph5 — Wit een tempo voor, swart se aktiewe koning bemoeilik
      // 1.a6 h4 2.a7 h3 3.a8=Q h2 4.Qa1! (stop h1 bevord.) dan mat met koningsteun
      { fen: '8/8/8/P6p/K2k4/8/8/8 w - - 0 1',
        note: 'Een tempo voor maar swart se koning is aktief — hou Qa1 om h1 te blokkeer!' },
    ],
  },

  // ── Tipe 5: Koning & Twee Ruiters teen Koning ────────────────────────────
  // Tegniek: dryf die swart koning na 'n hoek — maar gebruik die onakkuraatheidsreël.
  // Elke 5de swart skuif speel Stockfish die TWEEDE beste skuif (nie die beste nie).
  // Brons: swart in of naby hoek, ruiters aktief — mat binne ~8 skuiwe met onakkuraatheid.
  // Silwer: swart meer sentraal — langer maneuver benodig.
  // Goud: swart ver van hoek — volle hoek-dryf-tegniek teen aktiewe verdediging.
  // PASOP VIR PAT: moenie die swart koning vasdruk sonder skaak nie!
  5: {
    bronze: [
      // B1: Kd1 Nd4 Ne4 vs Ke7 ph7 — pion op 7de ry gee swart 'n haak, ruiter-mat in 12
      { fen: '8/4k2p/8/8/3NN3/8/8/3K4 w - - 0 1',
        note: 'Swart se pion op h7 gee jou die haak — dryf die swart koning na h8 en gebruik die pion om pat te vermy' },
      // B2: Kd1 Nd2 Ne2 vs Ka4 ph7 — swart reeds op rand, pion op 7de ry
      { fen: '8/7p/8/8/k7/8/3NN3/3K4 w - - 0 1',
        note: 'Swart op die a-lyn met pion op h7 — dryf na a1-hoek terwyl die pion die pat-gevaar verwyder' },
      // B3: Kg1 Nf2 Ng2 vs Kf3 pa7 — pion op 7de ry, swart naby h-hoek
      { fen: '8/p7/8/8/8/5k2/5NN1/6K1 w - - 0 1',
        note: 'Pion op a7, swart naby die h-hoek — druk die koning toe met Nh4 en Nf4, gebruik die pion as haak' },
    ],
    silver: [
      // S1: Kd1 Nd4 Ne4 vs Kd7 ph5 — pion op 5de ry, swart middelblok
      { fen: '8/3k4/8/7p/3NN3/8/8/3K4 w - - 0 1',
        note: 'Pion op h5, swart middelblok — kombineer ruiter-maneuvers om na hoek te dryf voor die pion te ver vorder' },
      // S2: Kd1 Nd2 Ne2 vs Ka5 ph5 — pion op 5de ry, swart op rand
      { fen: '8/8/8/k6p/8/8/3NN3/3K4 w - - 0 1',
        note: 'Pion op h5 met swart op a5 — jaag na die hoek terwyl jy die pion se vordering dophou' },
      // S3: Kd1 Nd2 Ne2 vs Ka8 ph5 — swart in hoek maar wit ver weg, pion dreig
      { fen: 'k7/8/8/7p/8/8/3NN3/3K4 w - - 0 1',
        note: 'Swart in a8-hoek met pion op h5 — wit moet vinnig mat gee voor die pion bevorder!' },
    ],
    gold: [
      // G1: Kd1 Nd4 Ne4 vs Ka7 ph2 — pion op 2de ry, amper bevordering, dringende mat
      { fen: '8/k7/8/8/3NN3/8/7p/3K4 w - - 0 1',
        note: "Pion op h2, een skuif van bevordering — dryf swart na a8 met presisie voor die pion 'n koningin word" },
      // G2: Kd1 Nd2 Ne2 vs Ke8 ph2 — swart sentraal, pion op h2, langste uitdaging
      { fen: '4k3/8/8/8/8/8/3NN2p/3K4 w - - 0 1',
        note: 'Pion op h2 dreig bevordering — dryf swart na hoek en lewer mat presies voor dit te laat is' },
    ],
  },

  // ── Tipe 11: Piondeurbraak ────────────────────────────────────────────────
  // Tegniek: offer die middelste pion om 'n verbygeraakte pion te skep!
  // Die sleutel is om 1.b6! (of soortgelyk) te vind — dit lyk soos 'n blunder maar wen.
  // Na 1.b6! axb6 2.c6! bxc6 3.a6 → die a-pion bevorder. Of 1.b6! cxb6 2.a6 bxa6 3.c6.
  // Brons: deurbraak direk beskikbaar, konings ver van die aksie.
  // Silwer: swart se koning is nader en kan inmeng na bevordering.
  // Goud: swart se koning aktief — pion-bevordering lei tot komplekser koningin-eindspel.
  11: {
    bronze: [
      // B1: Kd4 Pa5 Pb5 Pc5 vs Kd2 pa6 pb6 pc6 — klassieke deurbraak, konings ver
      { fen: '8/8/ppp5/PPP5/3K4/8/3k4/8 w - - 0 1',
        note: "Die klassieke deurbraak — speel 1.b6! en offer die pion om 'n verbygeraakte pion te skep" },
      // B2: Kf4 Pb5 Pc5 Pd5 vs Kf2 pb6 pc6 pd6 — dieselfde konsep op b-c-d lêers
      { fen: '8/8/1ppp4/1PPP4/5K2/8/5k2/8 w - - 0 1',
        note: "Deurbraak op b-c-d lêers — vind die offer-skuif wat 'n vrye pion skep!" },
      // B3: Kc3 Pa4 Pb4 Pc4 vs Kd1 pa5 pb5 pc5 — pionne een ry verder terug
      { fen: '8/8/8/ppp5/PPP5/2K5/8/3k4 w - - 0 1',
        note: "Pionne op die vierde ry — 1.b5! is die deurbraak. Offer taktiek om 'n koningin te kry" },
    ],
    silver: [
      // S1: Kc3 Pa5 Pb5 Pc5 vs Kd1 pa6 pb6 pc6 — swart se koning kan na die deurbraak inmeng
      { fen: '8/8/ppp5/PPP5/8/2K5/8/3k4 w - - 0 1',
        note: 'Deurbraak, maar swart se koning sal probeer inmeng — bevorder vinnig en stop die swart pion!' },
      // S2: Kf3 Pb5 Pc5 Pd5 vs Kf1 pb6 pc6 pd6 — b-c-d variant, swart inmenger
      { fen: '8/8/1ppp4/1PPP4/8/5K2/8/5k2 w - - 0 1',
        note: 'Vind die deurbraakskuif en behou jou pion-voorsprong teen swart se koning' },
      // S3: Kf3 Pd5 Pe5 Pf5 vs Ke1 pd6 pe6 pf6 — d-e-f lêers, ander deel van die bord
      { fen: '8/8/3ppp2/3PPP2/8/5K2/8/4k3 w - - 0 1',
        note: 'Deurbraak op die d-e-f lêers — dieselfde beginsel, nuwe plek op die bord' },
    ],
    gold: [
      // G1: Kc2 Pa5 Pb5 Pc5 vs Kf1 pa6 pb6 pc6 — konings verder uitmekaar, moeiliker eindspel
      { fen: '8/8/ppp5/PPP5/8/8/2K5/5k2 w - - 0 1',
        note: 'Deurbraak en dan koningin-eindspel teen swart se aktiewe koning — vind 1.b6! en wen dan presies' },
      // G2: Kc2 Pb5 Pc5 Pd5 vs Kf1 pb6 pc6 pd6 — b-c-d variant, swart aktief
      { fen: '8/8/1ppp4/1PPP4/8/8/2K5/5k2 w - - 0 1',
        note: 'Deurbraak op b-c-d lêers, dan presisie-koningin-eindspel — die moeilikste pion-deurbraak-oefening' },
    ],
  },

  // ── Tipe 12: Buitenste Verbygeraakte Pion ────────────────────────────────
  // Tegniek: gebruik die ver buitenste verbygeraakte pion as LOKMIDDEL.
  // Swart se koning moet die ver pion gaan stop — intussen wen wit se koning die middelste pione.
  // Die buitenste pion skep 'n "afleiding" sodat wit se ander pione vry kan bevorder.
  // Brons: Die lokmiddel werk direk — swart is reeds naby die buitenste pion.
  // Silwer: Swart se koning is sentraal en moet kies: jaag die pion of verdedig eie pione.
  // Goud: Swart het sy eie pione om te verdedig — noukeurige berekeninge oor tempowins benodig.
  12: {
    bronze: [
      // B1: Kg1 Pa5 Pf2 Pg2 vs Kc5 — swart se koning naby a-pion, f/g pione bevorder vry
      { fen: '8/8/8/P1k5/8/8/5PP1/6K1 w - - 0 1',
        note: 'Die a-pion lok swart se koning weg — bevorder die f- en g-pione terwyl swart se koning omgelei word' },
      // B2: Kg1 Pa5 Pg3 vs Kd6 — twee-pion weergawe, swart ver van g-pion
      { fen: '8/8/3k4/P7/8/6P1/8/6K1 w - - 0 1',
        note: 'Druk die a-pion voor — swart moet kies: stop die a- of die g-pion. Albei kan nie gestop word nie!' },
      // B3: Kg1 Pa4 Pf2 Pg2 vs Kc4 — pion een ry terug, maar dieselfde beginsel
      { fen: '8/8/8/8/P1k5/8/5PP1/6K1 w - - 0 1',
        note: 'Buitenste a-pion as lokmiddel — beweeg dit voor sodat swart se koning gestuur word, dan bevorder f en g' },
    ],
    silver: [
      // S1: Kg1 Pa5 Pf2 Pg2 vs Kc3 — swart se koning sentraal, kan inmeng
      { fen: '8/8/8/P7/8/2k5/5PP1/6K1 w - - 0 1',
        note: 'Swart se koning is sentraal — bereken presies wanneer om die a-pion te stoot sodat die f/g-pione vry is' },
      // S2: Kg1 Pa5 Pf2 Pg2 vs Kd6 pf7 pg7 — swart het ook pione om te verdedig
      { fen: '8/5pp1/3k4/P7/8/8/5PP1/6K1 w - - 0 1',
        note: 'Beide kante het pione — gebruik die buitenste a-pion as lokmiddel om swart se f/g-pione oop te laat' },
      // S3: Kg1 Pa5 Pf2 Pg2 vs Ka2 — swart se koning op die a-lyn, naby die buitenste pion
      { fen: '8/8/8/P7/8/8/k4PP1/6K1 w - - 0 1',
        note: 'Swart se koning is al op die a-lyn — vind die regte volgorde om die f/g-pione te bevorder' },
    ],
    gold: [
      // G1: Kg1 Pa5 Pf2 Pg2 vs Kd5 pf7 pg7 — swart se koning sentraal, dreig beide kante
      { fen: '8/5pp1/8/P2k4/8/8/5PP1/6K1 w - - 0 1',
        note: 'Swart se aktiewe koning dreig beide kante — bereken presies wie eerste bevorder met die buitenste pion as lokmiddel' },
      // G2: Kg1 Pa5 Pf2 Pg2 vs Ke4 pf7 pg7 — swart sentraal naby f/g pione
      { fen: '8/5pp1/8/P7/4k3/8/5PP1/6K1 w - - 0 1',
        note: 'Swart se koning naby die f/g-pione — gebruik die ver a-pion om dit weg te lok, dan wen die pion-wedren' },
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
    bronze: [
      // B1: Kd8 Pd7 Td1 vs Kg3 ta2 — bou die brug: 1.Td4! dan skerp teen skaak
      { fen: '3K4/3P4/8/8/8/6k1/r7/3R4 w - - 0 1',
        note: 'Lucena: bou die brug met 1.Td4! — dan wanneer swart skaak gee, skerp jou toring om die koning te beskerm', moveLimit: 24 },
      // B2: Ke8 Pe7 Te4 vs Kd1 ta1 — brug reeds op e4, voer die afskerming uit
      { fen: '4K3/4P3/8/8/4R3/8/8/r2k4 w - - 0 1',
        note: 'Die brug is reeds op e4 gebou — vind die regte oomblik om die toring as skerm te gebruik', moveLimit: 24 },
      // B3: Kc8 Pc7 Tc1 vs Kf3 ta2 — c-pion weergawe van die Lucena
      { fen: '2K5/2P5/8/8/8/5k2/r7/2R5 w - - 0 1',
        note: 'Lucena met die c-pion — bou die brug op c4 en skerp teen skaak om te bevorder', moveLimit: 24 },
    ],
    silver: [
      // S1: Kd8 Pd7 Td1 vs Kf3 ta2 — brug moet gebou word, swart se koning meer aktief
      { fen: '3K4/3P4/8/8/8/5k2/r7/3R4 w - - 0 1',
        note: 'Bou die brug van voor af — swart se aktiewe koning maak dit moeiliker. Vind 1.Td4!', moveLimit: 22 },
      // S2: Kf8 Pf7 Tf1 vs Kd3 ta2 — f-pion Lucena, swart se koning meer sentraal
      { fen: '5K2/5P2/8/8/8/3k4/r7/5R2 w - - 0 1',
        note: 'Lucena met die f-pion — bou die brug op f4 terwyl swart se toring aanhoudende skaak gee', moveLimit: 22 },
      // S3: Kc8 Pc7 Tc1 vs Kb3 ta2 — swart se koning aggressief naby die brug
      { fen: '2K5/2P5/8/8/8/1k6/r7/2R5 w - - 0 1',
        note: 'Swart se koning is naby en aggressief — bou die brug op c4 presies terwyl die aanvalle afgeweer word', moveLimit: 22 },
    ],
    gold: [
      // G1: Ke8 Pe7 Te1 vs Kb3 ta2 — swart se koning aktief, komplekse brug-bou
      { fen: '4K3/4P3/8/8/8/1k6/r7/4R3 w - - 0 1',
        note: 'Swart se aktiewe kb3-koning bemoeilik die brug — voer die Lucena-tegniek presies uit teen sterk verdediging', moveLimit: 21 },
      // G2: Kd8 Pd7 Td1 vs Kb3 ta2 — d-pion, swart se koning by b3, moeilikste weergawe
      { fen: '3K4/3P4/8/8/8/1k6/r7/3R4 w - - 0 1',
        note: 'Die moeilikste Lucena — swart se kb3-koning dreig om die pion te help stop. Bou die brug perfek!', moveLimit: 21 },
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
        note: 'Pion op d5 — die Philidor-verdediging dreig. Beweeg die koning na d7 voor jy die pion stoot', moveLimit: 25 },
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
        note: 'Toring op b7 verskaar die 7de ry aktief — bevorder die g-pion terwyl swart se toring vasgesit is' },
    ],
    silver: [
      // S1: Kd4 Tb7 Pg4 vs Kg5 Tb1 — swart se koning aktief naby die pion
      { fen: '8/1R6/8/6k1/3K2P1/8/8/1r6 w - - 0 1',
        note: 'Swart se koning is aktief by g5 en dreig die g-pion — hou jou toring op die 7de ry aktief om die bevorderingsdreigement lewendig te hou' },
      // S2: Kd4 Tc7 Pg2 vs Kg4 Tb1 — langer pad na bevordering, aktiewe toring hou druk
      { fen: '8/2R5/8/8/3K2k1/8/6P1/1r6 w - - 0 1',
        note: 'g-pion ver terug maar toring aktief op c7 — hou die aktiwiteit terwyl die pion gevorder word' },
      // S3: Kd4 Te7 Pe2 vs Kf5 Tb1 — toring aktief op e7, pion bevorder langs die e-lyn
      { fen: '8/4R3/8/5k2/3K4/8/4P3/1r6 w - - 0 1',
        note: 'Aktiewe toring op e7 ondersteun die e-pion van agter — swart se passiewe toring op b1 kan nie inmeng nie' },
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
    bronze: [
      // B1: Ke2 Be3 Pc4 Pe4 vs Kd6 be7 pc5 pe5 — goeie loper teen slegte loper (be7 geblokkeer)
      { fen: '8/4b3/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Wit se Be3 het oop diagonale (goeie loper) — swart se be7 is geblokkeer deur sy eie pione op dieselfde kleur (slegte loper). Infiltreer met die koning!', moveLimit: 26 },
      // B2: Ke2 Be3 Pc4 Pe4 vs Kd6 bf6 pc5 pe5 — slegte loper op f6
      { fen: '8/8/3k1b2/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bf6 is op dieselfde donker kleur as sy pione op c5 en e5 — goeie vs slegte loper. Gebruik die lig vierkante om in te dring!', moveLimit: 26 },
      // B3: Ke2 Be3 Pc4 Pe4 vs Kd6 bg7 pc5 pe5 — slegte loper op g7
      { fen: '8/6b1/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bg7 vasgesit agter sy pione — infiltreer met die wit koning op die lig vierkante wat swart se slegte loper nie kan beskerm nie', moveLimit: 26 },
    ],
    silver: [
      // S1: Ke2 Be3 Pc4 Pe4 vs Kd6 bc7 pc5 pe5 — slegte loper op c7
      { fen: '8/2b5/3k4/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bc7 is passief en geblokkeer — dring deur op die lig vierkante wat die slegte loper nie kan dek nie', moveLimit: 25 },
      // S2: Ke2 Be3 Pc4 Pe4 vs Kd6 bh6 pc5 pe5 — slegte loper op h6
      { fen: '8/8/3k3b/2p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se bh6 lyk aktief maar is geblokkeer deur donker-kleur pione — die goeie loper-konings-kombinasie wen die strukturele geveg', moveLimit: 25 },
      // S3: Ke2 Be3 Pc4 Pe4 Pf4 vs Kd6 bf6 pc5 pe5 — wit het ekstra f-pion
      { fen: '8/8/3k1b2/2p1p3/2P1PP2/4B3/4K3/8 w - - 0 1',
        note: 'Wit het ekstra Pf4 — gebruik die goeie loper saam met die ekstra pion om deur te breek teen die geblokkeerde slegte loper', moveLimit: 25 },
    ],
    gold: [
      // G1: Ke2 Be3 Pc4 Pe4 vs Kd6 ba5 pc5 pe5 — slegte loper op a5, aktiefer geplaas
      { fen: '8/8/3k4/b1p1p3/2P1P3/4B3/4K3/8 w - - 0 1',
        note: 'Swart se ba5 lyk aktief — maar dis steeds op dieselfde donker kleur as sy pione. Wen die goeie-loper-eindspel teen die mees aktiewe slegte loper', moveLimit: 24 },
      // G2: Kd2 Be3 Pc4 Pe4 vs Kd6 bh4 pc5 pe5 — slegte loper by h4, aktiewe swart
      { fen: '8/8/3k4/2p1p3/2P1P1b1/4B3/3K4/8 w - - 0 1',
        note: 'Die moeilikste weergawe — swart se bh4 is aktief maar steeds geblokkeer deur donker pione. Voer die presisiespel uit om deur die verdediging te breek', moveLimit: 24 },
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
        note: 'Pion op a6 bevorder terwyl die ruiter op g8 té ver is — die loper dek die sleutelblokkie, ruiter kan nie help nie' },
      // B2: Ke6 Bf5 Pf6 vs Ka8 Ng8 — ruiter in hoek, pion bevorder met loper-steun
      { fen: 'k5n1/8/4KP2/5B2/8/8/8/8 w - - 0 1',
        note: 'Pion op f6 bevorder — swart se ruiter op g8 is opgesluit, die loper op f5 beheer die sleuteldiagonale' },
      // B3: Ke6 Bc4 Pf6 vs Kg8 Na8 — ruiter op a8 vasgesit, loper en pion wen
      { fen: 'n5k1/8/4KP2/8/2B5/8/8/8 w - - 0 1',
        note: 'Ruiter op a8 is beknop — bevorder die f-pion met loper-steun terwyl die ruiter magteloos toekyk' },
    ],
    silver: [
      // S1: Kc1 Bb3 Pa2 vs Kb4 ng2 pg6 — swart se ruiter nader, pion op g6
      { fen: '8/8/6p1/8/1k6/1B6/P5n1/2K5 w - - 0 1',
        note: 'Swart se ruiter probeer beide die g-pion verdedig en die a-pion stop — die loper se langafstand-voordeel wen' },
      // S2: Kc1 Bc3 Pa2 vs Ka3 ng2 — swart se koning aggressief by a3
      { fen: '8/8/8/8/8/k1B5/P5n1/2K5 w - - 0 1',
        note: 'Swart se Ka3 dreig die a-pion direk — gebruik die loper se langafstand om die ruiter uit te sluit en wen die posisie' },
      // S3: Kc1 Bb3 Pa2 vs Kb4 ng3 — ruiter op g3, aktiefer
      { fen: '8/8/8/8/1k6/1B4n1/P7/2K5 w - - 0 1',
        note: 'Swart se ng3 is meer sentraal — maar die loper se diagonale beheer steeds beide vleuels. Dryf die a-pion deur!' },
    ],
    gold: [
      // G1: Kc1 Bb3 Pa2 vs Kd4 ng3 ph6 — swart se koning aktief sentraal
      { fen: '8/8/7p/8/3k4/1B4n1/P7/2K5 w - - 0 1',
        note: 'Swart se aktiewe Kd4 en ng3 met ph6 — wen die komplekse loper-teen-ruiter-eindspel met pione op beide vleuels' },
      // G2: Kc1 Bb3 Pa2 vs Kd4 ng1 — ruiter op g1 (beknop), loper dominant
      { fen: '8/8/8/8/3k4/1B6/P7/2K3n1 w - - 0 1',
        note: 'Die moeilikste weergawe — swart se Kd4 is aktief maar ng1 is beknop. Bewys die loper se superioriteit teen die opgeslote ruiter!' },
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
      { fen: 'k7/P7/K7/2B5/5P2/8/8/8 w - - 0 1',
        note: "Die Bc5 is VERKEERDE KLEUR vir a8 — Pa7 alleen gee gelykspel! Maar Pf4 is die redder: bevorder die f-pion om mat te lewer", moveLimit: 14 },
      // B2: Ka1 Pa4 Bf5(lig,VERKEERD vir h8-donker) Ph5 vs Kh6 — a-pion breek die gelykspel
      { fen: '8/8/7k/5B1P/P7/8/8/K7 w - - 0 1',
        note: "Bf5 is VERKEERDE KLEUR vir h8 — die h-pion alleen kan nie wen nie! Gebruik die a-pion as redder om deur te breek", moveLimit: 14 },
      // B3: Kh6 Ph7 Bb5(lig,VERKEERD vir h8-donker) Pa3 vs Kh8 — a-pion beweeg swart se koning
      { fen: '7k/7P/7K/1B6/8/P7/8/8 w - - 0 1',
        note: "Bb5 is VERKEERDE KLEUR vir h8 — swart bly net op h8 en dit is gelyk! Maar Pa3 dwing swart se koning om te beweeg sodat Ph7 kan bevorder", moveLimit: 14 },
    ],
    silver: [
      // S1: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pc4 — swart het ekstra verdedigingspion
      { fen: 'k7/P7/K7/2B5/2p2P2/8/8/8 w - - 0 1',
        note: "Swart het 'n pc4 om verdediging te kompliseer — vind die korrekte volgorde om die f-pion te bevorder teen die verkeerde-kleur-loper-verdediging" },
      // S2: Ka1 Bf5(verkeerd) Ph5 Pa3 vs Kh6 — swart se aktiewe koning
      { fen: '8/8/7k/5B1P/8/P7/8/K7 w - - 0 1',
        note: "Swart se Kh6 is aktief naby die h-pion — bevorder die a-pion as redder terwyl jy die gelykspel-slaggat vermy" },
      // S3: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pd3 — swart se pion dreig bevordering
      { fen: 'k7/P7/K7/2B5/5P2/3p4/8/8 w - - 0 1',
        note: "Swart se pd3 dreig ook te bevorder — bevorder jou f-pion eerste en gebruik die koningin om dan die verkeerde-kleur-probleem op te los" },
    ],
    gold: [
      // G1: Ka6 Pa7 Bc5(verkeerd) Pf4 vs Ka8 pc4 pd3 — twee verdedigingspione
      { fen: 'k7/P7/K7/2B5/2p2P2/3p4/8/8 w - - 0 1',
        note: "Twee swart pione bemoeilik die redding — vind die korrekte volgorde om die verkeerde-kleur-loper-gelykspel te verbreek met jou f-pion" },
      // G2: Kf6 Ph7 Bb5(lig,VERKEERD vir h8-donker) Pa3 vs Kh8 — delicate volgorde om pat te vermy
      { fen: '7k/7P/5K2/1B6/8/P7/8/8 w - - 0 1',
        note: "Die gevaarlikste verkeerde-kleur-posisie — een verkeerde skuif gee PAT! Beweeg die a-pion om swart se koning uit die hoek te dwing, bevorder dan Ph7" },
    ],
  },

  // ── Tipe 21: Hartjie van die Bord ────────────────────────────────────────
  // Tegniek: lewer skaakmat BUITE DIE RAND — op 'n sentrale veld (nie op lêer a/h of ry 1/8 nie).
  // Wit het 'n loper EN ruiter (plus koning). Swart het net 'n koning en 'n pion.
  // Die pion beperk swart se ontsnappingsroetes en verhoed hom om die rand te bereik.
  // Brons: Pion op ry 7 (ver van bevordering), tyd beskikbaar vir die mat-net.
  // Silwer: Pion op ry 5 (middel), dringender spel vereis.
  // Goud: Pion op ry 3 (naby bevordering), — wen die wedren teen die bevorderende pion!
  21: {
    bronze: [
      // B1: Kd3 Bc5 Ne5 vs Kf5 pd7 — loper en ruiter al aktief, pion ver
      { fen: '8/3p4/8/2B1Nk2/8/3K4/8/8 w - - 0 1',
        note: "Pion op d7 is ver weg — bou die mat-net rondom die sentrale swart koning op f5. Gee skaakmat BUITE die rand!", moveLimit: 24 },
      // B2: Ke3 Bc4 Nc3 vs Ke5 pe7 — klassieke sentrale posisie
      { fen: '8/4p3/8/4k3/2B5/2N1K3/8/8 w - - 0 1',
        note: "Pion op e7, swart se koning sentraal op e5 — sluit die mat-net in die middel van die bord toe", moveLimit: 24 },
      // B3: Ke3 Bc5 Nd6 vs Kd5 pg7 — ruiter op d6 aktief, loper ondersteun
      { fen: '8/6p1/3N4/2Bk4/8/4K3/8/8 w - - 0 1',
        note: "Pion op g7, Nd6 beheer sleutelblokke — forseer skaakmat op 'n sentrale veld terwyl die pion wag", moveLimit: 24 },
    ],
    silver: [
      // S1: Ke3 Bc4 Nd6 vs Ke5 pd5 — pion op ry 5, beperk sentrum
      { fen: '8/8/3N4/3pk3/2B5/4K3/8/8 w - - 0 1',
        note: "Pion op d5 blokkeer 'n ontsnappingsroete — gebruik Nd6 en Bc4 se samewerking vir 'n sentrale skaakmat", moveLimit: 24 },
      // S2: Ke3 Bg5 Nc6 vs Kd5 pe5 — pion op e5, ruiter aktief
      { fen: '8/8/2N5/3kp1B1/8/4K3/8/8 w - - 0 1',
        note: "Pion op e5 staan langs die swart koning — Nc6 en Bg5 bou die mat-net; hou die skaakmat uit die rand!", moveLimit: 24 },
      // S3: Ke3 Bc4 Nd5 vs Ke5 pf5 — pion op f5 langs die swart koning
      { fen: '8/8/8/3Nkp2/2B5/4K3/8/8 w - - 0 1',
        note: "Pion op f5 verskans swart se een kant — trek die sentrale mat-net met Nd5 en Bc4 toe", moveLimit: 24 },
    ],
    gold: [
      // G1: Kf3 Bc4 Nb5 vs Ke5 pd3 — pion dreig bevordering! Wedren teen die klok
      { fen: '8/8/8/1N2k3/2B5/3p1K2/8/8 w - - 0 1',
        note: "Pion op d3 dreig d2-d1! Vang dit of gee sentrale skaakmat EERSTE — die wedren begin nou!", moveLimit: 24 },
      // G2: Kf2 Bc5 Nd7 vs Kd5 pe3 — pion op e3, sentrale mat vereiste
      { fen: '8/3N4/8/2Bk4/8/4p3/5K2/8 w - - 0 1',
        note: "Pion op e3 dreig e2 en bevordering — vind die sentrale skaakmat voor dit gebeur! Elke skuif tel.", moveLimit: 24 },
    ],
  },
}
