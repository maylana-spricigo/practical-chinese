import { useCallback, useEffect, useState } from 'react';
import type { Length, Level } from '../../shared/types';

export interface StudySettings {
  cat: string; // 'all' or a Notion topic name
  level: Level;
  len: Length;
  help: { pinyin: boolean; extra: boolean; audio: boolean };
}

const KEY = 'pc.settings';
export const DEFAULTS: StudySettings = { cat: 'all', level: 'medium', len: 'short', help: { pinyin: true, extra: true, audio: false } };

export function loadSettings(): StudySettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULTS, ...v, help: { ...DEFAULTS.help, ...(v.help || {}) } };
  } catch { /* storage unavailable */ }
  return DEFAULTS;
}

export function saveSettings(s: StudySettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
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

export const LEVELS: { id: Level; name: string; desc: string; known: string }[] = [
  { id: 'easy', name: 'Easy', desc: 'Known only', known: '100%' },
  { id: 'medium', name: 'Medium', desc: 'Half & half', known: '50%' },
  { id: 'hard', name: 'Hard', desc: 'New only', known: '0%' },
];

export const LENGTHS: { id: Length; name: string; time: string; note: string }[] = [
  { id: 'short', name: 'Short', time: '~3 min', note: '10 cards per round' },
  { id: 'medium', name: 'Medium', time: '~6 min', note: '20 cards per round' },
  { id: 'long', name: 'Long', time: '~10 min', note: '30 cards per round' },
];
