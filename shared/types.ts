import type { Status } from './srs';

export interface Word {
  id: string;
  hz: string;
  py: string;
  en: string;
  pos: string;
  mw: string;
  ex: string;
  exPy: string;
  exEn: string;
  topics: string[];
  status: Status;
  box: number | null;
  nextReview: string | null;
  timesKnown: number;
  timesForgot: number;
}

export type Level = 'easy' | 'medium' | 'hard';
export type Length = 'short' | 'medium' | 'long';

export interface WordsResponse { words: Word[]; available: number }

export interface ReviewRequest {
  today: string;
  id: string;
  knew: boolean;
}

export interface Stats {
  total: number;
  due: number;
  byStatus: Record<Status, number>;
}

/** The 16 topics in Notion (multi-select "Topic"), most common first. */
export const TOPICS: { name: string; zh: string }[] = [
  { name: 'Food', zh: '食物' },
  { name: 'Daily Life', zh: '日常' },
  { name: 'Greetings', zh: '问候' },
  { name: 'Family', zh: '家人' },
  { name: 'Numbers', zh: '数字' },
  { name: 'Time', zh: '时间' },
  { name: 'Places', zh: '地方' },
  { name: 'Work', zh: '工作' },
  { name: 'People', zh: '人物' },
  { name: 'School', zh: '学校' },
  { name: 'Health', zh: '健康' },
  { name: 'Money', zh: '钱' },
  { name: 'Nature', zh: '自然' },
  { name: 'Countries', zh: '国家' },
  { name: 'Descriptions', zh: '描述' },
  { name: 'Grammar', zh: '语法' },
];

export const ROUND_SIZE: Record<Length, number> = { short: 10, medium: 20, long: 30 };
