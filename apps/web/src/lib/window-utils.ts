/**
 * Extract window number (1-6) from window_label
 * Supports formats: "Окно 1", "Oyna 2", "Window 3", "1", "Окно1", etc.
 */
export function extractWindowNumber(windowLabel: string | null | undefined): number | null {
  if (!windowLabel) return null;
  
  // Try to extract number from string
  const match = windowLabel.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 6) {
      return num;
    }
  }
  
  return null;
}

/**
 * Format window number for display (UZ: "Oyna 1", "Oyna 2", etc.)
 */
export function formatWindowNumber(windowNumber: number | null, lang: 'uz' | 'ru' = 'uz'): string {
  if (!windowNumber) return lang === 'uz' ? 'Oyna ko\'rsatilmagan' : 'Окно не указано';
  
  if (lang === 'uz') {
    return `Oyna ${windowNumber}`;
  }
  return `Окно ${windowNumber}`;
}

/**
 * Get window number from ticket or profile
 */
export function getWindowNumber(windowLabel: string | null | undefined): number | null {
  return extractWindowNumber(windowLabel);
}
