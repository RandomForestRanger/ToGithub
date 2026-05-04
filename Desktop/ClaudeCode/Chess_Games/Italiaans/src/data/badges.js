// 28 badge definitions.
//
// Each badge has:
//   id           : string  — localStorage key fragment
//   naam         : string  — Afrikaans display name
//   italiaans    : string  — Giacomo's Italian name
//   emoji        : string
//   beskrywing   : string  — one-sentence Afrikaans description
//   moeilikheid  : 'maklik'|'medium'|'moeilik'|'legendarIes'
//   when         : 'move'|'game_end'  — when the criterion is evaluated
//   criterion    : (ctx) => boolean
//
// Criterion context (ctx):
//   ctx.history        : string[]  — full move history (SAN)
//   ctx.moveLog        : MoveEntry[]  — [{moveNumber, san, score, fen, label}]
//   ctx.finalScore     : number    — total score this game (0 before game_end)
//   ctx.mateDelivered  : boolean
//   ctx.trapEscaped    : boolean   — escaped a Black trap correctly
//   ctx.layerStatus    : 0|1|2|3
//   ctx.variationsHit  : Set<string>  — variation names reached this game
//   ctx.consecutivePerfect : number  — running count of consecutive 4pt moves
//   ctx.profile        : { speleGespeel, badges, besteTelling }

export const BADGES = [

  // ── Maklike kentekens ──────────────────────────────────────────────────
  {
    id: 'il_primo_passo',
    naam: 'Il Primo Passo',
    italiaans: 'Il Primo Passo',
    emoji: '🍕',
    wenWenrig: "Voltooi jou eerste spel",
    beskrywing: "Welkom by die Akademie — jou eerste spel is klaar!",
    moeilikheid: 'maklik',
    when: 'game_end',
    criterion: (ctx) => ctx.profile.speleGespeel >= 1,
  },
  {
    id: 'giacomo_se_student',
    naam: "Giacomo se Student",
    italiaans: "Lo Studente di Giacomo",
    emoji: '🎓',
    wenWenrig: "Behaal 50 of meer punte in een spel",
    beskrywing: "Giacomo aanvaar jou as sy student — 50+ punte behaal!",
    moeilikheid: 'maklik',
    when: 'game_end',
    criterion: (ctx) => ctx.finalScore >= 50,
  },
  {
    id: 'die_italianer',
    naam: 'Die Italianer',
    italiaans: "L'Italiano",
    emoji: '🏰',
    wenWenrig: "Bereik die Italiaanse Opening: speel 1.e4 e5 2.Nf3 Nc6 3.Bc4",
    beskrywing: "Die Italiaanse vlag is gehys — 3.Bc4 suksesvol gespeel!",
    moeilikheid: 'maklik',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 5 && h[4] === 'Bc4';
    },
  },
  {
    id: 'e4_meester',
    naam: 'e4 Meester',
    italiaans: 'Il Maestro di e4',
    emoji: '♟️',
    wenWenrig: "Kies die korrekte rede vir 1.e4 in 3 spele op 'n ry",
    beskrywing: "Jy weet hoekom 1.e4 die beste eerste skuif is — 3 keer bewys!",
    moeilikheid: 'maklik',
    when: 'game_end',
    criterion: (ctx) => ctx.profile.e4CorrectStreak >= 3,
  },
  {
    id: 'honderd_punte',
    naam: 'Honderd Punte',
    italiaans: 'Cento Punti',
    emoji: '⭐',
    wenWenrig: "Behaal 100 of meer punte in een spel",
    beskrywing: "Die honderd is bereik — Giacomo is beïndruk!",
    moeilikheid: 'maklik',
    when: 'game_end',
    criterion: (ctx) => ctx.finalScore >= 100,
  },

  // ── Medium kentekens — opening kennis ─────────────────────────────────
  {
    id: 'giuoco_piano',
    naam: 'Giuoco Piano',
    italiaans: 'Il Giuoco Piano',
    emoji: '🍝',
    wenWenrig: "Speel 4.c3 na 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5",
    beskrywing: "Die klassieke Italianer — pasta, skaak en 4.c3!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'c3';
    },
  },
  {
    id: 'pianissimo',
    naam: 'Pianissimo',
    italiaans: 'Il Pianissimo',
    emoji: '🧀',
    wenWenrig: "Speel 5.d3 in die Giuoco Piano na 4.c3",
    beskrywing: "Stil soos 'n muis — die Pianissimo met 5.d3 voltooi!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 9 && h[4] === 'Bc4' && h[6] === 'c3' && h[8] === 'd3';
    },
  },
  {
    id: 'evans_aanvaller',
    naam: 'Evans Aanvaller',
    italiaans: "Il Gambettiere di Evans",
    emoji: '⚔️',
    wenWenrig: "Speel 4.b4 en Swart aanvaar die gambiet (Bxb4)",
    beskrywing: "Die swaarde is getrek — Evans Gambiet aanvaar!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 8 && h[4] === 'Bc4' && h[6] === 'b4' && h[7] === 'Bxb4';
    },
  },
  {
    id: 'twee_ridders',
    naam: 'Twee Ridders',
    italiaans: 'I Due Cavalli',
    emoji: '🐴',
    wenWenrig: "Bereik die Twee Ridders Verdediging: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6",
    beskrywing: "Twee ruiters galop op die bord — Twee Ridders bereik!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 6 && h[4] === 'Bc4' && h[5] === 'Nf6';
    },
  },
  {
    id: 'hongaarse_wag',
    naam: 'Hongaarse Wag',
    italiaans: "L'Ungherese Paziente",
    emoji: '🦔',
    wenWenrig: "Speel korrek (3+ punte) op skuif 4 teen die Hongaarse (3...Be7)",
    beskrywing: "Geduldig soos 'n Hongaar — die Hongaarse Verdediging hanteer!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Be7' && ctx.moveLog.some(m => m.score >= 3 && m.moveNumber === 4);
    },
  },
  {
    id: 'sisiliaanse_slagter',
    naam: 'Sisiliaanse Slagter',
    italiaans: 'Il Macellaio Siciliano',
    emoji: '🐉',
    wenWenrig: "Hanteer 1...c5 korrek deur 2.Nf3 te speel",
    beskrywing: "Die Sisiliaanse Draak is getem — 2.Nf3 was die antwoord!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 2 && h[1] === 'c5' && h[2] === 'Nf3';
    },
  },
  {
    id: 'franse_verbinding',
    naam: 'Franse Verbinding',
    italiaans: 'Il Collegamento Francese',
    emoji: '🌸',
    wenWenrig: "Hanteer 1...e6 korrek deur 2.d4 te speel",
    beskrywing: "Die Franse Opening beantwoord met die korrekte 2.d4!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 3 && h[1] === 'e6' && h[2] === 'd4';
    },
  },
  {
    id: 'caro_kan_kapper',
    naam: 'Caro-Kan Kapper',
    italiaans: 'Il Taglialegna Caro-Kann',
    emoji: '🛡️',
    wenWenrig: "Hanteer 1...c6 korrek deur 2.d4 te speel",
    beskrywing: "Die Caro-Kann se skild is deurbreek — 2.d4 was korrek!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 3 && h[1] === 'c6' && h[2] === 'd4';
    },
  },
  {
    id: 'skandinawiese_stop',
    naam: 'Skandinawiese Stop',
    italiaans: 'Lo Stop Scandinavo',
    emoji: '🌊',
    wenWenrig: "Hanteer 1...d5 korrek deur 2.exd5 te speel",
    beskrywing: "Die Skandinawiese golf is gestop — 2.exd5 was reg!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 3 && h[1] === 'd5' && h[2] === 'exd5';
    },
  },

  // ── Medium kentekens — variasies gespeel ─────────────────────────────
  {
    id: 'four_knights',
    naam: 'Four Knights Variation',
    italiaans: 'La Variante dei Quattro Cavalli',
    emoji: '🐎',
    wenWenrig: "Bereik die Four Knights: 3.Bc4 Nf6 4.Nc3",
    beskrywing: "Vier ruiters op die bord — die Four Knights Variation bereik!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Nf6' && h[6] === 'Nc3';
    },
  },
  {
    id: 'closed_variation',
    naam: 'Closed Variation',
    italiaans: 'La Variante Chiusa',
    emoji: '🔒',
    wenWenrig: "Speel 4.d3 direk in die Giuoco Piano (nie c3 eerste nie)",
    beskrywing: "Die Geslote Italianer — stil en geduldig met 4.d3!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'd3';
    },
  },
  {
    id: 'classical_variation',
    naam: 'Classical Variation',
    italiaans: 'La Variante Classica',
    emoji: '🏛️',
    wenWenrig: "Speel 4.c3 Nf6 5.d4 in die Giuoco Piano",
    beskrywing: "Die Klassieke Giuoco Piano — sentrum aanval met c3 en d4!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 9 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'c3' && h[8] === 'd4';
    },
  },
  {
    id: 'center_attack',
    naam: 'Center Attack',
    italiaans: "L'Attacco Centrale",
    emoji: '⚡',
    wenWenrig: "Speel 4.d4 direk (sonder c3 eerste) in die Giuoco Piano",
    beskrywing: "Direkte sentrum aanval met 4.d4 — geen c3 ompad nie!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'd4';
    },
  },
  {
    id: 'albin_gambit',
    naam: 'Albin Gambit',
    italiaans: 'Il Gambetto di Albin',
    emoji: '🏯',
    wenWenrig: "Speel 4.O-O in die Giuoco Piano — rokeer vroeg na Bc5",
    beskrywing: "Vroeg gerokeer in die Giuoco Piano — die Albin Gambit opstelling!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'O-O';
    },
  },
  {
    id: 'semi_italian',
    naam: 'Semi-Italian Opening',
    italiaans: 'Il Semi-Italiano',
    emoji: '🤌',
    wenWenrig: "Swart speel 3...Be7 — bereik die Semi-Italian Opening",
    beskrywing: "Swart speel dit rustig met Be7 — die Semi-Italian Opening!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 6 && h[4] === 'Bc4' && h[5] === 'Be7';
    },
  },
  {
    id: 'open_variation',
    naam: 'Open Variation',
    italiaans: 'La Variante Aperta',
    emoji: '🌐',
    wenWenrig: "Na 4.c3 Nf6 5.d4 exd4, speel 6.cxd4 — die oop sentrum",
    beskrywing: "Die sentrum is oopgebreek — die Open Variation van die Giuoco Piano!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 11 && h[4] === 'Bc4' && h[5] === 'Bc5'
        && h[6] === 'c3' && h[8] === 'd4' && h[9] === 'exd4' && h[10] === 'cxd4';
    },
  },
  {
    id: 'modern_bishops_opening',
    naam: "Modern Bishop's Opening",
    italiaans: "L'Apertura del Vescovo Moderno",
    emoji: '🔭',
    wenWenrig: "Na die Twee Ridders (3...Nf6), speel 4.d3",
    beskrywing: "Twee Ridders bereik, dan rustig 4.d3 — die Modern Bishop's Opening!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Nf6' && h[6] === 'd3';
    },
  },
  {
    id: 'anti_fried_liver',
    naam: 'Anti-Fried Liver Defense',
    italiaans: 'La Difesa Anti-Fegato Fritto',
    emoji: '🧲',
    wenWenrig: "Speel 4.Ng5 maar Swart weier met Bc5 (Traxler) — nie die Fried Liver nie",
    beskrywing: "Ng5 gespeel, maar Swart het Bc5 geantwoord — Anti-Fried Liver bereik!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 8 && h[5] === 'Nf6' && h[6] === 'Ng5' && h[7] === 'Bc5';
    },
  },
  {
    id: 'knight_attack',
    naam: 'Knight Attack',
    italiaans: "L'Attacco del Cavallo",
    emoji: '🗡️',
    wenWenrig: "Speel 4.Ng5 in die Twee Ridders Verdediging",
    beskrywing: "Die ruiter spring na g5 — die Knight Attack in die Twee Ridders!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[4] === 'Bc4' && h[5] === 'Nf6' && h[6] === 'Ng5';
    },
  },
  {
    id: 'scotch_gambit',
    naam: 'Scotch Gambit',
    italiaans: 'Il Gambetto Scozzese',
    emoji: '🥃',
    wenWenrig: "Speel 3.d4 exd4 4.Bc4 — die Scotch Gambiet wat na die Italianer transponeer",
    beskrywing: "Die Skotse gambiet transponeer na 'n Italianer posisie — Scotch Gambit bereik!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 7 && h[2] === 'Nf3' && h[3] === 'Nc6'
        && h[4] === 'd4' && h[5] === 'exd4' && h[6] === 'Bc4';
    },
  },
  {
    id: 'evans_declined',
    naam: 'Evans Gambit Declined',
    italiaans: 'Il Gambetto di Evans Rifiutato',
    emoji: '🙅',
    wenWenrig: "Bied die Evans Gambiet (4.b4) maar Swart weier — Bb6, Ba5 of Bd6",
    beskrywing: "Die gambiet aangebied maar Swart het geweier — Evans Gambit Declined!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 8 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'b4'
        && ['Bb6', 'Ba5', 'Bd6', 'Be7', 'Bf8'].includes(h[7]);
    },
  },
  {
    id: 'hein_countergambit',
    naam: 'Hein Countergambit',
    italiaans: 'Il Controgambetto di Hein',
    emoji: '🌪️',
    wenWenrig: "Bied die Evans Gambiet (4.b4), Swart antwoord met 4...d5",
    beskrywing: "Na b4 slaan Swart terug met d5 — die Hein Countergambit!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 8 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'b4' && h[7] === 'd5';
    },
  },
  {
    id: 'fontaine_countergambit',
    naam: 'Fontaine Countergambit',
    italiaans: 'Il Controgambetto Fontaine',
    emoji: '⛲',
    wenWenrig: "Bied die Evans Gambiet (4.b4), Swart antwoord met 4...b5",
    beskrywing: "Na b4 speel Swart ook b5 — die Fontaine Countergambit!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 8 && h[4] === 'Bc4' && h[5] === 'Bc5' && h[6] === 'b4' && h[7] === 'b5';
    },
  },

  // ── Medium kentekens — struktuur ───────────────────────────────────────
  {
    id: 'die_driehoek',
    naam: 'Die Driehoek',
    italiaans: 'Il Triangolo',
    emoji: '🔺',
    wenWenrig: "Voltooi Laag 1: speel Bc4 + Nf3 + d3 in dieselfde spel",
    beskrywing: "Laag 1 voltooi — die Italiaanse driehoek staan vas!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => ctx.layerStatus >= 1,
  },
  {
    id: 'perd_pad_meester',
    naam: 'Perd Pad Meester',
    italiaans: 'Il Maestro del Cavallo',
    emoji: '🗺️',
    wenWenrig: "Voltooi Laag 2: kies die regte ruiter pad (Na3 of Nc3) met c3",
    beskrywing: "Laag 2 bereik — die ruiter weet waar om te gaan!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => ctx.layerStatus >= 2,
  },
  {
    id: 'sentrum_breuk',
    naam: 'Sentrum Breuk',
    italiaans: 'La Rottura Centrale',
    emoji: '💥',
    wenWenrig: "Voltooi Laag 3: voer die c3–d4 sentrum breuk uit",
    beskrywing: "Die sentrum is oopgebreek — die Italianer se plan werk!",
    moeilikheid: 'medium',
    when: 'move',
    criterion: (ctx) => ctx.layerStatus >= 3,
  },
  {
    id: 'laag_drie_bereik',
    naam: 'Laag Drie Bereik',
    italiaans: 'Il Terzo Strato',
    emoji: '🏯',
    wenWenrig: "Voltooi alle drie lae in een spel (Laag 1 + 2 + 3)",
    beskrywing: "Alle drie struktuuslae voltooi in een spel — Magnifico!",
    moeilikheid: 'medium',
    when: 'game_end',
    criterion: (ctx) => ctx.layerStatus >= 3,
  },

  // ── Moeilike kentekens ─────────────────────────────────────────────────
  {
    id: 'fried_liver_oorlewende',
    naam: 'Fried Liver Oorlewende',
    italiaans: 'Il Sopravvissuto al Fegato Fritto',
    emoji: '🐟',
    wenWenrig: "Swart moet die Fried Liver aanval speel — dan moet jy korrek verdedig",
    beskrywing: "Die vis was in die pan maar jy het ontsnap — Fried Liver oorleef!",
    moeilikheid: 'moeilik',
    when: 'game_end',
    criterion: (ctx) => ctx.trapEscaped && ctx.trapKey === 'fried_liver',
  },
  {
    id: 'val_breker',
    naam: 'Val Breker',
    italiaans: 'Il Rompi-Trappola',
    emoji: '🔓',
    wenWenrig: "Enige Swart val moet afgerol word — dan moet jy korrek reageer",
    beskrywing: "Die val is gebreek — jy het Swart se plan deurgesien!",
    moeilikheid: 'moeilik',
    when: 'game_end',
    criterion: (ctx) => ctx.trapEscaped,
  },
  {
    id: 'val_setter',
    naam: 'Lekker Lokval',
    italiaans: 'Il Posatore di Trappole',
    emoji: '🕷️',
    wenWenrig: "Speel Ng5 in die Twee Ridders en bereik die Fried Liver posisie (exd5)",
    beskrywing: "Jy het die web gespin — Fried Liver aanval bereik!",
    moeilikheid: 'moeilik',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.includes('Ng5') && h.includes('exd5');
    },
  },
  {
    id: 'alekhine_temmer',
    naam: 'Alekhine Temmer',
    italiaans: "Il Domatore di Alekhine",
    emoji: '🦅',
    wenWenrig: "Hanteer 1...Nf6 korrek deur 2.e5 te speel",
    beskrywing: "Die Alekhine Arend is getem — 2.e5 het hom gestop!",
    moeilikheid: 'moeilik',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 3 && h[1] === 'Nf6' && h[2] === 'e5';
    },
  },
  {
    id: 'pirc_modern_meester',
    naam: 'Pirc/Modern Meester',
    italiaans: 'Il Maestro Pirc-Moderno',
    emoji: '🌀',
    wenWenrig: "Hanteer 1...g6 of 1...d6 korrek deur 2.d4 te speel",
    beskrywing: "Die Pirc/Modern is hanteer — die sentrum is joune!",
    moeilikheid: 'moeilik',
    when: 'move',
    criterion: (ctx) => {
      const h = ctx.history;
      return h.length >= 3 && (h[1] === 'g6' || h[1] === 'd6') && h[2] === 'd4';
    },
  },
  {
    id: 'teorie_perfeksionis',
    naam: 'Teorie Perfeksionis',
    italiaans: 'Il Perfezionista Teorico',
    emoji: '💫',
    wenWenrig: "Behaal 4 punte op 5 opeenvolgende skuiwe",
    beskrywing: "5 perfekte skuiwe agter mekaar — jy is 'n teoretiese meester!",
    moeilikheid: 'moeilik',
    when: 'move',
    criterion: (ctx) => ctx.consecutivePerfect >= 5,
  },
  {
    id: 'diamant_italianer',
    naam: 'Diamant Italianer',
    italiaans: 'Il Diamante Italiano',
    emoji: '💎',
    wenWenrig: "Behaal 160 of meer uit 200 punte in een spel",
    beskrywing: "160+ punte — jy speel soos 'n geslypte diamant!",
    moeilikheid: 'moeilik',
    when: 'game_end',
    criterion: (ctx) => ctx.finalScore >= 160,
  },
  {
    id: 'mattesetter',
    naam: 'Mattesetter',
    italiaans: 'Il Mattatore',
    emoji: '🤺',
    wenWenrig: "Lewer mat toe aan Swart voor die 50 skuiwe verby is",
    beskrywing: "Mat! Die swaard het geseëvier — Swart se koning het geval!",
    moeilikheid: 'moeilik',
    when: 'game_end',
    criterion: (ctx) => ctx.mateDelivered,
  },

  // ── Legendariese kentekens ─────────────────────────────────────────────
  {
    id: 'giacomo_se_gunsteling',
    naam: "Giacomo se Gunsteling",
    italiaans: 'Il Favorito di Giacomo',
    emoji: '🏎️',
    wenWenrig: "Behaal 180 of meer uit 200 punte in een spel",
    beskrywing: "180+ punte — jy ry soos 'n Ferrari, mio studente!",
    moeilikheid: 'legendaries',
    when: 'game_end',
    criterion: (ctx) => ctx.finalScore >= 180,
  },
  {
    id: 'il_grande_maestro',
    naam: 'Il Grande Maestro',
    italiaans: 'Il Grande Maestro',
    emoji: '👑',
    wenWenrig: "Verdien alle 41 ander kentekens",
    beskrywing: "Die kroon is jou — alle 41 kentekens verdien!",
    moeilikheid: 'legendaries',
    when: 'game_end',
    criterion: (ctx) =>
      BADGES.slice(0, -1).every(b => ctx.profile.badges.includes(b.id)),
  },
];

// Lookup by id
export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]));
