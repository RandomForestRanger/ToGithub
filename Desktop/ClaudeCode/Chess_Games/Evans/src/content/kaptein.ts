// Every Afrikaans string the Captain says (CLAUDE.md section 12).
// ROUND_START, RETARGET and MISSED are Martin's own wording — keep them exactly.
// Use double quotes for any string containing 'n (Afrikaans article).

export const K = {
  ROUND_START: ['Hierdie rondte speel ons die "{line}".'],
  RETARGET: ['Geen probleem, jy het sopas oorgeskuif na die "{line}".'],
  MISSED: ['Om die "{line}" lyn te ontsluit moes jy hierso {move} gespeel het.'],

  ROUND_FLAVOUR: ['Die gety is reg, matroos. Gooi die lokaas!', 'Stoom op! Die kaart lê oop.'],
  ENTRY_WRONG: ['Ons vaar na die Evans: speel {move}.'],
  BAIT: ['Die lokaas is in die water.'],
  BLACK_ACCEPTS: ['Die vis byt!'],
  BLACK_DECLINES: ['Die vis kyk en swem verby.'],
  COUNTERGAMBIT: ["Die vis byt terug! 'n Teengambiet."],
  GREEDY: ['Die gulsige vis sluk die hoek, lyn en sinker!'],
  SPITS_HOOK: ['Die vis spoeg die hoek uit. Hy wil die pion teruggee.'],
  LINE_MOVE: ['Da iawn! Reg op koers.', 'Presies volgens die kaart.', 'Bendigedig!', 'Die kompas wys reg.'],
  LINE_CONQUERED: ['Die "{line}" is joune! Die blaas word groen.'],
  CHAIN: ['Ons hou aan: volgende vaar ons na die "{line}".'],
  RETARGET_NOTE: ['(Vir die "{line}" moes jy hierso {move} gespeel het.)'],
  TOP_TWO: ['Sterk skuif! ', "Ardderchog, dis 'n topskuif! "],
  OFF_CHART: ['Ons is van die kaart af. Van nou af stuur jy self.'],
  CHART_END: ['Die kaart is klaar. Van hier af is dit oop see.'],
  STEAM_GOLD: ['Volstoom! Die ketel sing.'],
  STEAM_GREEN: ['Goeie druk. Hou die vuur aan die brand.'],
  STEAM_AMBER: ['Die stoom lek! Wat het jou pion gekoop?'],
  STEAM_COLD: ['Die ketel is koud. Kry die vuur weer aan.'],
  DEBT_PAID: ['Skuld betaal! Nou is dit wins.'],
  POINTS_4: ['Ardderchog!', 'Netjies.'],
  POINTS_3: ["Goed. Daar was 'n effens vinniger koers."],
  POINTS_2: ['Die enjin hik.'],
  POINTS_1: ["Oeps. Daar's 'n gat in die romp."],
  BISHOP_STUURBOORD: ['Stuurboord se lig skyn op f7!'],
  BISHOP_BAKBOORD: ['Bakboord sluit die deur. Die koning kan nie kasteel nie!'],
  END_GOLD: ['Goud! Jy het die pion belê en die wins ingebring. Hwyl fawr!'],
  END_GREEN: ['Groen! Die lyn is joune. Volgende keer: maak die stoom wins.'],
  END_MISSED: ['Die lyn het weggeglip. Die kaart onthou wat jy moes speel.'],
  END_WHITE_MATES: ['Skaakmat! Die vangs van die dag!'],
  END_WHITE_MATED: ['Ons het gesink. Maar elke kaptein word een keer nat.'],
  END_DRAW: ['Remise. Die see is kalm vandag.'],
} as const;

export type KKey = keyof typeof K;

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
  begin: 'Begin rondte',
  throwBait: 'Gooi die lokaas',
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
  zones: { gold: 'Volstoom', green: 'Goeie druk', amber: 'Die stoom lek', cold: 'Die ketel is koud' },
};
