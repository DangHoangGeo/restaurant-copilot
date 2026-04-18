const ALLOWED_RASTER_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
]);

/**
 * Detect the image MIME type from magic bytes in the file buffer.
 * Returns the detected type, or null if unknown / disallowed.
 * This must be used instead of trusting the client-supplied file.type.
 */
export function detectImageMimeType(buffer: Uint8Array): string | null {
  if (buffer.length < 4) return null;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP: RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // AVIF / HEIF: ftyp box at offset 4 containing "avif" or "avis"
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 &&
    (
      (buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x66) ||
      (buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x73)
    )
  ) {
    return 'image/avif';
  }

  return null;
}

const SVG_XML_DECLARATION = /^<\?xml[\s\S]*?\?>/i;
const SVG_DOCTYPE = /<!DOCTYPE[\s\S]*?>/gi;
const DISALLOWED_SVG_TAG_PATTERN =
  /<(?:script|foreignObject|iframe|object|embed|audio|video|canvas|image|img|style|link|meta|animate|set)\b/i;
const DISALLOWED_SVG_ATTRIBUTE_PATTERN = /\son[a-z-]+\s*=/i;
const EXTERNAL_REFERENCE_PATTERN =
  /\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|data:|javascript:|\/\/)/i;

export function isAllowedLogoMimeType(
  mimeType: string | null | undefined,
): boolean {
  if (!mimeType) {
    return false;
  }

  return ALLOWED_RASTER_LOGO_MIME_TYPES.has(mimeType.toLowerCase());
}

export function getSafeLogoExtension(fileName: string, mimeType: string): string {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (normalizedMimeType === 'image/png') {
    return 'png';
  }

  if (normalizedMimeType === 'image/webp') {
    return 'webp';
  }

  if (normalizedMimeType === 'image/avif') {
    return 'avif';
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'png';
}

export function sanitizeGeneratedLogoSvg(svg: string): string | null {
  const normalizedSvg = svg
    .trim()
    .replace(SVG_XML_DECLARATION, '')
    .replace(SVG_DOCTYPE, '')
    .trim();

  if (!normalizedSvg.startsWith('<svg') || !normalizedSvg.endsWith('</svg>')) {
    return null;
  }

  if (normalizedSvg.length > 50_000) {
    return null;
  }

  if (DISALLOWED_SVG_TAG_PATTERN.test(normalizedSvg)) {
    return null;
  }

  if (DISALLOWED_SVG_ATTRIBUTE_PATTERN.test(normalizedSvg)) {
    return null;
  }

  if (EXTERNAL_REFERENCE_PATTERN.test(normalizedSvg)) {
    return null;
  }

  return normalizedSvg;
}
