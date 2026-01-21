/**
 * Offline TTS Player - озвучка из локальных аудио файлов
 * 
 * Структура аудио файлов:
 * public/audio/{lang}/
 *   - beep.mp3 (короткий "пик" перед объявлением, опционально)
 *   - number.mp3 (слово "Номер" / "Navbat raqami" / "Навбат рақами")
 *   - window.mp3 (слово "окно" / "oyna" / "ойна", для ru и fallback для uzLat/uzCyr)
 *   - window_suffix.mp3 (uzLat: "oynaga", uzCyr: "ойнага", для uzLat/uzCyr)
 *   - go.mp3 (опционально для uzLat/uzCyr, если отсутствует - пропускается)
 *   - please_go.mp3 (устаревший, больше не используется)
 *   - digits/0.mp3 ... digits/9.mp3 (цифры, используется как fallback)
 *   - numbers/1.mp3 ... numbers/999.mp3 (числа 1-999, озвучка без ведущих нулей)
 *   - ordinals/1.mp3 ... ordinals/6.mp3 (порядковые числительные для uzLat/uzCyr: birinchi, ikkinchi, uchinchi, to'rtinchi, beshinchi, oltinchi)
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

// Кэш "существует ли файл numbers/{n}.mp3" (чтобы не делать HEAD/GET каждый раз)
const numberAudioExistsCache = new Map<string, boolean>();

async function numberAudioExists(lang: Language, n: number): Promise<boolean> {
  const key = `${lang}:${n}`;

  const cached = numberAudioExistsCache.get(key);
  if (cached !== undefined) return cached;

  const url = `/audio/${lang}/numbers/${n}.mp3`;

  try {
    // HEAD обычно достаточно и быстро
    const res = await fetch(url, { method: 'HEAD' });
    const ok = res.ok;
    numberAudioExistsCache.set(key, ok);
    return ok;
  } catch {
    numberAudioExistsCache.set(key, false);
    return false;
  }
}


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
 * Нормализовать номер талона: извлечь префикс (букву) и число без ведущих нулей
 * Примеры:
 * - "T-001" -> { prefix: "T", number: 1 }
 * - "R-005" -> { prefix: "R", number: 5 }
 * - "T228" -> { prefix: "T", number: 228 }
 * - "T-000" -> null (используется fallback)

 * 
 * Если парсинг не удался, возвращает null (fallback на старый алгоритм)
 */
function normalizeTicketNumber(ticketNo: string): { prefix: string; number: number } | null {
  if (!ticketNo) return null;

  const cleaned = ticketNo.trim().toUpperCase();

  // Форматы: T001, T-001, T 001, R010 и т.п.
  // Берём 1 букву + цифры (1..3), ведущие нули убираем через parseInt
  const match = cleaned.match(/^([A-ZА-Я])[\s\-]*0*([0-9]{1,3})$/);
  if (!match) return null;

  const prefix = match[1];
  const num = parseInt(match[2], 10);

  // 0 — не озвучиваем "числом", уйдёт в fallback
  if (!Number.isFinite(num) || num <= 0 || num > 999) return null;

  return { prefix, number: num };
}


/**
 * Разбить номер талона на токены (буквы и цифры) - fallback для старого алгоритма
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
  
  const audioPaths: string[] = [];
  const gaps: number[] = [];
  
  // 1. Beep (опционально)
  audioPaths.push(`/audio/${lang}/beep.mp3`);
  gaps.push(DEFAULT_GAP_MS);
  
  // 2. "Номер" / "Navbat raqami" / "Навбат рақами"
  audioPaths.push(`/audio/${lang}/number.mp3`);
  gaps.push(DEFAULT_GAP_MS);
  
  // 3. Номер талона: пытаемся использовать новый формат (префикс + число)
  const normalized = normalizeTicketNumber(ticketNo);
  let useNormalizedFormat = false;
  
if (normalized) {
  // Проверяем наличие файла numbers/{n}.mp3 (через кэш)
  const numberPath = `/audio/${lang}/numbers/${normalized.number}.mp3`;

  if (await numberAudioExists(lang, normalized.number)) {
    // Новый формат: буква + число одним файлом
    audioPaths.push(`/audio/${lang}/letters/${normalized.prefix}.mp3`);
    gaps.push(DEFAULT_GAP_MS);

    audioPaths.push(numberPath);
    gaps.push(DEFAULT_GAP_MS);

    useNormalizedFormat = true;
  }
}

  
  // Fallback: если новый формат не доступен, используем старый (цифра за цифрой)
  if (!useNormalizedFormat) {
    const tokens = tokenizeTicket(ticketNo);
    for (const token of tokens) {
      if (token >= 'A' && token <= 'Z') {
        audioPaths.push(`/audio/${lang}/letters/${token}.mp3`);
        gaps.push(DEFAULT_GAP_MS);
      } else if (token >= '0' && token <= '9') {
        audioPaths.push(`/audio/${lang}/digits/${token}.mp3`);
        gaps.push(DEFAULT_GAP_MS);
      }
    }
  }
  
  // 4-6. Номер окна и суффикс (разный для разных языков)
  if (lang === 'uzLat' || lang === 'uzCyr') {
    // Для узбекских языков используем порядковые числительные
    const windowNumInt = parseInt(windowNum, 10);
    if (windowNumInt >= 1 && windowNumInt <= 6) {
      // Проверяем наличие ordinals/{window}.mp3
      const ordinalPath = `/audio/${lang}/ordinals/${windowNumInt}.mp3`;
      let ordinalFound = false;
      
      try {
        const response = await fetch(ordinalPath, { method: 'HEAD' });
        if (response.ok) {
          audioPaths.push(ordinalPath);
          gaps.push(DEFAULT_GAP_MS);
          ordinalFound = true;
        }
      } catch {
        // Продолжаем с fallback
      }
      
      // Fallback: если ordinals отсутствует, используем digits
      if (!ordinalFound) {
        for (const digit of windowNum) {
          audioPaths.push(`/audio/${lang}/digits/${digit}.mp3`);
          gaps.push(DEFAULT_GAP_MS);
        }
      }
    } else {
      // Если номер окна вне диапазона 1-6, используем digits
      for (const digit of windowNum) {
        audioPaths.push(`/audio/${lang}/digits/${digit}.mp3`);
        gaps.push(DEFAULT_GAP_MS);
      }
    }
    
    // 5. Суффикс окна (window_suffix.mp3 с fallback на window.mp3)
    const windowSuffixPath = `/audio/${lang}/window_suffix.mp3`;
    const windowPath = `/audio/${lang}/window.mp3`;
    
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
    
    // 6. go.mp3 (опционально, если отсутствует - пропускаем)
    const goPath = `/audio/${lang}/go.mp3`;
    try {
      const response = await fetch(goPath, { method: 'HEAD' });
      if (response.ok) {
        audioPaths.push(goPath);
        gaps.push(DEFAULT_GAP_MS);
      }
    } catch {
      // Пропускаем go.mp3 если отсутствует
    }
  } else {
    // ru: "окно" + номер окна цифрами
    audioPaths.push(`/audio/${lang}/window.mp3`);
    gaps.push(DEFAULT_GAP_MS);
    
    for (const digit of windowNum) {
      audioPaths.push(`/audio/${lang}/digits/${digit}.mp3`);
      gaps.push(DEFAULT_GAP_MS);
    }
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
