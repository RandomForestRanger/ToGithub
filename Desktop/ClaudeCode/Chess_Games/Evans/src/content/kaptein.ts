// Every Afrikaans string the Captain says (CLAUDE.md section 12).
// ROUND_START, RETARGET and MISSED are Martin's own wording — keep them exactly.
// Use double quotes for any string containing 'n (Afrikaans article).

export const K = {
  ROUND_START: ['Hierdie rondte speel ons die "{line}".'],
  RETARGET: ['Geen probleem, jy het sopas oorgeskuif na die "{line}".'],
  MISSED: ['Om die "{line}" lyn te ontsluit moes jy hierso {move} gespeel het.'],

  ROUND_FLAVOUR: ['Die gety is reg, goeie matroos. Gooi die lokaas!', 'Stoom op!'],
  ENTRY_WRONG: ['Ons vaar na die Evans-spel: speel liewer {move}.'],
  BAIT: ['Die lokaas is in die water.'],
  BLACK_ACCEPTS: ['Oho! Die vis byt!'],
  BLACK_DECLINES: ['Ga. Die vis het ons aas nie gevat nie. Goed dan, nuwe plan.'],
  COUNTERGAMBIT: ["Die vis wil ons byt. Ho ho ho! 'n Teengambiet - nou gaan ons hom kry."],
  GREEDY: ['Die gulsige vis sluk die hele hoek in! Pasop, vis!'],
  SPITS_HOOK: ['Die vis spoeg die hoek uit. Ek reken hy wil die pion vir ons teruggee.'],
  LINE_MOVE: ['Da iawn! Reg op koers.', 'Presies volgens die kaart, mooi so!', 'Bendigedig! Mooi man.', 'Die kompas wys reg - goeie skuif!'],
  LINE_CONQUERED: ['Die "{line}" is joune! Hou aan dink.'],
  CHAIN: ['Ja! Ons hou nog aan: volgende vaar ons na die "{line}".'],
  RETARGET_NOTE: ['(Vir die "{line}" moes jy hierso {move} gespeel het.)'],
  TOP_TWO: ['Sterk skuif daarso! ', "Ardderchog, dis 'n topskuif! "],
  OFF_CHART: ['Hmm. Ons is effens van die kaart af. Van nou af stuur jy self.'],
  CHART_END: ['Afgehandel! Hierdie lyn eindig hierso, van hier af is dit mooi oop see.'],
  STEAM_GOLD: ['Volstoom! Volstoom! Die fluitjie blaas van al die stoom.'],
  STEAM_GREEN: ['Goeie druk. Hou die vuur aan die brand.'],
  STEAM_AMBER: ['Die stoom lek! Onthou, ons gee die pion weg sodat ons DRUK kan plaas.'],
  // Not used since 28 Oct: the needle now shows pressure, not the eval, so theory dips no longer show on it.
  STEAM_THEORY: ['Ja, dit is nou so – om by die "{line}" uit te kom, moet ons \'n paar vreemde skuiwe maak.'],
  STEAM_COLD: ['Die ketel is nou koud. Kom, kry vir ons die vuur weer aan.'],
  DEBT_PAID: ['Skuld betaal! Als reg, ons speel voort.'],
  // --- new on 28 Oct (drafts for Martin) ---
  // the standing question: added after CHART_END, after a cold needle in open sea, and after a checkpoint
  QUESTION: ['Wat vra jou skuif vir Swart?'],
  // Black missed his only safe move under pressure, and he answered it well / let it go
  CRACK_CAUGHT: ['Hy het net een veilige skuif gehad, en hy het dit gemis. En jy het hom gevang! Dis wat druk doen.'],
  CRACK_ESCAPED: ['Swart het onder druk gegly, maar jy het hom laat wegkom. Kyk weer: wat het hy oopgelos?'],
  // "Wat het jou pion gekoop?" checkpoints
  CHECK_RIGHT: ['Da iawn! Dis presies wat jou pion gekoop het.', 'Bendigedig! Jy weet waarvoor jy betaal het.'],
  CHECK_WRONG: ['Hmm, kyk weer na die bord.'],
  CHECK_HONEST: ['Eerlik is eerlik, matroos: die druk is weg. Maak nuwe druk, of kry die pion terug.'],
  POINTS_4: ['Ardderchog! Mooi man.', 'Netjies.'],
  // a good move he had no real choice about (marks still count); Martin's wording, to be refined.
  // Leave a category as [''] for the Captain to stay silent.
  FORCED: ["Ja-nee, swart het jou nie regtig 'n keuse gegee nie."],
  RESCUE: ['Dankie tog daar was daardie opsie.'],
  POINTS_3: ["Goed. Daar was miskien 'n beter manier?"],
  POINTS_2: ['Hmm - wat is jou plan? Wys my.'],
  POINTS_1: ["Oeps. Nie jou beste opsie nie."],
  BISHOP_STUURBOORD: ['Stuurboord se lig skyn op f7!'],
  BISHOP_BAKBOORD: ['Bakboord sluit die deur. Die koning kan nie rokeer nie!'],
  END_GOLD: ['Goud! Jy het die pion opgegee en \'n lekker wins ingebring. Hwyl fawr!'],
  END_GREEN: ['Groen! Die lyn is joune. Volgende keer: maak die lyn sommer goud.'],
  END_MISSED: ['Die vissie het iewers weggeglip. Toemaar Matroos, daar is altyd nog \'n kans.'],
  END_WHITE_MATES: ['Skaakmat! Die vangs van die dag! Jy\'s \'n goeie seeman.'],
  END_WHITE_MATED: ['Ons het gesink. Maar elke kaptein word \'n paar maal nat!'],
  END_DRAW: ['Gelykop! Nou toe, die see is kalm vandag.'],
  // toernooi (since 30 Oct; drafts for Martin to edit): said only at the end of a toernooi game
  END_TOERNOOI_WON: ['Die toernooi is joune! Die pion het druk gekoop, en jy het die druk wins gemaak.'],
  END_TOERNOOI: ['Die toernooi is klaar. Volgende keer: maak die druk wins.'],
} as const;

export type KKey = keyof typeof K;

/** The Captain's face for each kind of line (anything not listed is 'steady'). */
export type Mood = 'steady' | 'pleased' | 'worried' | 'overjoyed';
export const MOOD: Partial<Record<KKey, Mood>> = {
  BLACK_ACCEPTS: 'pleased', LINE_MOVE: 'pleased', CHAIN: 'pleased', TOP_TWO: 'pleased', RETARGET: 'pleased',
  STEAM_GREEN: 'pleased', DEBT_PAID: 'pleased', POINTS_4: 'pleased',
  BISHOP_STUURBOORD: 'pleased', BISHOP_BAKBOORD: 'pleased', END_GREEN: 'pleased',
  LINE_CONQUERED: 'overjoyed', SPITS_HOOK: 'overjoyed', GREEDY: 'overjoyed', STEAM_GOLD: 'overjoyed',
  END_GOLD: 'overjoyed', END_WHITE_MATES: 'overjoyed', END_TOERNOOI_WON: 'overjoyed',
  ENTRY_WRONG: 'worried', COUNTERGAMBIT: 'worried', MISSED: 'worried', STEAM_AMBER: 'worried', STEAM_COLD: 'worried',
  POINTS_2: 'worried', POINTS_1: 'worried', END_MISSED: 'worried', END_WHITE_MATED: 'worried',
  CRACK_CAUGHT: 'overjoyed', CHECK_RIGHT: 'pleased', CRACK_ESCAPED: 'worried', CHECK_WRONG: 'worried',
};

/** Pick one line of a category at random and fill {line} / {move}. */
export function say(key: KKey, vars: { line?: string; move?: string } = {}): string {
  const opts = K[key];
  const s = opts[Math.floor(Math.random() * opts.length)];
  return s.replace('{line}', vars.line ?? '').replace('{move}', vars.move ?? '');
}

// UI labels (not Captain speech).
export const UI = {
  title: 'Stoomdruk',
  subtitle: 'Kaptein Evans se Kelpwoud',
  begin: 'Begin \'n rondte',
  // toernooi mode (since 30 Oct)
  toernooi: 'Toernooi',
  verkenning: 'Verkenning',
  toernooiBegin: "Speel 'n toernooi",
  toernooiEntry: 'Speel die Evans: 1.e4, 2.Nf3, 3.Bc4, 4.b4. Daarna is jy op jou eie.',
  toernooiOpen: 'Oop see: elke skuif tel.',
  blackThinking: 'Swart dink...',
  records: (v: number | null, t: number | null) =>
    'Rekord: ' + [v !== null && `Verkenning ${v}`, t !== null && `Toernooi ${t}`].filter(Boolean).join(' · '),
  evalGraph: 'Die telling oor die spel',
  newRecord: 'Nuwe rekord!',
  record: (n: number) => `Rekord: ${n}`,
  toernooiScore: (moves: number, bonus: number) => `Skuiwe ${moves}/64 · Bonus ${bonus}`,
  againToernooi: "Nog 'n toernooi",
  ready: 'Ek is gereed!',
  route: 'Die roete',
  routeMoves: 'Die skuiwe',
  again: "Nog 'n rondte",
  backToForest: 'Terug na die Kelpwoud',
  thinking: 'Die Kaptein dink...',
  engineDown: 'Die enjinkamer is toe. Probeer weer.',
  counter: (g: number, au: number, n: number) => `Groen ${g}/${n} · Goud ${au}/${n}`,
  move: (m: number) => `Skuif ${m}/20`,
  points: (p: number) => `Punte ${p}`,
  reefNote: 'Pas op: hierdie lyn is teorie, maar riskant vir Wit.',
  lastMissed: (m: string) => `Laas moes jy hierso ${m} speel.`,
  states: { grey: 'Grys', green: 'Groen', gold: 'Goud' },
  stats: (p: number, g: number, au: number) => `Gespeel ${p} · Groen ${g} · Goud ${au}`,
  close: 'Maak toe',
  target: 'Teiken',
  score: 'Telling',
  coloured: 'Lyne hierdie rondte',
  noneColoured: 'Geen lyne hierdie rondte nie.',
  steamGraph: 'Stoomdruk oor die spel',
  keyMoments: 'Sleutelmomente',
  momentMissed: (line: string, m: string) => `Vir die "${line}" moes jy ${m} speel.`,
  // renamed 28 Oct: the needle is pressure now, so a fall in the eval is no longer a "stoomverlies"
  momentDrop: (m: string, d: number) => `Grootste val in die telling: ${m} (−${d.toFixed(1)})`,
  momentBest: (m: string) => `Beste skuif in oop see: ${m}`,
  lights: 'Skeepsligte',
  // not shown since 28 Oct (the needle shows pressure now, so it no longer dips with the line's theory)
  theoryDip: "Op pad na hierdie lyn sak die stoommeter onder nul. Dis die prys van die lyn, nie jou fout nie.",
  // brief for a grey line: the stages only; the moves are his to find (shown once the line is green)
  routeHidden: 'Die skuiwe vind jy self. Sodra die lyn groen is, wys die kaart hulle.',
  why: 'Hoekom speel ons soms die Evans?',
  whyShort: 'Hoekom?',
  whyTitle: 'Die pion wen vir ons druk',
  // the Captain's explanation in the "why" popup (one string per paragraph)
  whyText: [
    "Hierdie was my gunsteling manier om die Italiaanse opening bietjie interessant te maak, ou seun. Ons gee 'n pion weg, en wen 'n bietjie druk.",
    "Wat beteken dit? Wel, die pion is 'n ou stukkie aas, ja 'n lokaas, om 'n vissie te lok.",
    "En as hy die aas vat, dan kan ons lekker met hom planne beraam – want dan help ons allerhande planne om ons speelmaat die hele tyd onder druk te hou!",
    "Druk beteken: Swart moet elke skuif antwoord. Solank hy moet antwoord, het hy nie tyd om sy ekstra pion te geniet nie.",
    "Die stoommeter wys hoe groot die vraag was wat jou skuif vir Swart gevra het. Onder die naald sien jy hoeveel pionne jy as lokaas gegee het.",
    'Onthou: Die pion wen vir ons druk!',
  ],
  restart: 'Begin oor',
  restartConfirm: 'Seker? Kliek weer',
  zones: { gold: 'Volstoom', green: 'Goeie druk', amber: 'Die stoom lek effens', cold: 'Die stoomketel is koud' },
  // --- new on 28 Oct (drafts for Martin) ---
  // the deal, on the dial face
  ledgerBait: 'Lokaas',   // pawns (or pieces) given on the opening route: the gambit's own sacrifice
  ledgerLost: 'Verloor',  // anything else he is down
  ledgerCatch: 'Vangs',   // anything he is up
  ledgerEven: 'Gelyk',
  // under the zone name inside the dial: which of his moves the needle is measuring
  pressOf: (m: string) => `Druk van ${m}`,
  // round-end graph and moments
  graphPress: 'Druk van elke skuif',
  graphEval: 'Telling',
  momentCrack: (m: string, caught: boolean) => caught
    ? `Swart het onder druk gegly met ${m}, en jy het hom gevang.`
    : `Swart het onder druk gegly met ${m}, maar hy het weggekom.`,
  momentQuiet: (m: string) => `Stilste skuif: ${m}. Dit het Swart niks gevra nie.`,
  // "Wat het jou pion gekoop?" checkpoints
  checkTitle: 'Wat het jou pion gekoop?',
  checkHint: 'Kies een. Kyk mooi na die bord.',
  checkOptions: {
    tyd: 'Tyd: meer stukke in die spel',
    sentrum: 'Die sentrum',
    lyne: 'Oop lyne vir my stukke',
    koning: 'Swart se koning sit vas in die middel',
    niks: 'Niks meer nie',
  },
  checkWhy: {
    tyd: (n: number) => `Jy het ${n} stukke meer in die spel as Swart.`,
    sentrum: 'Jou pionne staan sterk in die middel.',
    lyne: (n: number) => `Jou stukke het ${n} skuiwe meer as Swart s'n.`,
    koning: 'Swart se koning het nog nie gerokeer nie, en kan ook nie dadelik nie.',
    niks: 'Swart het sy stukke uit, en jou druk is weg.',
  },
  // why the answer he chose is not (yet) true
  checkWhyNot: {
    tyd: (n: number) => n === 0 ? 'Julle het ewe veel stukke in die spel.' : `Swart het ${-n} stuk(ke) meer in die spel as jy.`,
    sentrum: 'Jy het nie twee pionne in die middel wat Swart nie ewenaar nie.',
    lyne: (n: number) => n > 0 ? `Jou stukke het net ${n} skuiwe meer as Swart s'n.` : "Swart se stukke het net soveel skuiwe soos joune, of meer.",
    koning: 'Swart se koning is veilig, of kan volgende skuif rokeer.',
    niks: 'Daar is nog iets op die bord. Kyk hieronder.',
  },
  checkAlso: 'Jou pion het ook gekoop:',
  checkContinue: 'Verder',
  checkTally: (right: number, n: number) => `Wat het jou pion gekoop? ${right} uit ${n} reg.`,
  // Die Spookskip: the ghost ship film (drafts for Martin)
  ghost: {
    title: 'Die Spookskip',
    button: 'Kyk na die Spookskip',
    intro: 'Kom kyk na die spookskip, matroos. Hy het ook die pion as lokaas gegooi, maar toe het hy niks met die tyd gedoen nie.',
    slowMove: "5.O-O. 'n Mooi, rustige skuif. Maar dit vra Swart niks.",
    castle: 'Swart rokeer. Sy koning is veilig, en hy hou nog steeds jou pion.',
    ready: 'Al Swart se stukke is uit. Die stoom is weg, en die pion is nog syne.',
    later: "'n Ruk later is al die stukke afgeruil. Tel die pionne aan die linkerkant: Swart het drie, die spookskip net twee.",
    walk: 'Kyk hoe loop die ekstra pion...',
    queen: 'Dame! Dis wat een pion werd is as jy nie die tyd gebruik nie. Die pion wen vir ons druk, maar net as ons die druk ook maak.',
    again: 'Weer',
  },
};
