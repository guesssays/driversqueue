/**
 * Offline TTS Player - озвучка из локальных аудио файлов
 * 
 * Структура аудио файлов:
 * public/audio/{lang}/
 *   - beep.mp3 (короткий "пик" перед объявлением)
 *   - number.mp3 (слово "Номер" / "Navbat" / "Номер")
 *   - please_go.mp3 (фраза "подойдите к" / "... boring")
 *   - window.mp3 (слово "окну" / "oyna" / "окно")
 *   - digits/0.mp3 ... digits/9.mp3 (цифры)
 *   - letters/A.mp3 ... letters/Z.mp3 (буквы для номеров талонов)
 * 
 * Поддерживаемые языки: ru, uzLat, uzCyr
 */

import type { Language } from './i18n';

let soundEnabled = false;
let audioUnlocked = false;
let playQueue: Promise<void> = Promise.resolve();

const STORAGE_KEY = 'soundEnabled';

/**
 * Инициализация разблокировки аудио (требуется для autoplay policy браузера)
 * Вызывается по клику пользователя на кнопку звука
 */
export async function initAudioUnlock(): Promise<void> {
  if (audioUnlocked) return;

  try {
    // Проигрываем короткий беззвучный или beep файл для разблокировки
    const audio = new Audio('/audio/beep.mp3');
    audio.volume = 0.1;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
  } catch (err) {
    console.warn('Audio unlock failed:', err);
    // Продолжаем работу даже если разблокировка не удалась
    audioUnlocked = true;
  }
}

/**
 * Включить/выключить звук
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  }
}

/**
 * Проверить, включен ли звук
 */
export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      soundEnabled = stored === '1';
    }
  }
  return soundEnabled;
}

/**
 * Проиграть один аудио файл
 */
async function playOne(path: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    
    const handleEnd = () => {
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('error', handleError);
      resolve();
    };
    
    const handleError = (err: Event) => {
      console.warn(`Audio file not found or failed to play: ${path}`, err);
      audio.removeEventListener('ended', handleEnd);
      audio.removeEventListener('error', handleError);
      resolve(); // Продолжаем даже при ошибке
    };
    
    audio.addEventListener('ended', handleEnd);
    audio.addEventListener('error', handleError);
    
    audio.play().catch((err) => {
      console.warn(`Failed to play audio: ${path}`, err);
      resolve(); // Продолжаем даже при ошибке
    });
  });
}

/**
 * Проиграть последовательность аудио файлов
 */
export async function playSequence(paths: string[]): Promise<void> {
  if (!soundEnabled) return;
  
  // Добавляем в очередь
  playQueue = playQueue.then(async () => {
    for (const path of paths) {
      await playOne(path);
    }
  });
  
  return playQueue;
}

/**
 * Разбить номер талона на токены (буквы и цифры)
 * Примеры:
 * - "T-002" -> ["T", "0", "0", "2"]
 * - "R-001" -> ["R", "0", "0", "1"]
 * - "A12" -> ["A", "1", "2"]
 */
function tokenizeTicket(ticketNo: string): string[] {
  const upper = ticketNo.toUpperCase();
  const tokens: string[] = [];
  
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    // Пропускаем дефис и другие разделители
    if (char === '-' || char === '_' || char === ' ') {
      continue;
    }
    // Буквы
    if (char >= 'A' && char <= 'Z') {
      tokens.push(char);
    }
    // Цифры
    else if (char >= '0' && char <= '9') {
      tokens.push(char);
    }
  }
  
  return tokens;
}

/**
 * Озвучить вызов талона
 * @param ticketNo - номер талона (например, "T-002", "R-001")
 * @param windowLabel - метка окна (например, "1", "2")
 * @param lang - язык озвучки
 */
export async function speakCall(
  ticketNo: string,
  windowLabel: string | null,
  lang: Language
): Promise<void> {
  if (!soundEnabled || !windowLabel) return;
  
  const windowNum = windowLabel.match(/\d+/)?.[0];
  if (!windowNum) return;
  
  const tokens = tokenizeTicket(ticketNo);
  const audioPaths: string[] = [];
  
  // 1. Beep
  audioPaths.push(`/audio/${lang}/beep.mp3`);
  
  // 2. "Номер" / "Navbat"
  audioPaths.push(`/audio/${lang}/number.mp3`);
  
  // 3. Токены номера талона
  for (const token of tokens) {
    if (token >= 'A' && token <= 'Z') {
      audioPaths.push(`/audio/${lang}/letters/${token}.mp3`);
    } else if (token >= '0' && token <= '9') {
      audioPaths.push(`/audio/${lang}/digits/${token}.mp3`);
    }
  }
  
  // 4. "подойдите к" / "boring"
  audioPaths.push(`/audio/${lang}/please_go.mp3`);
  
  // 5. "окно" / "oyna"
  audioPaths.push(`/audio/${lang}/window.mp3`);
  
  // 6. Номер окна
  for (const digit of windowNum) {
    audioPaths.push(`/audio/${lang}/digits/${digit}.mp3`);
  }
  
  await playSequence(audioPaths);
}

// Инициализация: загрузить состояние из localStorage
if (typeof window !== 'undefined') {
  isSoundEnabled();
}
