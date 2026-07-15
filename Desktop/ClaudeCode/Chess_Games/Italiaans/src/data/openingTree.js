// Opening Tree — Italian Opening repertoire, 6 White moves deep.
//
// KEY   : game.history().join(' ') — full move sequence BEFORE White's next move.
// VALUE : {
//   variationName  : string | null   — announced when this position is reached
//   whiteMoves     : { [san]: MoveData }
//   fallbackScore  : number          — score for any san not listed (default 1)
// }
//
// MoveData : {
//   score         : 1 | 2 | 3 | 4
//   label         : string | null    — short review note
//   variationName : string | null    — announced when White plays THIS move
//   explanation   : ExplanationData | null
//   layerComplete : 1 | 2 | 3 | null — Layer achieved by reaching this node
// }
//
// ExplanationData : {
//   vraag  : string
//   opsies : [{ teks: string, korrek: boolean }]  — exactly one korrek: true
// }
//
// Afrikaans note: strings containing 'n (indefinite article) MUST use double quotes.

export const OPENING_TREE = {

  // ── MOVE 1 ────────────────────────────────────────────────────────────
  '': {
    whiteMoves: {
      'e4': {
        score: 4,
        explanation: {
          vraag: "Waarom het jy 1.e4 gespeel?",
          opsies: [
            { teks: "Dit beheer die d5- en f5-sentrum punte direk", korrek: true },
            { teks: "Dit maak pad vir die koningin", korrek: false },
            { teks: "Dit beskerm die konings-ruiter op g1", korrek: false },
          ],
        },
      },
      'd4': { score: 2, label: "Geldige keuse, maar ons is Italiane — 1.e4!" },
      'Nf3': { score: 2, label: "Reti — interessant, maar nie ons plan" },
      'c4': { score: 2, label: "Engels — solied, maar ons wil die Italianer speel" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 e5 (Italian path) ─────────────────────────────
  'e4 e5': {
    whiteMoves: {
      'Nf3': {
        score: 4,
        explanation: {
          vraag: "Waarom het jy 2.Nf3 gespeel?",
          opsies: [
            { teks: "Dit val die e5-pion aan en ontwikkel 'n stuk gelyktydig", korrek: true },
            { teks: "Dit maak pad vir die koningskasteel", korrek: false },
            { teks: "Dit blokkeer die c1-biskop", korrek: false },
          ],
        },
      },
      'Nc3': { score: 2, label: "Wee Ridders, maar verloor die druk op e5" },
      'f4': { score: 1, label: "Konings Gambiet — avontuurlik maar buite ons repertoire" },
      'd4': { score: 2, label: "Sentrum Opens — ons wil eers ontwikkel" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 c5 (Sicilian) ────────────────────────────────
  'e4 c5': {
    variationName: "Sisiliaanse Verdediging 🐉 — ons het 'n plan!",
    whiteMoves: {
      'Nf3': { score: 4, label: "Oop Sisiliaans — hooflyn" },
      'Nc3': { score: 3, label: "Geslote Sisiliaans" },
      'c3': { score: 3, label: "Alapin — solide" },
      'd4': { score: 1, label: "Nie standaard — Nf3 eers" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 e6 (French) ──────────────────────────────────
  'e4 e6': {
    variationName: "Franse Verdediging 🌸",
    whiteMoves: {
      'd4': { score: 4, label: "Klassieke Frans — bou die sentrum" },
      'd3': { score: 2, label: "Passief — verloor sentrumdominansie" },
      'Nf3': { score: 2 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 c6 (Caro-Kann) ───────────────────────────────
  'e4 c6': {
    variationName: "Caro-Kann Verdediging 🛡️",
    whiteMoves: {
      'd4': { score: 4, label: "Klassieke Caro-Kann" },
      'Nc3': { score: 3 },
      'Nf3': { score: 2, label: "Verloor sentrumdruk" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 d5 (Scandinavian) ────────────────────────────
  'e4 d5': {
    variationName: "Skandinawiese Verdediging 🌊",
    whiteMoves: {
      'exd5': { score: 4, label: "Aanvaar die uitdaging — wen tyd" },
      'e5': { score: 1, label: "Verloor die sentrum gratis" },
      'Nc3': { score: 2 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 Nf6 (Alekhine) ──────────────────────────────
  'e4 Nf6': {
    variationName: "Alekhine se Verdediging 🦅",
    whiteMoves: {
      'e5': { score: 4, label: "Dryf die ruiter — klassieke Alekhine" },
      'Nc3': { score: 2 },
      'd3': { score: 2 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 d6 (Pirc) ────────────────────────────────────
  'e4 d6': {
    variationName: "Pirc Verdediging 🌀",
    whiteMoves: {
      'd4': { score: 4, label: "Bou die sentrum — Pirc plan" },
      'Nf3': { score: 3 },
      'Nc3': { score: 3 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 2 — after 1.e4 g6 (Modern) ─────────────────────────────────
  'e4 g6': {
    variationName: "Moderne Verdediging 🌀",
    whiteMoves: {
      'd4': { score: 4 },
      'Nf3': { score: 3 },
      'Nc3': { score: 3 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 3 — after 1.e4 e5 2.Nf3 Nc6 (main Italian path) ─────────────
  'e4 e5 Nf3 Nc6': {
    whiteMoves: {
      'Bc4': {
        score: 4,
        variationName: "Italianer Bereik! 🇮🇹",
        explanation: {
          vraag: "Waarom het jy 3.Bc4 gespeel en nie 3.Bb5 nie?",
          opsies: [
            { teks: "Bc4 mik direk op die swak f7-punt agter die konings-ruiter", korrek: true },
            { teks: "Bc4 is eenvoudiger as die Spaanse Opening", korrek: false },
            { teks: "Bb5 is die Ruy Lopez — ons is Italiane", korrek: false },
          ],
        },
      },
      'Bb5': { score: 3, label: "Spaanse Opening (Ruy Lopez) — ook uitstekend, maar nie ons lyn" },
      'd4': { score: 2, label: "Skotse Opening — aggressief maar verlaat Italianer pad" },
      'Nc3': { score: 2 },
      'Bc2': { score: 1, label: "Biskop terug? Geen druk op f7 nie!" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 3 — after 1.e4 e5 2.Nf3 Nf6 (Petrov) ────────────────────────
  'e4 e5 Nf3 Nf6': {
    variationName: "Petrov se Verdediging",
    whiteMoves: {
      'Nxe5': { score: 4, label: "Aanvaar die uitnodiging" },
      'Nc3': { score: 3, label: "Drie Ridders" },
      'd4': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 3 — after 1.e4 e5 2.Nf3 d6 (Philidor) ───────────────────────
  'e4 e5 Nf3 d6': {
    whiteMoves: {
      'd4': { score: 4 },
      'Bc4': { score: 3 },
      'Nc3': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 4 — after 3.Bc4 Bc5 (Giuoco Piano) ──────────────────────────
  'e4 e5 Nf3 Nc6 Bc4 Bc5': {
    variationName: "Giuoco Piano 🎵",
    whiteMoves: {
      'c3': {
        score: 4,
        explanation: {
          vraag: "Waarom het jy 4.c3 gespeel?",
          opsies: [
            { teks: "Dit berei 'n d4 sentrum-aanval voor op die volgende skuif", korrek: true },
            { teks: "Dit beskerm die biskop op c4", korrek: false },
            { teks: "Dit ontwikkel die dame-ruiter na c3", korrek: false },
          ],
        },
      },
      'b4': {
        score: 4,
        variationName: "Evans Gambiet! 💣",
        label: "Gambiet! Wit offer 'n pion vir geweldige aanval",
      },
      'd3': { score: 3, label: "Pianissimo — solied posisioneel" },
      'd4': { score: 3, label: "Direkte sentrumaanval" },
      'Nc3': { score: 3, label: "Drie Ridders variasie" },
      'O-O': { score: 2, label: "Rokeer te vroeg — verloor aanvalsgeleentheid" },
      'Bb3': { score: 2, label: "Biskop terug — verloor druk" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 4 — after 3.Bc4 Nf6 (Two Knights) ───────────────────────────
  'e4 e5 Nf3 Nc6 Bc4 Nf6': {
    variationName: "Twee Ridders Verdediging 🐴",
    whiteMoves: {
      'Ng5': {
        score: 4,
        variationName: "Fried Liver Aanval 🔥",
        label: "Mik op f7 — skerp en gevaarlik!",
      },
      'd3': { score: 3, label: "Solied Italianer struktuur" },
      'd4': { score: 3, label: "Aggressiewe sentrumaanval" },
      'Nc3': { score: 3, label: "Vier Ridders variasie" },
      'O-O': { score: 2 },
      'e5': { score: 1, label: "Dryf ruiter maar verloor sentrumbeheer" },
    },
    fallbackScore: 1,
  },

  // ── MOVE 4 — after 3.Bc4 Be7 (Hungarian Defense) ─────────────────────
  'e4 e5 Nf3 Nc6 Bc4 Be7': {
    variationName: "Hongaarse Verdediging 🦔 — Swart wil passief speel!",
    whiteMoves: {
      'd4': { score: 4, label: "Aanval terwyl Swart passief is" },
      'd3': { score: 3, label: "Solied — Pianissimo struktuur" },
      'Nc3': { score: 3 },
      'O-O': { score: 2 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 4 — after 3.Bc4 d6 (Paris / Anti-norm) ──────────────────────
  'e4 e5 Nf3 Nc6 Bc4 d6': {
    whiteMoves: {
      'd4': { score: 4 },
      'Nc3': { score: 3 },
      'd3': { score: 3 },
      'c3': { score: 3 },
    },
    fallbackScore: 1,
  },

  // ── MOVE 4 — after 3.Bc4 g6 (Hungarian/fianchetto) ───────────────────
  'e4 e5 Nf3 Nc6 Bc4 g6': {
    whiteMoves: {
      'd4': { score: 4 },
      'd3': { score: 3 },
      'Nc3': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 5 — Giuoco Piano after 4.c3 ──────────────────────────────────

  // 4.c3 Nf6 (most common Black response)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6': {
    whiteMoves: {
      'd4': {
        score: 4,
        variationName: "Giuoco Piano Aanval ⚔️",
        label: "Sentrum breuk — die beste tyd!",
      },
      'd3': {
        score: 4,
        variationName: "Pianissimo 🤫",
        label: "Stil maar gevaarlik soos 'n Ferrari in rat een",
      },
      'O-O': { score: 2, label: "Redelik maar verloor sentrumkans" },
      'Ng5': { score: 1, label: "Ng5 hier verloor tyd — geen aanval nie" },
    },
    fallbackScore: 2,
  },

  // 4.c3 d6
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6': {
    whiteMoves: {
      'd4': { score: 4, variationName: "Giuoco Piano Aanval ⚔️" },
      'd3': { score: 4, variationName: "Pianissimo 🤫" },
      'O-O': { score: 2 },
    },
    fallbackScore: 2,
  },

  // 4.c3 Bb6 (bishop retreats)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Bb6': {
    whiteMoves: {
      'd4': { score: 4 },
      'd3': { score: 3 },
      'O-O': { score: 2 },
    },
    fallbackScore: 2,
  },

  // 4.c3 d6 5... (bishop stays)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 a6': {
    whiteMoves: {
      'd4': { score: 4 },
      'd3': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 5 — Evans Gambit after 4.b4 ──────────────────────────────────

  // Black accepts: 4.b4 Bxb4
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4': {
    variationName: "Evans Gambiet Aanvaar! 💣",
    whiteMoves: {
      'c3': {
        score: 4,
        label: "Hooflyn Evans — terugwen pion met geweldige aanval",
      },
      'd4': { score: 2, label: "Kan speel, maar c3 is sterker" },
      'a3': { score: 2 },
    },
    fallbackScore: 1,
  },

  // Black declines: 4.b4 Bb6
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6': {
    whiteMoves: {
      'a4': { score: 4, label: "Druk die biskop verder terug — ruimtevoorsprong" },
      'Nc3': { score: 3 },
      'd3': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 5 — Two Knights after 4.Ng5 d5 ──────────────────────────────
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5': {
    whiteMoves: {
      'exd5': { score: 4, label: "Hooflyn Fried Liver — hou die druk" },
      'd3': { score: 2, label: "Verloor die Fried Liver kans" },
      'Bd3': { score: 1 },
    },
    fallbackScore: 1,
  },

  // Traxler Counter-Attack: 4.Ng5 Bc5!? (trap!)
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5': {
    variationName: "Traxler Teen-Aanval! ⚠️ Swart speel 'n val!",
    whiteMoves: {
      'Nxf7': { score: 4, label: "Korrekte reaksie — aanvaar maar speel versigtig!" },
      'd4': { score: 3, label: "Veilig maar passief" },
      'Bxf7+': { score: 2, label: "Ander opsie maar minder presies" },
    },
    fallbackScore: 1,
  },

  // Blackburne-Shilling: 3...Nd4 (early trap after Bc4)
  'e4 e5 Nf3 Nc6 Bc4 Nd4': {
    variationName: "Blackburne-Shilling! ⚠️ Val gespeel!",
    whiteMoves: {
      'Nxd4': { score: 1, label: "VAL! Nxd4 verloor die biskop na Qg5" },
      'Nxe5': { score: 4, label: "Korrekte antwoord — ignore die val!" },
      'd3': { score: 4, label: "Solied — ignore die val" },
      'c3': { score: 3 },
    },
    fallbackScore: 2,
  },

  // ── MOVE 6 — Giuoco Piano centre battle ───────────────────────────────

  // 5.d4 exd4 → centre exchanged
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4': {
    whiteMoves: {
      'cxd4': {
        score: 4,
        layerComplete: 3,
        label: "Sentrum breuk uitgevoer! Laag 3 bereik!",
      },
      'e5': { score: 3, label: "Aggressief — dryf die ridder terug" },
      'O-O': { score: 2, label: "Vertraag die herovering" },
    },
    fallbackScore: 1,
  },

  // 5.d4 Bb6 (bishop retreats instead of exchange)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 Bb6': {
    whiteMoves: {
      'dxe5': { score: 4, label: "Wen pion — Swart se biskop is passief" },
      'd5': { score: 4, label: "Aggressief — sluit die ruiter toe" },
      'O-O': { score: 3 },
    },
    fallbackScore: 2,
  },

  // 5.d3 O-O (Pianissimo — natural development)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 O-O': {
    whiteMoves: {
      'O-O': {
        score: 4,
        layerComplete: 1,
        label: "Laag 1 voltooi! Rokeer veilig, struktuur perfek",
      },
      'Nbd2': { score: 4, label: "Ontwikkel ruiter — pad vir rokade" },
      'Bg5': { score: 3, label: "Speld die ridder" },
      'b4': { score: 2, label: "Evans-agtig maar te laat hier" },
    },
    fallbackScore: 2,
  },

  // 5.d3 d6 (flexible Pianissimo)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6': {
    whiteMoves: {
      'Nbd2': { score: 4, label: "Pianissimo meesterplan" },
      'O-O': { score: 4 },
      'Bg5': { score: 3 },
    },
    fallbackScore: 2,
  },

  // Evans Gambit 5.c3 Bc5 (main line)
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3': {
    whiteMoves: {
      // Black plays 5...Ba5 usually — White plays 6.d4
    },
    fallbackScore: 3, // anything reasonable is ok here
  },

  // Fried Liver 5.exd5 Nxd5 → 6.Nxf7!
  'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5': {
    variationName: "Fried Liver Aanval! 🔥 Wit offer 'n ridder!",
    whiteMoves: {
      'Nxf7': {
        score: 4,
        label: "Die offer! Skaak op f7 — Konings-roof!",
      },
      'Qf3': { score: 2, label: "Minder skerp maar veilig" },
      'd4': { score: 2 },
    },
    fallbackScore: 1,
  },

};

// ── Layer completion detection ────────────────────────────────────────────
// Called after each White move with the full move history (including latest move).

export function detectLayerComplete(history) {
  const sans = new Set(history);
  const layer1 = sans.has('Bc4') && sans.has('Nf3') && sans.has('d3');
  const layer2 = layer1 && sans.has('c3') && (sans.has('Na3') || sans.has('Nc3') || sans.has('Nbd2'));
  // Layer 3: the c3-d4 break was executed (cxd4 appears after d4 was played)
  const layer3 = layer2 && sans.has('cxd4');
  if (layer3) return 3;
  if (layer2) return 2;
  if (layer1) return 1;
  return 0;
}

// ── Main lookup helpers ───────────────────────────────────────────────────

export function lookupPosition(moveHistory) {
  return OPENING_TREE[moveHistory.join(' ')] || null;
}

// Returns the SAN of the highest-scoring move for the given position,
// or null if the position is not in the tree.
export function getTreeHintMove(history) {
  const node = lookupPosition(history);
  if (!node?.whiteMoves) return null;
  const best = Object.entries(node.whiteMoves)
    .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0))[0];
  return best ? best[0] : null;
}

// ── Mid-game Italian theme detection ────────────────────────────────────────
// Called after each White move. Returns the ID of the first newly-triggered
// mid-game panel, or null. Each panel fires at most once per game.
// announcedPanels: Set<string> of panel IDs already shown this game.
// game: chess.js instance (used for bishop-pair count).

export function detectNewMidgamePanel(history, game, announcedPanels, score = 4) {
  const sans = new Set(history);

  // f7 attack — Ng5 aimed at f7 with Bc4 support
  if (!announcedPanels.has('ng5_f7') && sans.has('Ng5'))
    return 'ng5_f7';

  // Castling educational panel — only when castling was a good move (score >= 3).
  // A bad castling (score 1-2) castles into danger and shouldn't get the praise panel.
  if (!announcedPanels.has('rokeer_veilig') && sans.has('O-O') && score >= 3)
    return 'rokeer_veilig';

  // c3-d4 pawn break executed (d4 played after c3, at least 10 half-moves in)
  if (!announcedPanels.has('sentrum_breuk') && sans.has('c3') && sans.has('d4') && history.length >= 10)
    return 'sentrum_breuk';

  // Bishop pair — White has both bishops while Black has lost at least one of theirs.
  // The advantage only exists when the opponent no longer has the bishop pair.
  if (!announcedPanels.has('biskoppaar') && history.length >= 14) {
    const board = game.board().flat();
    const whiteBishops = board.filter(sq => sq?.type === 'b' && sq?.color === 'w').length;
    const blackBishops = board.filter(sq => sq?.type === 'b' && sq?.color === 'b').length;
    if (whiteBishops === 2 && blackBishops <= 1)
      return 'biskoppaar';
  }

  // Rook activation — rook moves to central open file after castling
  if (!announcedPanels.has('toring_aktief') && (sans.has('Re1') || sans.has('Rd1')))
    return 'toring_aktief';

  return null;
}

// Called with history BEFORE the move was played, and the SAN of the move.
// Returns full scoring result including bestMoveSan when score < 4.
export function scoreWhiteMove(historyBeforeMove, san) {
  const node = lookupPosition(historyBeforeMove);
  const fallback = { score: 1, label: null, variationName: null, explanation: null, layerComplete: null, bestMoveSan: null };

  if (!node) return fallback;

  const mv = node.whiteMoves?.[san];

  // Find the best alternative move (score 4) if the played move wasn't perfect
  function findBestMove(playedSan, moves) {
    if (!moves) return null;
    const entries = Object.entries(moves).filter(([s]) => s !== playedSan);
    const best = entries.sort(([, a], [, b]) => (b.score || 0) - (a.score || 0))[0];
    return best && best[1].score >= 4 ? best[0] : null;
  }

  if (!mv) {
    const bestMoveSan = findBestMove(san, node.whiteMoves);
    return {
      ...fallback,
      score: node.fallbackScore ?? 1,
      variationName: node.variationName || null,
      bestMoveSan,
    };
  }

  const bestMoveSan = mv.score < 4 ? findBestMove(san, node.whiteMoves) : null;

  return {
    score: mv.score,
    label: mv.label || null,
    variationName: mv.variationName || node.variationName || null,
    explanation: mv.explanation || null,
    layerComplete: mv.layerComplete || null,
    bestMoveSan,
  };
}
