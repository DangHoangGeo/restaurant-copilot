/**
 * Color validation and sanitization utilities
 * Prevents CSS/script injection through color values
 */

// Default fallback color (a professional restaurant blue)
export const DEFAULT_THEME_COLOR = '#2563eb';

// Regex pattern for valid hex colors
const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

/**
 * Sanitizes a hex color string to prevent injection attacks
 * @param color - The color string to validate
 * @returns Valid hex color or default fallback
 */
export function sanitizeHexColor(color: string | null | undefined): string {
  // Handle null, undefined, or empty strings
  if (!color || typeof color !== 'string') {
    return DEFAULT_THEME_COLOR;
  }

  // Trim whitespace
  const trimmedColor = color.trim();

  // Check if it matches valid hex pattern
  if (!HEX_COLOR_PATTERN.test(trimmedColor)) {
    return DEFAULT_THEME_COLOR;
  }

  // Normalize 3-digit hex to 6-digit hex
  if (trimmedColor.length === 4) {
    const shortHex = trimmedColor.substring(1);
    const longHex = shortHex.split('').map(char => char + char).join('');
    return `#${longHex}`;
  }

  // Return the validated and normalized color
  return trimmedColor.toLowerCase();
}

/**
 * Validates if a color string is a valid hex color
 * @param color - The color string to validate
 * @returns boolean indicating if the color is valid
 */
export function isValidHexColor(color: string | null | undefined): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  return HEX_COLOR_PATTERN.test(color.trim());
}

/**
 * Creates safe CSS custom properties for theming
 * @param primaryColor - The primary theme color
 * @returns Object with safe CSS custom properties
 */
export function createThemeProperties(primaryColor: string): Record<string, string> {
  const safeColor = sanitizeHexColor(primaryColor);
  
  // Convert hex to RGB values for alpha variants
  const hex = safeColor.substring(1);
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return {
    '--theme-primary': safeColor,
    '--theme-primary-rgb': `${r}, ${g}, ${b}`,
    '--theme-primary-50': `rgba(${r}, ${g}, ${b}, 0.05)`,
    '--theme-primary-100': `rgba(${r}, ${g}, ${b}, 0.1)`,
    '--theme-primary-200': `rgba(${r}, ${g}, ${b}, 0.2)`,
    '--theme-primary-500': `rgba(${r}, ${g}, ${b}, 0.5)`,
    '--theme-primary-700': `rgba(${r}, ${g}, ${b}, 0.7)`,
    '--theme-primary-900': `rgba(${r}, ${g}, ${b}, 0.9)`,
  };
}

/**
 * Gets a contrasting text color (black or white) for a given background color
 * @param backgroundColor - The background hex color
 * @returns '#000000' or '#ffffff' for optimal contrast
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const safeColor = sanitizeHexColor(backgroundColor);
  const hex = safeColor.substring(1);
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance using WCAG formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Validates and normalizes a collection of theme colors
 * @param colors - Object with color properties
 * @returns Sanitized color object with all valid colors
 */
export function sanitizeThemeColors(colors: Record<string, string | null | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(colors)) {
    sanitized[key] = sanitizeHexColor(value);
  }
  
  return sanitized;
}