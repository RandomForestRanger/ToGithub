// Every Afrikaans string the Captain says (CLAUDE.md section 12).
// ROUND_START, RETARGET and MISSED are Martin's own wording — keep them exactly.
// Use double quotes for any string containing 'n (Afrikaans article).

export const K = {
  ROUND_START: ['Hierdie rondte speel ons die "{line}".'],
  RETARGET: ['Geen probleem, jy het sopas oorgeskuif na die "{line}".'],
  MISSED: ['Om die "{line}" lyn te ontsluit moes jy hierso {move} gespeel het.'],

  ROUND_FLAVOUR: ['Die gety is reg, goeie matroos. Gooi die lokaas!', 'Stoom op!'],
  ENTRY_WRONG: ['Ons vaar na die Evans spel: speel liwer {move}.'],
  BAIT: ['Die lokaas is in die water.'],
  BLACK_ACCEPTS: ['Oho! Die vis byt!'],
  BLACK_DECLINES: ['Ga. Die vis het ons aas die gevat nie. Goed dan, nuwe plan.'],
  COUNTERGAMBIT: ["Die vis wil one byt. Ho ho ho! 'n Teengambiet - nou gaan ons hom kry."],
  GREEDY: ['Die gulsige vis sluk die hele hoek in! Pasop, vis!'],
  SPITS_HOOK: ['Die vis spoeg die hoek uit. Ek reken hy wil die pion vir ons teruggee.'],
  LINE_MOVE: ['Da iawn! Reg op koers.', 'Presies volgens die kaart, mooi so!', 'Bendigedig! Mooi man.', 'Die kompas wys reg - goeie skuif!'],
  LINE_CONQUERED: ['Die "{line}" is joune! Hou aan dink.'],
  CHAIN: ['Ja! Ons hou nog aan: volgende vaar ons na die "{line}".'],
  RETARGET_NOTE: ['(Vir die "{line}" moes jy hierso {move} gespeel het.)'],
  TOP_TWO: ['Sterk skuif daarso! ', "Ardderchog, dis 'n topskuif! "],
  OFF_CHART: ['Hmm. Ons is effens van die kaart af. Van nou af stuur jy self.'],
  CHART_END: ['Afgehandel! Hierdie lyn eindig hierso, van hier af is dit mooi oop see.'],
  STEAM_GOLD: ['Volstoom! Volstoom! The fluitjie blaas van al die stoom.'],
  STEAM_GREEN: ['Goeie druk. Hou die vuur aan die brand.'],
  STEAM_AMBER: ['Die stoom lek! Onthou, ons gee die pion weg sodat ons DRUK kan plaas.?'],
  // on the chart, when the line's own theory takes the needle below zero (once per round)
  STEAM_THEORY: ['Ja, dit is nou so – om by die "{line}" uit te kom, moet ons \'n paar vreemde skuiwe maak.'],
  STEAM_COLD: ['Die ketel is nou koud. Kom, kry vir ons die vuur weer aan.'],
  DEBT_PAID: ['Skuld betaal! Als reg, ons speel voort.'],
  POINTS_4: ['Ardderchog! Mooi man.', 'Netjies.'],
  POINTS_3: ["Goed. Daar was miskien 'n beter manier?"],
  POINTS_2: ['Hmm - wat is jou plan? Wys my.'],
  POINTS_1: ["Oeps. Nie jou beste opsie nie."],
  BISHOP_STUURBOORD: ['Stuurboord se lig skyn op f7!'],
  BISHOP_BAKBOORD: ['Bakboord sluit die deur. Die koning kan nie kasteeleer nie!'],
  END_GOLD: ['Goud! Jy het die pion opgegee en \'n lekker wins ingebring. Hwyl fawr!'],
  END_GREEN: ['Groen! Die lyn is joune. Volgende keer: maak die lyn sommer goud.'],
  END_MISSED: ['Die vissie het iewers weggeglip. Toemaar Matroos, daar is altyd nog \'n kans.'],
  END_WHITE_MATES: ['Skaakmat! Die vangs van die dag! Jy\'s \'n goeie seeman.'],
  END_WHITE_MATED: ['Ons het gesink. Maar elke kaptein word \'n paar maal nat!'],
  END_DRAW: ['Gelykop! Nou toe, die see is kalm vandag.'],
} as const;

export type KKey = keyof typeof K;

/** The Captain's face for each kind of line (anything not listed is 'steady'). */
export type Mood = 'steady' | 'pleased' | 'worried' | 'overjoyed';
export const MOOD: Partial<Record<KKey, Mood>> = {
  BLACK_ACCEPTS: 'pleased', LINE_MOVE: 'pleased', CHAIN: 'pleased', TOP_TWO: 'pleased', RETARGET: 'pleased',
  STEAM_GREEN: 'pleased', DEBT_PAID: 'pleased', POINTS_4: 'pleased',
  BISHOP_STUURBOORD: 'pleased', BISHOP_BAKBOORD: 'pleased', END_GREEN: 'pleased',
  LINE_CONQUERED: 'overjoyed', SPITS_HOOK: 'overjoyed', GREEDY: 'overjoyed', STEAM_GOLD: 'overjoyed',
  END_GOLD: 'overjoyed', END_WHITE_MATES: 'overjoyed',
  ENTRY_WRONG: 'worried', COUNTERGAMBIT: 'worried', MISSED: 'worried', STEAM_AMBER: 'worried', STEAM_COLD: 'worried',
  POINTS_2: 'worried', POINTS_1: 'worried', END_MISSED: 'worried', END_WHITE_MATED: 'worried',
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
  momentDrop: (m: string, d: number) => `Grootste stoomverlies: ${m} (−${d.toFixed(1)})`,
  momentBest: (m: string) => `Beste skuif in oop see: ${m}`,
  lights: 'Skeepsligte',
  theoryDip: "Op pad na hierdie lyn sak die stoommeter onder nul. Dis die prys van die lyn, nie jou fout nie.",
  restart: 'Begin oor',
  restartConfirm: 'Seker? Kliek weer',
  zones: { gold: 'Volstoom', green: 'Goeie druk', amber: 'Die stoom lek effens', cold: 'Die stoomketel is koud' },
};
