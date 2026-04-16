/**
 * ============================================================
 * TINA MINIGAME — Centralized TTS Utility
 * ============================================================
 * Shared helper for Text-to-Speech across the entire app.
 * - Auto-detects Vietnamese vs English per-text.
 * - Prefers a female voice for Vietnamese.
 */

const VI_REGEX = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

type LangCode = 'vi-VN' | 'en-US';

interface SpeakOptions {
  forceLang?: LangCode;
  rate?: number;
  clean?: boolean;
}

let _cachedViVoice: SpeechSynthesisVoice | null | undefined = undefined; // undefined = not yet searched

/**
 * Detect language from text content.
 * @returns {'vi-VN' | 'en-US'}
 */
export function detectLang(text: string): LangCode {
  return VI_REGEX.test(text) ? 'vi-VN' : 'en-US';
}

/**
 * Find a female Vietnamese voice from the browser's available voices.
 * Caches the result after first lookup.
 */
function getVietnameseFemaleVoice(): SpeechSynthesisVoice | null {
  if (_cachedViVoice !== undefined) return _cachedViVoice;

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    _cachedViVoice = null;
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    // Voices not loaded yet — will retry next call
    return null;
  }

  // Priority 1: Female Vietnamese voice
  const femaleVi = voices.find(v =>
    v.lang.startsWith('vi') &&
    (/female/i.test(v.name) || /nữ/i.test(v.name) || /woman/i.test(v.name))
  );
  if (femaleVi) {
    _cachedViVoice = femaleVi;
    return femaleVi;
  }

  // Priority 2: Any Vietnamese voice that is NOT explicitly male
  const anyViNotMale = voices.find(v =>
    v.lang.startsWith('vi') &&
    !(/(male|nam)\b/i.test(v.name))
  );
  if (anyViNotMale) {
    _cachedViVoice = anyViNotMale;
    return anyViNotMale;
  }

  // Priority 3: Any Vietnamese voice at all
  const anyVi = voices.find(v => v.lang.startsWith('vi'));
  _cachedViVoice = anyVi || null;
  return _cachedViVoice;
}

/**
 * Speak text with automatic language detection.
 * Vietnamese text will use a female voice when available.
 *
 * @param {string} text - Text to speak
 * @param {object} [options]
 * @param {string} [options.forceLang] - Force a specific lang ('vi-VN' or 'en-US')
 * @param {number} [options.rate] - Speech rate (default 1.0)
 * @param {boolean} [options.clean] - If true, clean blanks/underscores (default false)
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

  const { forceLang, rate = 1.0, clean = false } = options;
  const lang = forceLang || detectLang(text);

  let processedText = text;
  if (clean) {
    processedText = text
      .replace(/_+/g, lang === 'vi-VN' ? ' chỗ trống ' : ' blank ')
      .replace(/\.{2,}/g, lang === 'vi-VN' ? ' chỗ trống ' : ' blank ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (!processedText) return;

  const utterance = new SpeechSynthesisUtterance(processedText);
  utterance.lang = lang;
  utterance.rate = rate;

  // Read global voice volume from localStorage if set (default to 1.0)
  try {
    const savedVoiceReq = localStorage.getItem('tina_voiceVol');
    if (savedVoiceReq !== null) {
      utterance.volume = parseInt(savedVoiceReq, 10) / 100;
    }
  } catch (e: any) {}

  // Apply female Vietnamese voice
  if (lang === 'vi-VN') {
    const viVoice = getVietnameseFemaleVoice();
    if (viVoice) {
      utterance.voice = viVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech.
 */
export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Pre-warm the voice cache. Call this once on app init or component mount.
 * Some browsers lazily load voices — this ensures they're available.
 */
export function preloadVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  // Force voice list load
  window.speechSynthesis.getVoices();

  // Listen for async voice loading (Chrome)
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      _cachedViVoice = undefined; // Reset cache to re-search
      getVietnameseFemaleVoice();
    };
  }
}
