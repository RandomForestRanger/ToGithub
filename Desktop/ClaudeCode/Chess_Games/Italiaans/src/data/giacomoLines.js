// Giacomo Bianchi se kommentaar — Afrikaans met Italiaanse uitroepe.
// Italian expressions are always followed by their Afrikaans meaning in brackets.
// Max ~20 woorde per lyn. Bondig. Gevoel. No hyperbole in the Afrikaans parts.
// Strings with 'n (Afrikaans indefinite article) use double quotes.

const LINES = {
  4: [
    "Perfetto! (Perfek!) Presies die regte skuif!",
    "Magnifico! (Wonderlik!) Lekker skuif daarso.",
    "Top skuif. Dalk koop ek vir jou pizza.",
    "Bravissimo! (Uitstekend!) Jy het mooi gedink.",
    "Esattamente! (Presies reg!) Jou spel kom mooi aan.",
    "Goeie werk! Dat is nou hoe dit gedoen word.",
    "Bellissimo! (Pragtig!) Jy het dit.",
  ],
  3: [
    "Buono! (Goed!) Goed gedoen — maar daar was iets beter.",
    "Nie sleg nie... Giacomo sou effens anders gekies het.",
    "Lekker skuif! Kyk ook na die alternatiewe.",
    "Die pizza ruik 'n bietjie muf.",
    "Rispettabile! (Aanvaarbaar!) Jou spel kom aan, maar ons kan nog beter.",
    "Solied gespeel.",
  ],
  2: [
    "Hmm. Die plan is... interessant.",
    "Mediocre! (Middelmatig!) Te vinnig gespeel.",
    "Ek sien jou plan, maar die Italianer vereis dat jy langer dink.",
    "Jy het die Ferrari in tweede rat gehou. Brrrrrr.",
    "Non male... (Nie sleg nie...) maar dit kon beter gewees het.",
  ],
  1: [
    "Jou wilde ietermagog!",
    "Ai, jou rowwe ratel!",
    "Wat was dit?! Dink, lekker lank!",
    "Santa Maria! (O gedorie!)",
    "Giacomo hou nie van die plan nie.",
    "O ertappel... Te vinnig gespeel.",
    "Eina! Maar goed, volgende skuif.",
  ],

  // Special moments
  celebrating: [
    "MAGNIFICO! (Wonderlik!) Mat! Giacomo kan dit nie glo nie!",
    "MAT! Perfetto! (Perfek!) Jy het dit reggekry!",
    "Bravissimo! (Uitstekend!) Mat toegedien! Goeie werk!",
    "Mat! Jou spel was vandag mooi.",
  ],
  draw: [
    "Remise! Giacomo is... mmmmm. Ek voel mmmmm.",
    "Gelykspel? O pampoen-pizza. Goed genoeg... dink ek.",
  ],
  black_mates_white: [
    "Jy's gemat! Maar jy het baie geleer vandag.",
    "Swart het gewen — maar jy het 'n paar goeie skuiwe gemaak.",
    "O aarde. Kom ons probeer nog 'n keer.",
  ],
  moves_complete: [
    "Spel verby! Jy het goed gedoen — bekyk gou jou punte!",
    "Tiempo finito! (Tyd op!) Lekker poging — kyk na jou finale telling!",
  ],

  // Trap warnings (shown before Black plays the trap move)
  trap_warning: [
    "Pasop! Swart skep 'n lokval! Dink voordat jy slaan!",
    "Attenzione! (Let op!) Ek ruik 'n valletjie... wees versigtig.",
    "Giacomo frons. Iets is nie reg hier nie...",
  ],
  trap_escaped: [
    "Bravissimo! (Uitstekend!) Jy het die val gesien en ontsnap! +3!",
    "Perfetto! (Perfek!) Jy het dit raakgesien! Val vermy!",
    "Si, si! (Ja, ja!) Presies reg! Die val het misluk! Goeie werk.",
  ],
  trap_fell: [
    "Ek het jou gewaarsku! Die val het gewerk — leer hieruit.",
    "Ai! Jy's in die val! Maar jy sal dit nooit vergeet nie.",
    "O pampoen-pizza... In die val. Volgende keer beter.",
  ],

  // Layer completion announcements
  layer1_complete: [
    "Laag Een voltooi! Bc4 + Nf3 + d3 — die vlag is geplant!",
    "Perfetto! (Perfek!) Laag Een struktuur klaar — solied gespeel.",
  ],
  layer2_complete: [
    "Laag Twee! Ruiter pad gekies — lekker werk!",
    "Magnifico! (Wonderlik!) Laag Twee bereik — die plan word duidelik.",
  ],
  layer3_complete: [
    "LAAG DRIE! Die sentrum is joune! Bravissimo! (Uitstekend!)",
    "c3–d4 breuk uitgevoer! Die Italianer se finale plan!",
  ],

  // Black thinking comments (shown during the extended thinking delay)
  black_thinking: [
    "Swart dink...",
    "Swart beplan wat hy nou moet maak...",
    "Swart krap bietjie kop...",
    "Swart moet nou eers 'n plan maak...",
    "Swart bedink die situasie...",
    "Swart beraam sy plan...",
    "Swart weeg sy opsies op...",
  ],

  // Motivational asides — shown 3× per game at random moments during player's turn
  motivational: [
    "Die een wat die langste dink, wen dikwels.",
    "Ek weet jy kan, ek weet jy kan!",
    "Vasbyt, seun, vasbyt.",
    "Het jy geweet my naam is 'Jacobus', maar in Italiaans?",
    "Jy gaan nog ver kom — byt net vas.",
    "As jy val, moet jy net weer opstaan, dis al.",
  ],

  // Variation announcements (returned separately for the variation banner)
  variation_reached: [
    "Welkom in die {variation}!",
    "{variation} — Giacomo se tuiste!",
    "Ah, {variation}! Perfetto! (Perfek!)",
  ],
};

// ── Layer completion announcements ───────────────────────────────────────
// Shown every time a layer is newly reached, regardless of badge status.

export const LAYER_ANNOUNCEMENTS = {
  1: {
    titel: "Laag 1 Voltooi — Die Vlag is Geplant! 🏗️",
    punte: [
      "Bc4 mik direk na f7 — die swakste punt op Swart se bord.",
      "Nf3 ontwikkel met druk op e5 en dit help ook om die middel te beheer.",
      "d3 versterk e4, maak die biskop se diagonaal oop en bou 'n soliede basis.",
      "Saam vorm hierdie drie skuiwe die hart van die Italianer: harmonie, druk, geduld.",
    ],
  },
  2: {
    titel: "Laag 2 Voltooi — Die Ruiterpad is Gekies! 🧭",
    punte: [
      "c3 berei die groot plan voor: die d4-sentrumsbreuk.",
      "Nc3 gee direkte krag in die sentrum. Na3 hou c3 oop. Nbd2 is buigsaam.",
      "Jou stukke weet nou presies waarheen hulle gaan.",
      "Die plan is mooi helder — Wit is soos 'n Ferrari wat versnel.",
    ],
  },
  3: {
    titel: "Laag 3 Voltooi — Die Sentrum is Joune! 🎯",
    punte: [
      "Die c3–d4 breuk is die toppunt van die Italianer se strategie.",
      "Wit se d4-pion beheer die sentrum en gee al jou stukke meer ruimte.",
      "Swart moet nou reageer — of hy gaan sukkel onder die druk.",
      "Presies waarvoor al die vorige skuiwe voorberei het. Perfetto! (Perfek!)",
    ],
  },
};

// ── Mid-game Italian theme panels ────────────────────────────────────────
// Shown once per game when specific positional themes are first reached.
// Keys match those returned by detectNewMidgamePanel() in openingTree.js.

export const MIDGAME_PANELS = {
  ng5_f7: {
    titel: "Die Ng5 f7-Aanval — Skaak se Gevaarlikste Bedreiging! ⚔️",
    punte: [
      "f7 is Swart se swakste punt — slegs die koning verdedig dit in die opening.",
      "Die ruiter op g5 mik direk na f7 saam met die biskop op c4.",
      "Wit kan die ruiter offer op f7 (Nxf7!) om Swart se koning bloot te stel.",
      "Dit is die begin van die Fried Liver Aanval — een van skaak se gevaarlikste aanvalle.",
    ],
  },
  rokeer_veilig: {
    titel: "Rokade — Koning Veilig, Toring Wakker! 🏰",
    punte: [
      "Na rokade staan die koning veilig agter 'n muur van pione.",
      "Die toring op f1 is nou gereed vir die middelspel aanval.",
      "Rokade is skaak se slimste ruil: een skuif, twee voordele.",
      "Verbind jou torings so gou as moontlik — saamwerking is krag.",
    ],
  },
  sentrum_breuk: {
    titel: "Die c3–d4 Breuk — Die Italianer se Groot Plan! 💥",
    punte: [
      "c3 was die voorbereiding — nou breek d4 die sentrum oop.",
      "Swart moet reageer of hy kry drukkende sentrumdominansie.",
      "Al jou stukke kry meer ruimte en aktiwiteit na hierdie breuk.",
      "Dit is presies waarvoor die Italianer speel — die sentrum is Wit se tuiste.",
    ],
  },
  biskoppaar: {
    titel: "Die Biskoppaar — 'n Langtermyn Strategiese Voordeel! 🔵",
    punte: [
      "Twee biskope beheer diagonale van albei kleure gelyktydig.",
      "In oop posisies is die biskoppaar veel meer werd as 'n biskop en perd.",
      "Vermy om jou biskope sommer te ruil — hulle word later meer werd.",
      "Hierdie voordeel groei soos pione verruil word en die bord oopmak.",
    ],
  },
  toring_aktief: {
    titel: "Toring na die Sentrum — Oop Lêers Behoort aan Jou! 🗼",
    punte: [
      "Die toring op e1 of d1 steun die sentrum en dreig om lêers oop te maak.",
      "Oop en half-oop lêers is die toring se snelweg na aksie.",
      "Na rokade moet die toring na 'n aktiewe pos verskuif word.",
      "Dit is die sewende beginsel: aktiveer elke stuk — lui stukke verloor.",
    ],
  },
};

// Pick a random line from a category
export function getGiacomoLine(key, substitutions = {}) {
  const pool = LINES[key] ?? LINES[2];
  let line = pool[Math.floor(Math.random() * pool.length)];
  for (const [token, value] of Object.entries(substitutions)) {
    line = line.replace(`{${token}}`, value);
  }
  return line;
}

// ── Italië Feite — Paasei (B: muisstil; C: 1-in-300 per skuif) ──────────────
export const ITALY_FACTS = [
  {
    kategorie: '⛰️ Berge',
    feit: "Die Dolomiete in noordoos-Italië was vroeër 'n tropiese koraalrif — vandag is dit 'n UNESCO-Wêrelderfenisgebied.",
  },
  {
    kategorie: '⛰️ Berge',
    feit: "Monte Bianco (4 808 m) staan op die Italiaans-Franse grens as die hoogste berg in die Alpe.",
  },
  {
    kategorie: '⛰️ Berge',
    feit: "Italië het drie aktiewe vulkane: Etna — Europa se grootste — Stromboli en Vesuvius, wat Pompeji in 79 n.C. onder lawa en as begrawe het.",
  },
  {
    kategorie: '🏛️ Geskiedenis',
    feit: "Italië is eers in 1861 as eenheidstaat gestig — vir meer as duisend jaar tevore was dit 'n lappieskombers van stadstate, koninkryke en pouslike gebiede.",
  },
  {
    kategorie: '🏛️ Geskiedenis',
    feit: "Op sy hoogtepunt het die Romeinse Ryk van Skotland tot in Mesopotamië gestrek — alles vanuit een stad regeer.",
  },
  {
    kategorie: '🏛️ Geskiedenis',
    feit: "Die Vatikaan, volledig binne Rome geleë, is die kleinste onafhanklike staat ter wêreld — net 44 hektaar groot.",
  },
  {
    kategorie: '🏙️ Stede',
    feit: "Venesië is op 118 eilande gebou wat deur meer as 400 brûe verbind word — geen paaie nie, net kanale en voetpaaie.",
  },
  {
    kategorie: '🏙️ Stede',
    feit: "Florence het Leonardo da Vinci, Michelangelo, Botticelli én Dante voortgebring — almal binne 'n paar stadsblokke van mekaar gebore.",
  },
  {
    kategorie: '🏙️ Stede',
    feit: "Napels herberg die wêreld se eerste pizzeria — Antica Pizzeria Port'Alba, wat reeds in 1738 sy deure oopgemaak het.",
  },
  {
    kategorie: '🗣️ Taal',
    feit: "Italiaans is die lewende taal wat die naaste aan Latyn staan — sowat 82% van sy woordeskat spruit regstreeks daaruit.",
  },
  {
    kategorie: '🗣️ Taal',
    feit: "Meer as 350 verskillende pastavormes bestaan in die Italiaanse kookkuns — meer benoemde vorme as byna enige ander voedselkategorie in enige taal.",
  },
  {
    kategorie: '🗣️ Taal',
    feit: "Italianers gebaar so uitbundig dat die Italiaanse Gebaretaal gedeeltelik uit alledaagse handgebare ontwikkel het.",
  },
  {
    kategorie: '🎭 Kultuur',
    feit: "Italië besit meer UNESCO-Wêrelderfenisgebiede as enige ander land ter wêreld — 58 tot op hede.",
  },
  {
    kategorie: '🎭 Kultuur',
    feit: "Die espressomajien is in 1884 in Turyn deur Angelo Moriondo uitgevind.",
  },
  {
    kategorie: '🎭 Kultuur',
    feit: "Italianers verbruik gemiddeld 14 kg pasta per persoon per jaar — meer as enige ander volk op aarde.",
  },
  {
    kategorie: '🎵 Musiek',
    feit: "Die eerste opera ooit was Dafne — omstreeks 1597 in Florence opgevoer.",
  },
  {
    kategorie: '🎵 Musiek',
    feit: "Musiekterme wat wêreldwyd deur elke orkes gebruik word — allegro, forte, piano, crescendo, sopraan — is almal gewone Italiaanse woorde.",
  },
  {
    kategorie: '😄 Weet Jy?',
    feit: "Italië vervaardig meer as 400 soorte kaas — meer selfs as Frankryk.",
  },
  {
    kategorie: '😄 Weet Jy?',
    feit: "Abbiocco is 'n Italiaanse woord waarvoor geen Afrikaanse of Engelse eweknie bestaan nie: die slaaperige gevoel wat 'n groot middagete volg.",
  },
  {
    kategorie: '⚽ Sport',
    feit: "Italië het die FIFA Wêreldbeker vier keer gewen (1934, 1938, 1982, 2006) — net Brasilië en Duitsland het dit ook meer as twee keer reggekry.",
  },
];

export function getRandomItalyFact() {
  return ITALY_FACTS[Math.floor(Math.random() * ITALY_FACTS.length)];
}

// Map score (1–4) to the expression key for GiacomoFace
export function scoreToExpression(score, isCheckmate = false, isThinking = false) {
  if (isThinking) return 'thinking';
  if (isCheckmate) return 'celebrating';
  if (score === 4) {
    const r = Math.random();
    if (r < 0.05)   return 'ecstatic_confetti';   // 1-in-20 rare surprise
    if (r < 0.367)  return 'ecstatic';
    if (r < 0.683)  return 'ecstatic_hearts';
    return 'ecstatic_approva';
  }
  return { 3: 'pleased', 2: 'neutral', 1: 'frustrated' }[score] ?? 'neutral';
}
