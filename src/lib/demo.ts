import type { Word } from '../../shared/types';

// Sample words for demo mode (VITE_DEMO=1 or ?demo in the URL). Nothing is sent to Notion.
const W = (id: string, hz: string, py: string, en: string, topics: string[], status: Word['status'], box: number | null, nextReview: string | null, pos = 'noun', mw = '', ex = '', exPy = '', exEn = ''): Word =>
  ({ id, hz, py, en, pos, mw, ex, exPy, exEn, topics, status, box, nextReview, timesKnown: 0, timesForgot: 0 });

export const DEMO_WORDS: Word[] = [
  W('d1', '茶', 'chá', 'tea', ['Food'], 'Learning', 3, '2020-01-01', 'noun', '杯 bēi', '我喜欢喝茶。', 'Wǒ xǐhuan hē chá.', 'I like drinking tea.'),
  W('d2', '饺子', 'jiǎozi', 'dumplings', ['Food'], 'New', 0, null, 'noun', '个 gè', '我们一起包饺子吧！', 'Wǒmen yìqǐ bāo jiǎozi ba!', 'Let’s make dumplings together!'),
  W('d3', '喝', 'hē', 'to drink', ['Food'], 'Learning', 2, '2020-01-01', 'verb', '', '你想喝什么？', 'Nǐ xiǎng hē shénme?', 'What would you like to drink?'),
  W('d4', '米饭', 'mǐfàn', 'cooked rice', ['Food'], 'New', 0, null, 'noun', '碗 wǎn', '我要一碗米饭。', 'Wǒ yào yì wǎn mǐfàn.', 'I’d like a bowl of rice.'),
  W('d5', '水果', 'shuǐguǒ', 'fruit', ['Food'], 'Known', 4, '2020-01-01', 'noun', '种 zhǒng', '多吃水果对身体好。', 'Duō chī shuǐguǒ duì shēntǐ hǎo.', 'Eating more fruit is good for you.'),
  W('d6', '好吃', 'hǎochī', 'delicious', ['Food'], 'New', 0, null, 'adjective', '', '这家的面条很好吃。', 'Zhè jiā de miàntiáo hěn hǎochī.', 'The noodles here are delicious.'),
  W('d7', '你好', 'nǐ hǎo', 'hello', ['Greetings'], 'Known', 5, '2099-01-01', 'set expression', '', '你好，我叫小明。', 'Nǐ hǎo, wǒ jiào Xiǎomíng.', 'Hello, my name is Xiaoming.'),
  W('d8', '妈妈', 'māma', 'mum', ['Family'], 'Learning', 1, '2020-01-01', 'noun', '', '我妈妈是老师。', 'Wǒ māma shì lǎoshī.', 'My mum is a teacher.'),
  W('d9', '早上', 'zǎoshang', 'morning', ['Time'], 'New', 0, null, 'noun', '', '我早上喝咖啡。', 'Wǒ zǎoshang hē kāfēi.', 'I drink coffee in the morning.'),
  W('d10', '超市', 'chāoshì', 'supermarket', ['Places'], 'New', 0, null, 'noun', '家 jiā', '超市在哪儿？', 'Chāoshì zài nǎr?', 'Where is the supermarket?'),
];
