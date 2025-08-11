import { sanitizeHexColor, DEFAULT_THEME_COLOR, isValidHexColor } from '../colors';

describe('Color Utilities', () => {
  describe('sanitizeHexColor', () => {
    it('should return a valid 6-digit hex color as is', () => {
      expect(sanitizeHexColor('#ff0000')).toBe('#ff0000');
    });

    it('should convert a valid 3-digit hex color to 6-digit', () => {
      expect(sanitizeHexColor('#f00')).toBe('#ff0000');
    });

    it('should return the default color for invalid hex codes', () => {
      expect(sanitizeHexColor('#f0')).toBe(DEFAULT_THEME_COLOR);
      expect(sanitizeHexColor('ff0000')).toBe(DEFAULT_THEME_COLOR);
      expect(sanitizeHexColor('#gg0000')).toBe(DEFAULT_THEME_COLOR);
    });

    it('should return the default color for null or undefined input', () => {
      expect(sanitizeHexColor(null)).toBe(DEFAULT_THEME_COLOR);
      expect(sanitizeHexColor(undefined)).toBe(DEFAULT_THEME_COLOR);
    });

    it('should handle whitespace', () => {
      expect(sanitizeHexColor('  #ff0000  ')).toBe('#ff0000');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeHexColor('#FF00AA')).toBe('#ff00aa');
    });
  });

  describe('isValidHexColor', () => {
    it('should return true for valid hex colors', () => {
      expect(isValidHexColor('#f00')).toBe(true);
      expect(isValidHexColor('#ff0000')).toBe(true);
      expect(isValidHexColor('#fFaA00')).toBe(true);
    });

    it('should return false for invalid hex colors', () => {
      expect(isValidHexColor('#f0')).toBe(false);
      expect(isValidHexColor('ff0000')).toBe(false);
      expect(isValidHexColor('#gg0000')).toBe(false);
      expect(isValidHexColor(null)).toBe(false);
      expect(isValidHexColor(undefined)).toBe(false);
    });
  });
});
