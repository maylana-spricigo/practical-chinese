let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  try {
    const vs = window.speechSynthesis.getVoices();
    voice = vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
  } catch { voice = null; }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text: string, rate = 0.8) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* no speech on this device */ }
}
