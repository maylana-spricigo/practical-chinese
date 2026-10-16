import { pinyin } from 'pinyin-pro';

const HAN = /[㐀-鿿]/;

/** Pinyin for a tile on its own ("什么" → "shénme"); empty for punctuation. */
export function tilePinyin(t: string): string {
  if (!HAN.test(t)) return '';
  let p = pinyin(t, { type: 'array' }).join('');
  if (t.length > 1 && t.endsWith('儿')) p = p.replace(/ér$/, 'r'); // erhua: 哪儿 → nǎr
  return p;
}

/**
 * Pinyin for each tile read in the context of the whole sentence, so words with
 * more than one reading come out right (我吃了饭 → 了 le, not liǎo).
 */
export function tilesPinyin(sentence: string, tokens: string[]): string[] {
  const text = tokens.join('');
  const syl = pinyin(text, { type: 'array', toneType: 'symbol' });
  // pinyin-pro gives one entry per character for Chinese text.
  if (syl.length !== text.length) return tokens.map(tilePinyin);
  let at = 0;
  return tokens.map((t) => {
    const part = syl.slice(at, at + t.length);
    at += t.length;
    if (!HAN.test(t)) return '';
    let p = part.join('');
    if (t.length > 1 && t.endsWith('儿')) p = p.replace(/ér$/, 'r');
    return p;
  });
}
