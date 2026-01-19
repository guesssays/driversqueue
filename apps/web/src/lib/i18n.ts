/**
 * Internationalization module for queue system
 * Supports: ru (Russian), uzLat (Uzbek Latin), uzCyr (Uzbek Cyrillic)
 */

import { supabase } from './supabase';

export type Language = 'ru' | 'uzLat' | 'uzCyr';

export const translations: Record<Language, Record<string, string>> = {
  ru: {
    title: 'Электронная очередь',
    reg: 'Регистрация',
    tech: 'Технические вопросы',
    waiting: 'Ожидание...',
    lastCalls: 'Последние вызовы',
    soundOn: 'Звук включён',
    soundOff: 'Звук выключен',
    window: 'Окно',
    noWaiting: 'Нет ожидающих',
    electronicQueue: 'Электронная очередь',
    currentlyCalling: 'Сейчас вызываются',
    waitingFor: 'Ожидание',
    noActive: 'Нет активных вызовов',
    windowNotSpecified: 'Окно не указано',
    serving: 'Обслуживается',
    called: 'Вызван',
    waitingStatus: 'Ожидает',
    repeated: 'Повторно вызван',
    finished: 'Завершён',
    noShow: 'Не явился',
    instruction: 'Когда ваша очередь будет вызвана, подойдите к соответствующему окну.',
    note: 'Примечание',
    legend: 'Обозначения',
    legendReg: 'R - Регистрация',
    legendTech: 'T - Технические вопросы',
    fullscreen: 'Полный экран',
    exitFullscreen: 'Выход',
    calledAt: 'Вызван',
    internalScreen: 'Внутренний экран',
    externalScreen: 'Внешний экран',
    waitForCall: 'Ожидайте вызова на табло',
  },
  uzLat: {
    title: 'Elektron navbat',
    reg: "Ro'yxatdan o'tish",
    tech: 'Texnik savollar',
    waiting: 'Kutilmoqda...',
    lastCalls: "So'nggi chaqiruvlar",
    soundOn: 'Ovoz yoqilgan',
    soundOff: 'Ovoz o\'chirilgan',
    window: 'Oyna',
    noWaiting: "Kutilayotganlar yo'q",
    electronicQueue: 'Elektron navbat',
    currentlyCalling: 'Hozir chaqirilmoqda',
    waitingFor: 'Kutmoqda',
    noActive: 'Faol chaqiruvlar yo\'q',
    windowNotSpecified: 'Oyna ko\'rsatilmagan',
    serving: 'Hozir xizmatda',
    called: 'Chaqirildi',
    waitingStatus: 'Kutmoqda',
    repeated: 'Takror chaqirildi',
    finished: 'Yakunlandi',
    noShow: 'Kelmagan',
    instruction: "Navbatingiz chaqirilganda, tegishli oynaga boring.",
    note: 'Eslatma',
    legend: 'Tushuntirish',
    legendReg: "R - Ro'yxatdan o'tish",
    legendTech: 'T - Texnik savollar',
    fullscreen: 'To\'liq ekran',
    exitFullscreen: 'Chiqish',
    calledAt: 'Chaqirildi',
    internalScreen: 'Ichki ekran',
    externalScreen: 'Tashqi ekran',
    waitForCall: 'Navbatda chaqirilishini kuting',
  },
  uzCyr: {
    title: 'Электрон навбат',
    reg: 'Рўйхатдан ўтиш',
    tech: 'Техник саволлар',
    waiting: 'Кутилмоқда...',
    lastCalls: 'Сўнгги чақирувлар',
    soundOn: 'Овоз ёқилган',
    soundOff: 'Овоз ўчирилган',
    window: 'Ойна',
    noWaiting: 'Кутилаётганлар йўқ',
    electronicQueue: 'Электрон навбат',
    currentlyCalling: 'Ҳозир чақирилмоқда',
    waitingFor: 'Кутмоқда',
    noActive: 'Фаол чақирувлар йўқ',
    windowNotSpecified: 'Ойна кўрсатилмаган',
    serving: 'Ҳозир хизматда',
    called: 'Чақирилди',
    waitingStatus: 'Кутмоқда',
    repeated: 'Такрор чақирилди',
    finished: 'Якунланди',
    noShow: 'Келмаган',
    instruction: 'Навбатингиз чақирилганда, тегишли ойнага боринг.',
    note: 'Эслатма',
    legend: 'Тушунтириш',
    legendReg: 'R - Рўйхатдан ўтиш',
    legendTech: 'T - Техник саволлар',
    fullscreen: 'Тўлиқ экран',
    exitFullscreen: 'Чиқиш',
    calledAt: 'Чақирилди',
    internalScreen: 'Ички экран',
    externalScreen: 'Ташқи экран',
    waitForCall: 'Навбатда чақирилишини кутинг',
  },
};

/**
 * Validate language value
 */
export function parseLang(value: any): Language | null {
  if (value === 'ru' || value === 'uzLat' || value === 'uzCyr') {
    return value;
  }
  return null;
}

/**
 * Get language from URL parameter (for debug override only)
 */
export function getLangFromURL(): Language | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  return parseLang(urlLang);
}

/**
 * Get screens language from system_config
 */
export async function getScreensLangFromConfig(): Promise<Language | null> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'screens_lang')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return parseLang(data.value);
  } catch (err) {
    console.error('Error reading screens_lang from config:', err);
    return null;
  }
}

/**
 * Resolve screens language with priority:
 * 1. URL ?lang= override (debug only)
 * 2. system_config.screens_lang
 * 3. fallback to uzLat
 */
export async function resolveScreensLang(): Promise<Language> {
  // Priority 1: URL override (for debug)
  const urlLang = getLangFromURL();
  if (urlLang) {
    return urlLang;
  }

  // Priority 2: system_config
  const configLang = await getScreensLangFromConfig();
  if (configLang) {
    return configLang;
  }

  // Priority 3: fallback
  return 'uzLat';
}

/**
 * Get current language from URL parameter or localStorage, default to uzLat
 * @deprecated Use resolveScreensLang() for screens. This is kept for backward compatibility.
 */
export function getLang(): Language {
  if (typeof window === 'undefined') return 'uzLat';
  
  // Check URL parameter first
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  if (urlLang === 'ru' || urlLang === 'uzLat' || urlLang === 'uzCyr') {
    // Save to localStorage
    localStorage.setItem('lang', urlLang);
    return urlLang;
  }
  
  // Check localStorage
  const storedLang = localStorage.getItem('lang');
  if (storedLang === 'ru' || storedLang === 'uzLat' || storedLang === 'uzCyr') {
    return storedLang;
  }
  
  // Default to uzLat
  return 'uzLat';
}

/**
 * Translate key to current language
 */
export function t(key: string, lang?: Language): string {
  const currentLang = lang || getLang();
  return translations[currentLang]?.[key] || translations.uzLat[key] || key;
}
