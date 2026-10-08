import { useEffect, useState } from 'react';
import { ApiError, postReview } from './api';
import { read, write } from './storage';

// Flashcard answers are saved one by one through a small queue that survives
// going offline or closing the app, and is retried when the connection returns.

export interface QueueItem { id: string; knew: boolean; today: string }
export type SyncStatus = 'idle' | 'saving' | 'failed' | 'auth';

const KEY = 'pc.queue';
let queue: QueueItem[] = read<QueueItem[]>(KEY, []);
let status: SyncStatus = 'idle';
let running = false;
const subs = new Set<() => void>();

function emit() { subs.forEach((f) => f()); }
function persist() { write(KEY, queue); }

export function enqueue(item: QueueItem) {
  queue.push(item);
  persist();
  void flush();
}

export async function flush() {
  if (running || queue.length === 0) { if (!queue.length && status === 'saving') { status = 'idle'; emit(); } return; }
  running = true;
  status = 'saving';
  emit();
  while (queue.length) {
    try {
      await postReview(queue[0]);
      queue.shift();
      persist();
      emit();
    } catch (e) {
      const code = e instanceof ApiError ? e.status : 0;
      if (code === 400 || code === 404) { queue.shift(); persist(); continue; } // word deleted or bad data: drop it
      status = code === 401 ? 'auth' : 'failed';
      running = false;
      emit();
      return;
    }
  }
  status = 'idle';
  running = false;
  emit();
}

export function useSync() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return { status, pending: queue.length, retry: () => { status = 'idle'; void flush(); } };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
  setTimeout(() => void flush(), 1000);
}
