/**
 * Extract window number (1-6) from window_label
 * Supports formats: "1", "2", "Окно 1", "Oyna 2", "Window 3", "Окно1", etc.
 * Profile window_label should be stored as "1".."6" (string numbers)
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
 * Get window number from ticket or profile
 */
export function getWindowNumber(windowLabel: string | null | undefined): number | null {
  return extractWindowNumber(windowLabel);
}
