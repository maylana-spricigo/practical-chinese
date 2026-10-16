import { useCallback, useEffect, useState } from 'react';
import type { Game, Length, Level } from '../../shared/types';
import { read, write } from './storage';

/** Study settings: the starting point for every game. */
export interface StudySettings {
  cat: string; // 'all' or a Notion topic name
  level: Level;
  len: Length;
}
export type Round = StudySettings;

const KEY = 'pc.settings';
export const DEFAULTS: StudySettings = { cat: 'all', level: 'medium', len: 'short' };

export function loadSettings(): StudySettings {
  const v = read<Partial<StudySettings> | null>(KEY, null);
  return { cat: v?.cat ?? DEFAULTS.cat, level: v?.level ?? DEFAULTS.level, len: v?.len ?? DEFAULTS.len };
}

export function saveSettings(s: StudySettings) {
  write(KEY, s);
  window.dispatchEvent(new Event('pc-settings'));
}

export function useSettings(): [StudySettings, (s: StudySettings) => void] {
  const [s, set] = useState(loadSettings);
  useEffect(() => {
    const on = () => set(loadSettings());
    window.addEventListener('pc-settings', on);
    return () => window.removeEventListener('pc-settings', on);
  }, []);
  const save = useCallback((next: StudySettings) => { saveSettings(next); set(next); }, []);
  return [s, save];
}

/** Each game remembers its own round (topic, difficulty, length); it starts from Study settings. */
export function loadRound(game: Game): Round {
  const v = read<Partial<Round> | null>(`pc.round.${game}`, null);
  return v ? { ...loadSettings(), ...v } : loadSettings();
}
export function saveRound(game: Game, r: Round) { write(`pc.round.${game}`, r); }
export function resetRound(game: Game): Round { write(`pc.round.${game}`, null); return loadSettings(); }

/** In-game options (pinyin, audio…), remembered per game. */
type Widen<T> = { [K in keyof T]: T[K] extends boolean ? boolean : T[K] };
export function useGameOptions<T extends Record<string, boolean | string>>(game: Game, defaults: T): [Widen<T>, (patch: Partial<Widen<T>>) => void] {
  const [o, setO] = useState<Widen<T>>(() => ({ ...defaults, ...read<Partial<Widen<T>>>(`pc.opt.${game}`, {}) }) as Widen<T>);
  const set = useCallback((patch: Partial<Widen<T>>) => setO((x) => { const n = { ...x, ...patch }; write(`pc.opt.${game}`, n); return n; }), [game]);
  return [o, set];
}

export const LEVELS: { id: Level; name: string; desc: string; known: string }[] = [
  { id: 'easy', name: 'Easy', desc: 'Known only', known: '100%' },
  { id: 'medium', name: 'Medium', desc: 'Half & half', known: '50%' },
  { id: 'hard', name: 'Hard', desc: 'New only', known: '0%' },
];

export const LENGTHS: { id: Length; name: string; time: string; note: string }[] = [
  { id: 'short', name: 'Short', time: '~3 min', note: '10 cards · 4 pairs · 5 sentences · 5 questions' },
  { id: 'medium', name: 'Medium', time: '~6 min', note: '20 cards · 6 pairs · 10 sentences · 10 questions' },
  { id: 'long', name: 'Long', time: '~10 min', note: '30 cards · 8 pairs · 15 sentences · 15 questions' },
];
