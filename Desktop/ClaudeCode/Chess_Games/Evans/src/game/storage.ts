// Progress in localStorage under one key (CLAUDE.md section 13). Every access is guarded.
import type { LineState } from './targets';

export interface LineRecord {
  state: LineState; played: number; green: number; gold: number;
  lastMissed?: { move: string; date: string };
}
export interface RoundRecord {
  date: string; target: string; conquered: string[]; gold: boolean; score: number; finalEval: number;
}
export interface Store {
  profile: { name: string };
  lines: Record<string, LineRecord>;
  rounds: RoundRecord[];
  recentTargets: string[];
  settings: { bishopLights: boolean };
}

const KEY = 'stoomdruk.v1';

export function emptyStore(): Store {
  return { profile: { name: '' }, lines: {}, rounds: [], recentTargets: [], settings: { bishopLights: true } };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw);
    const e = emptyStore();
    return { ...e, ...s, settings: { ...e.settings, ...(s.settings || {}) }, lines: s.lines || {} };
  } catch {
    return emptyStore();
  }
}

export function saveStore(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable: play on */ }
}

export function lineRec(s: Store, id: string): LineRecord {
  return s.lines[id] ?? { state: 'grey', played: 0, green: 0, gold: 0 };
}

export const stateOfFn = (s: Store) => (id: string): LineState => lineRec(s, id).state;

const RANK: Record<LineState, number> = { grey: 0, green: 1, gold: 2 };

/** Apply a finished round. States never go down. Returns ids whose state rose. */
export function applyRound(s: Store, r: RoundRecord, targets: string[], missed: Record<string, string>): string[] {
  const today = r.date.slice(0, 10);
  const changed: string[] = [];
  for (const id of targets) {
    const l = lineRec(s, id);
    s.lines[id] = { ...l, played: l.played + 1 };
  }
  for (const [id, move] of Object.entries(missed)) {
    s.lines[id] = { ...lineRec(s, id), lastMissed: { move, date: today } };
  }
  for (const id of r.conquered) {
    const l = lineRec(s, id);
    const ns: LineState = r.gold ? 'gold' : 'green';
    const next: LineRecord = { ...l, green: l.green + 1, gold: l.gold + (r.gold ? 1 : 0) };
    if (RANK[ns] > RANK[l.state]) { next.state = ns; changed.push(id); }
    s.lines[id] = next;
  }
  s.rounds = [...s.rounds, r].slice(-100);
  s.recentTargets = [...s.recentTargets, r.target].slice(-10);
  saveStore(s);
  return changed;
}
