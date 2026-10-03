import raw from '../data/evans_canon_app.json';

export interface Line {
  id: string;
  name: string;
  label: string;
  sub: string;
  movesSan: string[];
  movesNumbered: string[];
  plies: number;
  endKey: string;
  parent: string | null;
  frondPlies: number;
  famous: boolean;
  reef: boolean;
  games: number;
}

export interface CanonMove { uci: string; san: string; games: number; named: boolean; to: string }

export interface CanonNode {
  fen: string;
  ply: number;
  toMove: 'w' | 'b';
  eval: number;
  material: number;
  debt: number;
  steam: number;
  best: string;
  top2: { san: string; uci: string; cp: number }[] | null;
  endOf: string[];
  reach: string[];
  toward: Record<string, string>;
  moves: CanonMove[];
  chartEnd: boolean;
}

export interface Canon {
  meta: { entry: string[]; entryNumbered: string[]; rootKey: string; capPly: number };
  lines: Line[];
  nodes: Record<string, CanonNode>;
}

export const canon = raw as unknown as Canon;
export const LINES: Record<string, Line> = Object.fromEntries(canon.lines.map(l => [l.id, l]));
export const ROOT_LINE = canon.lines.find(l => l.parent === null)!.id;
