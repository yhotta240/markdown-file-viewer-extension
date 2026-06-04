/** Web Speech API (SpeechSynthesis) を使ったローカル完結の読み上げモジュール */
export type TTSOptions = {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
};

let _currentUtterance: SpeechSynthesisUtterance | null = null;
type TtsState = "idle" | "speaking" | "paused";
let _state: TtsState = "idle";
// 一時停止・再開のために読み上げ情報を保存
let _savedText = "";
let _savedOpts: TTSOptions = {};
let _savedOnEnd: (() => void) | undefined;
// cancel() 前にリスナーを外すために参照を保持
let _handleEnd: (() => void) | null = null;
// boundary イベントで更新する直近の文字インデックス
let _lastCharIndex = 0;
// ハイライト用 boundary コールバック
let _savedOnBoundary: ((charIndex: number, charLength: number) => void) | undefined;
// pause/resume をまたいだ累積文字オフセット（ハイライトの絶対位置計算に使用）
let _charOffset = 0;

export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSupported()) return resolve([]);
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);
    // ブラウザによっては非同期でボイス一覧が取得される
    const handler = () => {
      const v = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(v);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // タイムアウトフォールバック
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}

// 内部発話関数: _charOffset をリセットせずに発話を開始する（resume から使用）
function _speakUtterance(
  text: string,
  opts: TTSOptions,
  onEnd?: () => void,
  onBoundary?: (charIndex: number, charLength: number) => void,
): void {
  _savedText = text;
  _savedOpts = opts;
  _savedOnEnd = onEnd;
  _savedOnBoundary = onBoundary;
  _lastCharIndex = 0;

  const ut = new SpeechSynthesisUtterance(text);
  if (opts.voice) ut.voice = opts.voice;
  if (typeof opts.rate === "number") ut.rate = opts.rate;
  if (typeof opts.pitch === "number") ut.pitch = opts.pitch;
  if (typeof opts.volume === "number") ut.volume = opts.volume;

  // 読み上げ位置を随時記録し、絶対位置でハイライトコールバックを呼ぶ
  ut.addEventListener("boundary", (e: SpeechSynthesisEvent) => {
    _lastCharIndex = e.charIndex;
    onBoundary?.(_charOffset + e.charIndex, e.charLength);
  });

  const handleEnd = () => {
    _handleEnd = null;
    _state = "idle";
    if (onEnd) onEnd();
  };
  _handleEnd = handleEnd;
  ut.addEventListener("end", handleEnd);
  ut.addEventListener("error", handleEnd);

  _currentUtterance = ut;
  _state = "speaking";
  window.speechSynthesis.speak(ut);
}

export function speak(
  text: string,
  opts: TTSOptions = {},
  onEnd?: () => void,
  onBoundary?: (charIndex: number, charLength: number) => void,
): void {
  if (!isSupported()) {
    console.warn("TTS: SpeechSynthesis not supported in this browser");
    return;
  }
  stop(); // 既存の発話をキャンセルし _charOffset をリセット
  _speakUtterance(text, opts, onEnd, onBoundary);
}

export function pause(): void {
  if (!isSupported() || _state !== "speaking") return;
  // cancel() で end イベントが発火しないようにリスナーを先に外す
  if (_currentUtterance && _handleEnd) {
    _currentUtterance.removeEventListener("end", _handleEnd);
    _currentUtterance.removeEventListener("error", _handleEnd);
    _handleEnd = null;
  }
  // 再開位置の絶対オフセットを更新し、残りテキストを保存
  _charOffset += _lastCharIndex;
  _savedText = _savedText.slice(_lastCharIndex);
  _lastCharIndex = 0;
  _state = "paused";
  window.speechSynthesis.cancel();
  _currentUtterance = null;
}

export function resume(): void {
  if (!isSupported() || _state !== "paused") return;
  // _charOffset は pause() で更新済みのため、そのまま _speakUtterance を呼ぶ
  _speakUtterance(_savedText, _savedOpts, _savedOnEnd, _savedOnBoundary);
}

export function stop(): void {
  if (!isSupported()) return;
  // cancel() で end イベントが発火しないようにリスナーを先に外す
  if (_currentUtterance && _handleEnd) {
    _currentUtterance.removeEventListener("end", _handleEnd);
    _currentUtterance.removeEventListener("error", _handleEnd);
    _handleEnd = null;
  }
  _state = "idle";
  _charOffset = 0;
  window.speechSynthesis.cancel();
  _currentUtterance = null;
}

export function isSpeaking(): boolean {
  return _state === "speaking";
}

export function isPaused(): boolean {
  return _state === "paused";
}
