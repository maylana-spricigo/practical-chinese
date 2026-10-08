import { pinyin } from 'pinyin-pro';

/** Pinyin for a tile ("什么" → "shénme"); empty for punctuation. */
export function tilePinyin(t: string): string {
  if (!/[㐀-鿿]/.test(t)) return '';
  let p = pinyin(t, { type: 'array' }).join('');
  if (t.length > 1 && t.endsWith('儿')) p = p.replace(/ér$/, 'r'); // erhua: 哪儿 → nǎr
  return p;
}
