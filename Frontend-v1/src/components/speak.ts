const speak = (text: string, onEnd?: () => void) => {
  if (!window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

export default speak;


export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};