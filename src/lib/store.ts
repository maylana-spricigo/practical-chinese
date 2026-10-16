import { useEffect, useState } from 'react';
import { ApiError, fetchAllSentences, fetchAllWords } from './api';
import { onDrained, pendingCount } from './sync';
import { read, write } from './storage';
import type { Sentence, Word } from '../../shared/types';

// A copy of your 词典 and 句子 kept on the phone. Screens open instantly from it
// and it refreshes from Notion in the background (when the app opens or comes
// back to the front). Answers update it right away, before they reach Notion.

type Kind = 'words' | 'sentences';
type Item<K extends Kind> = K extends 'words' ? Word : Sentence;
interface Entry { items: any[] | null; at: number; error: ApiError | null; loading: boolean }

const KEYS: Record<Kind, string> = { words: 'pc.cache.words', sentences: 'pc.cache.sentences' };
const FRESH_MS = 30_000;

function init(k: Kind): Entry {
  const c = read<{ items: any[]; at: number } | null>(KEYS[k], null);
  return { items: c?.items ?? null, at: c?.at ?? 0, error: null, loading: false };
}
const entries: Record<Kind, Entry> = { words: init('words'), sentences: init('sentences') };
const inflight: Partial<Record<Kind, Promise<void>>> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const persist = (k: Kind) => write(KEYS[k], { items: entries[k].items, at: entries[k].at });

export function refresh(kind: Kind, force = false): Promise<void> {
  const e = entries[kind];
  if (inflight[kind]) return inflight[kind]!;
  if (!force && e.items && Date.now() - e.at < FRESH_MS) return Promise.resolve();
  // Don't overwrite answers that haven't reached Notion yet: wait for the queue first.
  if (kind === 'words' && e.items && pendingCount() > 0) { onDrained(() => void refresh(kind, true)); return Promise.resolve(); }
  e.loading = true; e.error = null; emit();
  const p = (kind === 'words' ? fetchAllWords() : fetchAllSentences())
    .then((items) => { e.items = items; e.at = Date.now(); persist(kind); })
    .catch((err) => { e.error = err instanceof ApiError ? err : new ApiError(0, String(err)); })
    .finally(() => { e.loading = false; delete inflight[kind]; emit(); });
  inflight[kind] = p;
  return p;
}

export function useStore<K extends Kind>(kind: K) {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    subs.add(f);
    void refresh(kind);
    return () => { subs.delete(f); };
  }, [kind]);
  const e = entries[kind];
  const authErr = e.error?.status === 401 ? e.error : null;
  return {
    items: e.items as Item<K>[] | null,
    /** Only an error when there is nothing to show (or the app key is wrong). */
    error: e.items ? authErr : e.error,
    loading: !e.items && !e.error,
    refreshing: e.loading,
    retry: () => refresh(kind, true),
  };
}

export function getWords(): Word[] { return (entries.words.items as Word[]) ?? []; }

export function patchWord(id: string, patch: Partial<Word>) {
  const e = entries.words;
  if (!e.items) return;
  e.items = e.items.map((w: Word) => (w.id === id ? { ...w, ...patch } : w));
  persist('words'); emit();
}

export function forgetCache() {
  for (const k of ['words', 'sentences'] as Kind[]) { entries[k] = { items: null, at: 0, error: null, loading: false }; write(KEYS[k], null); }
  emit();
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { void refresh('words'); void refresh('sentences'); }
  });
}
