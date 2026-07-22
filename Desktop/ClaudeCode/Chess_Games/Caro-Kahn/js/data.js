/* Die Caro-Kann in Blokkie-wêreld — scripted opening data, biome text, Reisiger dialogue.
   Tree node shape:
     { w: 'SAN' }                       forced White move
     { wRandom: ['SAN', ...] }          White picks uniformly at random once, cached per-game
     b: { SAN: nextNode|null, ... }     accepted Black rail moves; null = free play begins after this move
     branches: { SAN(from wRandom): { b: {...} } }   continuation per random White choice
     trap: { move:'SAN', reply:'SAN', message:'...' }  an extra *allowed* but losing Black move at this ply
*/

const GAME_PREFIX = 'kampKarpov';

const PLAYERS = ['J', 'L', 'KC', 'CA', 'MB', 'T'];

// Cache-buster suffix for JS-constructed asset URLs (CLAUDE.md §12). Bump alongside
// the literal ?v= on every HTML file whenever css/js/images change.
const ASSET_V = 18;

// ---------------------------------------------------------------------------
// Biome metadata
// ---------------------------------------------------------------------------

const BIOMES = {
  vlakte: {
    id: 'vlakte',
    name: 'Die Vlakte',
    ore: '🟩',
    bg: 'bg-vlakte.png',
    themeClass: 'theme-vlakte',
    popup: "Gaaf! Nou gaan ons die Vlakte-bioom binne. Hierso is ons strategie mos aktiewe stukke, en ons plan is om vinnig te ontwikkel en die dubbelaanval op b7 en d5 dop te hou.",
    entryWarning: null
  },
  muur: {
    id: 'muur',
    name: 'Die Muur',
    ore: '🧱',
    bg: 'bg-muur.png',
    themeClass: 'theme-muur',
    popup: "Gaaf! Nou gaan ons die Muur-bioom binne. Hierso is ons strategie mos om ons gereedskap uit die huis te kry vóór ons die deur toemaak, en ons plan is om Bf5 te speel en later die muur met c5 te kraak.",
    entryWarning: null
  },
  woud: {
    id: 'woud',
    name: 'Die Woud',
    ore: '🌲',
    bg: 'bg-woud-bospad.png',
    themeClass: 'theme-woud',
    popup: "Gaaf! Nou gaan ons die Woud-bioom binne. Hierso is ons strategie mos stukke-harmonie, en ons plan is om die e4-veld te beveg en ons ligte stukke perfek te plaas.",
    entryWarning: null
  },
  nether: {
    id: 'nether',
    name: 'Die Nether',
    ore: '🟪',
    bg: 'bg-nether.png',
    themeClass: 'theme-nether',
    popup: "Gaaf! Nou gaan ons die Nether-bioom binne. Hierso is ons strategie mos kalm blokkade, en ons plan is om d5 te blokkeer en stukke af te ruil sodat Wit se eensame pion al swakker word.",
    entryWarning: "Hier in die Nether speel Wit skerp. Bly kalm, blokkeer d5."
  }
};

// Woud sub-paths — tracked separately for mastery, rolled up under 'woud'
const WOUD_PATHS = {
  bospad: { id: 'bospad', name: 'Die Bospad', parent: 'woud' },
  karpov: { id: 'karpov', name: 'Karpov se Pad', parent: 'woud' }
};

const AMBIGUOUS_BUBBLE = "Hmm... die grond verander onder ons voete. Is dit Die Vlakte of Die Nether? Hou dop!";

// ---------------------------------------------------------------------------
// Tree builder helpers
// ---------------------------------------------------------------------------

function W(san, b) { return { w: san, b: b }; }

// ---------------------------------------------------------------------------
// World 1 — Die Vlakte (Exchange, no c4)
// 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3 Nf6 6.Bf4 Bg4 7.Qb3 Qd7/Na5 8.Nd2 e6
// ---------------------------------------------------------------------------

const V8 = W('Nd2', { e6: null });
const V7 = W('Qb3', { Qd7: V8, Na5: V8 });
const V6 = W('Bf4', { Bg4: V7 });
const V5 = W('c3', { Nf6: V6 });
const V4 = W('Bd3', { Nc6: V5 });
const V3 = W('exd5', { cxd5: V4 });
const V2 = W('d4', { d5: V3 });
const TREE_VLAKTE = W('e4', { c6: V2 });

// ---------------------------------------------------------------------------
// World 2 — Die Muur (Advance 3.e5)
// 1.e4 c6 2.d4 d5 3.e5 Bf5 4.Nf3 e6 5.Be2 Nd7/c5
//   Nd7: 6.O-O Ne7 7.Nbd2 h6 8.Nb3 Bh7/c5
//   c5:  6.Be3 Qb6 7.Nc3 Nc6 8.O-O cxd4
// ---------------------------------------------------------------------------

const M8n = W('Nb3', { Bh7: null, c5: null });
const M_Nd7_branch = W('O-O', { Ne7: W('Nbd2', { h6: M8n }) });
const M_c5_branch = W('Be3', { Qb6: W('Nc3', { Nc6: W('O-O', { cxd4: null }) }) });
const M5 = W('Be2', { Nd7: M_Nd7_branch, c5: M_c5_branch });
const M4 = W('Nf3', { e6: M5 });
const M3 = W('e5', { Bf5: M4 });
const M2 = W('d4', { d5: M3 });
const TREE_MUUR = W('e4', { c6: M2 });

// ---------------------------------------------------------------------------
// World 3a — Die Bospad (Classical, 4...Bf5)
// 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5 5.Ng3 Bg6 6.h4 h6 7.Nf3 Nd7 8.h5 Bh7
// 9.Bd3 Bxd3 10.Qxd3 e6   (rails run all the way to move 10; main line only)
// ---------------------------------------------------------------------------

const B10 = W('Bd3', { Bxd3: W('Qxd3', { e6: null }) });
const B8 = W('h5', { Bh7: B10 });
const B7 = W('Nf3', { Nd7: B8 });
const B6 = W('h4', { h6: B7 });
const TREE_BOSPAD = W('Ng3', { Bg6: B6 });

// ---------------------------------------------------------------------------
// World 3b — Karpov se Pad (4...Nd7)
// 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.{Nf3|Qe2|Ng5} (1/3 each)
//   Nf3: 5...Ngf6 6.Nxf6+ Nxf6 7.Bd3 e6 8.O-O Be7
//   Qe2: TRAP — 5...Ngf6?? 6.Nd6#. Correct: 5...Ndf6 or 5...e6, then transposes
//        6.Nxf6+ Nxf6 7.Bd3 e6 8.O-O Be7 (via Ndf6) or 6.Nf3 Ngf6 7.Bd3 Be7 8.O-O (via e6)
//   Ng5: 5...Ngf6 6.Bd3 e6 7.N1f3 Bd6 8.Qe2 h6
// ---------------------------------------------------------------------------

const KARPOV_MAIN_TAIL = W('Nxf6+', { Nxf6: W('Bd3', { e6: W('O-O', { Be7: null }) }) });

const TREE_KARPOV = {
  wRandom: ['Nf3', 'Qe2', 'Ng5'],
  branches: {
    Nf3: { b: { Ngf6: KARPOV_MAIN_TAIL } },
    Qe2: {
      // Ndf6/e6 continuations transposing back toward the main tabiya are this
      // trainer's own extrapolation — the spec only mandates the trap itself
      // (5...Ngf6?? 6.Nd6#) and the correct 5th-move replies, not a full line.
      b: {
        Ndf6: KARPOV_MAIN_TAIL,
        e6: W('Nf3', { Ngf6: W('Bd3', { Be7: null }) })
      },
      trap: {
        move: 'Ngf6',
        reply: 'Nd6#',
        message: "Die creeper het ontplof! Onthou: kyk ALTYD vir skaakte voor jy outomaties speel."
      }
    },
    Ng5: { b: { Ngf6: W('Bd3', { e6: W('N1f3', { Bd6: W('Qe2', { h6: null }) }) }) } }
  }
};

// ---------------------------------------------------------------------------
// World 3 — Die Woud combined: branches at Black's move 4 (Bf5 vs Nd7)
// 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Bf5/Nd7
// ---------------------------------------------------------------------------

const WD4 = W('Nxe4', { Bf5: TREE_BOSPAD, Nd7: TREE_KARPOV });
const WD3 = W('Nc3', { dxe4: WD4 });
const WD2 = W('d4', { d5: WD3 });
const TREE_WOUD = W('e4', { c6: WD2 });

// ---------------------------------------------------------------------------
// World 4 — Die Nether (Panov-Botvinnik)
// 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7/Bb4
//   Be7: 7.cxd5 Nxd5 8.Bd3 Nc6
//   Bb4: 7.cxd5 Nxd5 8.Bd2 Nc6
// ---------------------------------------------------------------------------

const N6 = W('Nf3', {
  Be7: W('cxd5', { Nxd5: W('Bd3', { Nc6: null }) }),
  Bb4: W('cxd5', { Nxd5: W('Bd2', { Nc6: null }) })
});
const N5 = W('Nc3', { e6: N6 });
const N4 = W('c4', { Nf6: N5 });
const N3 = W('exd5', { cxd5: N4 });
const N2 = W('d4', { d5: N3 });
const TREE_NETHER = W('e4', { c6: N2 });

const WORLD_TREES = {
  vlakte: TREE_VLAKTE,
  muur: TREE_MUUR,
  woud: TREE_WOUD,
  nether: TREE_NETHER
};

// Black moves at or below this number are strict rails (reject wrong moves).
// Above it (through move 8, per §5) any legal move is accepted and scored
// instead. Die Bospad is the one exception: "only main moves accepted" for
// its whole length, so it never enters the scored-freedom phase.
const RAILS_STRICT_THROUGH = { vlakte: 5, muur: 5, woud: 5, bospad: 10, karpov: 5, nether: 5 };

// ---------------------------------------------------------------------------
// Reveal rules
// ---------------------------------------------------------------------------
// Checked against White's SAN move at each White ply number (1-indexed White move count).
const REVEAL_AT_WHITE_MOVE_3 = { e5: 'muur', Nc3: 'woud' };
// exd5 at move 3 is ambiguous; resolved by White's move 4.
const REVEAL_AT_WHITE_MOVE_4 = { c4: 'nether' }; // anything else (Bd3) -> vlakte

// ---------------------------------------------------------------------------
// Reisiger dialogue
// ---------------------------------------------------------------------------

const REISIGER = {
  railsWrong: "Hierdie is nie die regte lyn nie — soek en vind!",
  blunder: "Eina! Kyk weer — wat het ek net weggegee?",
  ambiguous: AMBIGUOUS_BUBBLE,
  karpovChosen: "Aha — jy kies Karpov se Pad. Volg my.",
  bospadChosen: "Aha — jy kies Die Bospad. Volg my.",
  end: "Jy het al die pad tot by The End gekom, geluk!",
  loadingKarpov: [
    "Karpov het gesê: verbeter een stuk op 'n slag, dan word jou posisie so vas soos bedrock.",
    "Ek het eendag saam met Karpov gereis, oor die hele Vlakte.",
    "In elke biome is daar 'n pad — kyk mooi na Wit se spore."
  ],
  verdict: {
    winning: "Jy staan beter!",
    equal: "Dis gelykop — soos twee ewe hoë torings.",
    losing: "Wit staan beter — maar jy het baie geleer."
  }
};

// ---------------------------------------------------------------------------
// Move commentary — shown when the student plays a correct rails move
// (moves 1-5 of each of the 4 biomes; Woud's move 4 is the path-choice
// bubble instead, so its commentary picks up again with move 5's SAN,
// keyed per branch since White's random 5th move changes what Black plays).
// Keyed by pathId -> SAN. ~20 entries across the 4 top-level biomes.
// ---------------------------------------------------------------------------

const MOVE_COMMENTARY = {
  vlakte: {
    c6: "Reg! c6 berei d5 voor sonder om 'n stuk se pad te blokkeer.",
    d5: "Slim! d5 veg dadelik vir die middel teen Wit se e4-pion.",
    cxd5: "Mooi! Jy herower gelyk — die posisie is nou oop en gebalanseerd.",
    Nc6: "Goed! Nc6 ontwikkel 'n stuk en hou d5 stewig vas.",
    Nf6: "Uitstekend! Nf6 ontwikkel en hou die e4-veld dop."
  },
  muur: {
    c6: "Reg! c6 maak gereed vir d5, net soos in Die Vlakte.",
    d5: "Mooi! d5 dwing Wit om met e5 die muur te bou.",
    Bf5: "Slim! Bf5 kry jou loper uit VOOR jy die deur met e6 toemaak.",
    e6: "Goed! Nou is die deur toe, maar jou loper is klaar buite.",
    Nd7: "Uitstekend! Nd7 berei voor om na e7 te ontwikkel en later c5 te speel.",
    c5: "Slim! c5 is die TNT — jy val die muur se fondament dadelik aan."
  },
  woud: {
    c6: "Reg! c6 hou die middel gereed vir d5.",
    d5: "Mooi! d5 daag Wit se e4-pion uit.",
    dxe4: "Goed! Jy vang die pion — nou moet Wit terugneem."
  },
  bospad: {
    Bg6: "Slim! Bg6 stoot die loper terug, uit die perd se pad."
  },
  karpov: {
    Ngf6: "Reg! Ngf6 ontwikkel veilig — die perd val nie in slagysters nie.",
    Ndf6: "Uitstekend! Jy het die slagyster raakgesien en veilig ontwikkel.",
    e6: "Slim! e6 maak veilig oop sonder om in die slagyster te trap."
  },
  nether: {
    c6: "Reg! c6 hou gereed vir d5 teen Wit se skerp aanval.",
    d5: "Mooi! d5 veg vir die middel.",
    cxd5: "Goed! Na 4.c4 kom die Nether se skerp geveg nader.",
    Nf6: "Slim! Nf6 val Wit se d5-pion aan.",
    e6: "Uitstekend! e6 berei voor om die pion op d5 te herower."
  }
};

// ---------------------------------------------------------------------------
// Mastery constants
// ---------------------------------------------------------------------------

const TIER = { GEEN: 'geen', REDSTONE: 'redstone', KOPER: 'koper', BRONS: 'brons', SILWER: 'silwer', GOUD: 'goud' };
const TIER_WEIGHT = { geen: 6, redstone: 5, koper: 4, brons: 3, silwer: 2, goud: 1 };
const TIER_ORDER = ['geen', 'redstone', 'koper', 'brons', 'silwer', 'goud'];

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

const SCORE = {
  THEORY_MOVE: 1,
  APPROVED_MOVE: 1,
  ENGINE_BEST: 3, // 1 diamond == 3 emeralds
  BLUNDER_PENALTY: -1,
  WIN_BONUS: 5,
  END_BONUS: 3,
  APPROVED_CP_THRESHOLD: 30,
  PENALTY_CP_THRESHOLD: 100,
  BLUNDER_CP_THRESHOLD: 300,
  RESIGN_EVAL_FOR_WHITE: -900,
  END_MOVE: 30,
  BLUNDER_MOVE_NUMBER: 25,
  BLUNDER_MIN_CP_LOSS: 200,
  SKIP_BLUNDER_IF_WHITE_EVAL_BELOW: -500
};

if (typeof module !== 'undefined') {
  module.exports = { BIOMES, WOUD_PATHS, WORLD_TREES, RAILS_STRICT_THROUGH, REVEAL_AT_WHITE_MOVE_3, REVEAL_AT_WHITE_MOVE_4, REISIGER, MOVE_COMMENTARY, TIER, TIER_WEIGHT, TIER_ORDER, SCORE, GAME_PREFIX, PLAYERS, ASSET_V };
}
