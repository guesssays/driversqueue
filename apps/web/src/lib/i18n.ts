/**
 * Uzbek (Latin) translations for screen display
 */
export const translations = {
  uz: {
    // Main titles
    title: 'Navbat',
    electronicQueue: 'Elektron navbat',
    
    // Queue types
    registration: "Ro'yxatdan o'tish",
    technicalSupport: 'Texnik yordam',
    
    // Status labels
    currentlyCalling: 'Hozir chaqirilmoqda',
    waiting: 'Kutayotganlar',
    waitingFor: 'Kutmoqda',
    noActive: 'Faol chaqiruvlar yo\'q',
    noWaiting: 'Kutayotganlar yo\'q',
    
    // Window
    window: 'Oyna',
    windowNotSpecified: 'Oyna ko\'rsatilmagan',
    
    // Ticket statuses
    serving: 'Hozir xizmatda',
    called: 'Chaqirildi',
    waitingStatus: 'Kutmoqda',
    repeated: 'Takror chaqirildi',
    finished: 'Yakunlandi',
    noShow: 'Kelmagan',
    
    // Instructions
    instruction: "Navbatingiz chaqirilganda, tegishli oynaga boring.",
    note: 'Eslatma',
    
    // Legend
    legend: 'Tushuntirish',
    legendReg: "R - Ro'yxatdan o'tish",
    legendTech: 'T - Texnik yordam',
    
    // Controls
    fullscreen: 'To\'liq ekran',
    exitFullscreen: 'Chiqish',
    voiceOn: 'Ovoz yoqilgan',
    voiceOff: 'Ovoz o\'chirilgan',
    
    // Time
    calledAt: 'Chaqirildi',
    
    // Screen modes
    internalScreen: 'Ichki ekran',
    externalScreen: 'Tashqi ekran',
  },
  ru: {
    title: 'Очередь',
    electronicQueue: 'Электронная очередь',
    registration: 'Регистрация',
    technicalSupport: 'Технические вопросы',
    currentlyCalling: 'Сейчас вызываются',
    waiting: 'Ожидающие',
    waitingFor: 'Ожидание',
    noActive: 'Нет активных вызовов',
    noWaiting: 'Нет ожидающих',
    window: 'Окно',
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
    voiceOn: 'Звук включён',
    voiceOff: 'Звук выключен',
    calledAt: 'Вызван',
    internalScreen: 'Внутренний экран',
    externalScreen: 'Внешний экран',
  },
};

export type Language = 'uz' | 'ru';
export type TranslationKey = keyof typeof translations.uz;

export function t(key: TranslationKey, lang: Language = 'uz'): string {
  return translations[lang]?.[key] || translations.uz[key] || key;
}
