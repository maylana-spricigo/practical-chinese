import { describe, expect, it } from 'vitest';
import { computeStats, lessonList, pickPartners, pickSentences, pickWords } from './rounds';
import type { Sentence, Word } from './types';
import { tilesPinyin } from '../src/lib/py';

const w = (id: string, hz: string, status: Word['status'], partners: string[] = [], topics = ['Food']): Word =>
  ({ id, hz, py: hz, en: hz, pos: '', mw: '', ex: '', exPy: '', exEn: '', topics, status, box: status === 'New' ? 0 : 2, nextReview: '2020-01-01', timesKnown: 0, timesForgot: 0, partners });

const WORDS = [
  w('he', '喝', 'Learning', ['cha', 'shui']), w('cha', '茶', 'Learning'), w('shui', '水', 'New'),
  w('chi', '吃', 'Learning', ['fan']), w('fan', '饭', 'New'), w('kan', '看', 'Known', ['dy']), w('dy', '电影', 'New', [], ['Daily Life']),
];

describe('rounds', () => {
  it('picks partners without two right answers in one round', () => {
    for (let n = 0; n < 50; n++) {
      const { pairs } = pickPartners(WORDS, { topic: 'all', level: 'medium', count: 8 });
      const lefts = pairs.map((p) => p.a.id);
      expect(new Set(lefts).size).toBe(lefts.length);
      expect(lefts.filter((x) => x === 'he').length).toBeLessThanOrEqual(1);
      expect(pairs.length).toBe(3); // 喝 once (茶 or 水), 吃饭, 看电影
    }
  });
  it('filters partners by topic on either word', () => {
    const { pairs } = pickPartners(WORDS, { topic: 'Daily Life', level: 'medium', count: 8 });
    expect(pairs.map((p) => p.a.hz + p.b.hz)).toEqual(['看电影']);
  });
  it('Easy word rounds only use studied words, due first', () => {
    const r = pickWords(WORDS, { topic: 'all', level: 'easy', count: 10, today: '2026-10-16' });
    expect(r.words.every((x) => x.status !== 'New')).toBe(true);
  });
  it('links Ask questions to their answers from the full list', () => {
    const S = (id: string, type: Sentence['type'], answerIds: string[] = []): Sentence => ({ id, hz: id, py: '', en: '', type, tokens: ['a', 'b'], distractors: [], focus: '', grammar: '', topics: ['Food'], status: 'New', answerIds });
    const r = pickSentences([S('q', 'Question', ['s']), S('s', 'Statement')], { game: 'ask', topic: 'all', level: 'medium', count: 5 });
    expect(r.sentences).toHaveLength(1);
    expect(r.sentences[0].answer?.id).toBe('s');
  });
  it('counts stats locally', () => {
    expect(computeStats(WORDS, '2026-10-16').byStatus).toEqual({ New: 3, Learning: 3, Known: 1 });
  });
});

describe('pinyin in context', () => {
  it('reads 了 as le inside a sentence', () => {
    expect(tilesPinyin('我吃了饭。', ['我', '吃', '了', '饭'])).toEqual(['wǒ', 'chī', 'le', 'fàn']);
  });
  it('keeps erhua and multi-character tiles', () => {
    expect(tilesPinyin('你去哪儿？', ['你', '去', '哪儿'])).toEqual(['nǐ', 'qù', 'nǎr']);
  });
});

describe('lessons', () => {
  it('keeps only words from the picked lessons, in course order', () => {
    const L = (id: string, lessons: string[]) => ({ ...w(id, id, 'Learning'), lessons });
    const ws = [L('a', ['S6']), L('b', ['S7']), L('c', ['S5']), L('d', ['I3', 'S7'])];
    const r = pickWords(ws, { topic: 'all', lessons: ['S6', 'S7'], level: 'easy', count: 10, today: '2026-10-18' });
    expect(r.words.map((x) => x.id).sort()).toEqual(['a', 'b', 'd']);
    expect(lessonList(ws)).toEqual(['I3', 'S5', 'S6', 'S7']);
  });
});
