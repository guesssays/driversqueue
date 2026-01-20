/**
 * Offline TTS Player - озвучка из локальных аудио файлов
 * 
 * Структура аудио файлов:
 * public/audio/{lang}/
 *   - beep.mp3 (короткий "пик" перед объявлением, опционально)
 *   - number.mp3 (слово "Номер" / "Navbat raqami" / "Навбат рақами")
 *   - window.mp3 (слово "окно" / "oyna" / "ойна", для ru)
 *   - window_suffix.mp3 (uzLat: "oynaga", uzCyr: "ойнага", для uzLat/uzCyr)
 *   - please_go.mp3 (устаревший, больше не используется)
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

// Кэш предзагруженных аудио элементов
const audioCache = new Map<string, HTMLAudioElement>();

// Паузы между клипами (в миллисекундах)
const DEFAULT_GAP_MS = 60;
const WINDOW_SUFFIX_GAP_MS = 10; // Меньше пауза между номером окна и суффиксом

// Throttle для анти-спама (не озвучивать один ticket.id чаще чем раз в 2 секунды)
const lastAnnounceTime = new Map<string, number>();
const THROTTLE_MS = 2000;

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
 * Предзагрузить аудио файлы
 */
export async function preloadAudio(paths: string[]): Promise<void> {
  for (const path of paths) {
    if (audioCache.has(path)) continue;
    
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      await new Promise<void>((resolve) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', () => {
          console.warn(`Failed to preload audio: ${path}`);
          resolve(); // Продолжаем даже при ошибке предзагрузки
        }, { once: true });
        audio.load();
      });
      audioCache.set(path, audio);
    } catch (err) {
      console.warn(`Error preloading audio: ${path}`, err);
    }
  }
}

/**
 * Вспомогательная функция для задержки
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Проиграть один аудио файл (использует кэш если доступен)
 */
async function playOne(path: string): Promise<void> {
  return new Promise((resolve) => {
    // Используем кэшированный элемент или создаём новый
    let audio: HTMLAudioElement;
    const cached = audioCache.get(path);
    
    if (cached) {
      // Клонируем для параллельного воспроизведения
      audio = cached.cloneNode(true) as HTMLAudioElement;
    } else {
      audio = new Audio(path);
      audio.preload = 'auto';
    }
    
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
 * @param paths - массив путей к аудио файлам
 * @param gaps - опциональный массив пауз для каждого файла (в мс), если не указан - используется DEFAULT_GAP_MS
 */
export async function playSequence(paths: string[], gaps?: number[]): Promise<void> {
  if (!soundEnabled) return;
  
  // Добавляем в очередь
  playQueue = playQueue.then(async () => {
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      await playOne(path);
      // Пауза после клипа (кроме последнего)
      if (i < paths.length - 1) {
        const gapMs = gaps && gaps[i] !== undefined ? gaps[i] : DEFAULT_GAP_MS;
        await sleep(gapMs);
      }
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
  const gaps: number[] = [];
  
  // 1. Beep (опционально)
  audioPaths.push(`/audio/${lang}/beep.mp3`);
  gaps.push(DEFAULT_GAP_MS);
  
  // 2. "Номер" / "Navbat raqami" / "Навбат рақами"
  audioPaths.push(`/audio/${lang}/number.mp3`);
  gaps.push(DEFAULT_GAP_MS);
  
  // 3. Токены номера талона
  for (const token of tokens) {
    if (token >= 'A' && token <= 'Z') {
      audioPaths.push(`/audio/${lang}/letters/${token}.mp3`);
      gaps.push(DEFAULT_GAP_MS);
    } else if (token >= '0' && token <= '9') {
      audioPaths.push(`/audio/${lang}/digits/${token}.mp3`);
      gaps.push(DEFAULT_GAP_MS);
    }
  }
  
  // 4. Номер окна
  for (const digit of windowNum) {
    audioPaths.push(`/audio/${lang}/digits/${digit}.mp3`);
    gaps.push(DEFAULT_GAP_MS);
  }
  
  // 5. Суффикс окна (разный для разных языков)
  if (lang === 'uzLat' || lang === 'uzCyr') {
    // uzLat: "oynaga", uzCyr: "ойнага"
    // Проверяем наличие window_suffix.mp3, если нет - используем fallback
    const windowSuffixPath = `/audio/${lang}/window_suffix.mp3`;
    const windowPath = `/audio/${lang}/window.mp3`;
    
    // Проверяем существование файла через HEAD запрос
    try {
      const response = await fetch(windowSuffixPath, { method: 'HEAD' });
      if (response.ok) {
        audioPaths.push(windowSuffixPath);
        gaps.push(WINDOW_SUFFIX_GAP_MS);
      } else {
        // Fallback: используем window.mp3 если window_suffix.mp3 отсутствует
        audioPaths.push(windowPath);
        gaps.push(DEFAULT_GAP_MS);
      }
    } catch {
      // При ошибке используем fallback
      audioPaths.push(windowPath);
      gaps.push(DEFAULT_GAP_MS);
    }
  } else {
    // ru: "окно"
    audioPaths.push(`/audio/${lang}/window.mp3`);
    gaps.push(DEFAULT_GAP_MS);
  }
  
  // Предзагружаем все файлы перед воспроизведением
  await preloadAudio(audioPaths);
  
  await playSequence(audioPaths, gaps);
}

/**
 * Проверить throttle для анти-спама
 */
export function checkThrottle(eventKey: string): boolean {
  const now = Date.now();
  const lastTime = lastAnnounceTime.get(eventKey);
  
  if (lastTime && (now - lastTime) < THROTTLE_MS) {
    return false; // Слишком рано, пропускаем
  }
  
  lastAnnounceTime.set(eventKey, now);
  return true; // Можно озвучивать
}

// Инициализация: загрузить состояние из localStorage
if (typeof window !== 'undefined') {
  isSoundEnabled();
}
