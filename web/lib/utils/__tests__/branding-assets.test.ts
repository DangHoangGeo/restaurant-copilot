import {
  getSafeLogoExtension,
  isAllowedLogoMimeType,
  sanitizeGeneratedLogoSvg,
} from '../branding-assets';

describe('branding-assets', () => {
  describe('isAllowedLogoMimeType', () => {
    it('allows safe raster logo uploads', () => {
      expect(isAllowedLogoMimeType('image/png')).toBe(true);
      expect(isAllowedLogoMimeType('image/jpeg')).toBe(true);
      expect(isAllowedLogoMimeType('image/webp')).toBe(true);
      expect(isAllowedLogoMimeType('image/avif')).toBe(true);
    });

    it('rejects unsupported or unsafe mime types', () => {
      expect(isAllowedLogoMimeType('image/svg+xml')).toBe(false);
      expect(isAllowedLogoMimeType('text/plain')).toBe(false);
      expect(isAllowedLogoMimeType(undefined)).toBe(false);
    });
  });

  describe('getSafeLogoExtension', () => {
    it('normalizes well-known image extensions from mime type', () => {
      expect(getSafeLogoExtension('logo.jpeg', 'image/jpeg')).toBe('jpg');
      expect(getSafeLogoExtension('logo.png', 'image/png')).toBe('png');
      expect(getSafeLogoExtension('logo.webp', 'image/webp')).toBe('webp');
      expect(getSafeLogoExtension('logo.avif', 'image/avif')).toBe('avif');
    });
  });

  describe('sanitizeGeneratedLogoSvg', () => {
    it('keeps simple SVG markup', () => {
      const svg =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#EA580C" /></svg>';

      expect(sanitizeGeneratedLogoSvg(svg)).toBe(svg);
    });

    it('rejects SVG with dangerous tags or attributes', () => {
      expect(
        sanitizeGeneratedLogoSvg(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      ).toBeNull();
      expect(
        sanitizeGeneratedLogoSvg(
          '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onclick="alert(1)" /></svg>',
        ),
      ).toBeNull();
    });

    it('rejects SVG with external references', () => {
      expect(
        sanitizeGeneratedLogoSvg(
          '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://evil.test/icon.svg#shape" /></svg>',
        ),
      ).toBeNull();
    });
  });
});
