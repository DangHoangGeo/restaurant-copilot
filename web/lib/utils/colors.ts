/**
 * Color validation, sanitization, and customer-facing theme utilities.
 *
 * The restaurant owner can choose a brand color, but public ordering pages
 * should never paint raw user colors directly across large surfaces. These
 * helpers normalize brand colors into a professional, contrast-safe palette.
 */

export const DEFAULT_THEME_COLOR = "#c8773e";

const CUSTOMER_INK = "#17110b";
const CUSTOMER_DARK_SURFACE = "#14100b";
const CUSTOMER_CREAM = "#fff7e9";
const CUSTOMER_RICE = "#f6e8d3";

// Regex pattern for valid hex colors
const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type ProfessionalBrandPalette = {
  name: string;
  summary: string;
  brand_color: string;
  accent_color: string;
  color_reason: string;
};

export type CustomerBrandTheme = {
  raw: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  soft: string;
  softer: string;
  ring: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  darkSurface: string;
  darkSurfaceElevated: string;
  darkMuted: string;
  border: string;
  heroGradient: string;
  menuHeroGradient: string;
};

export const PROFESSIONAL_RESTAURANT_PALETTES: readonly ProfessionalBrandPalette[] =
  [
    {
      name: "Hearth clay",
      summary:
        "Warm, generous, and familiar for casual dining, family meals, and daily comfort food.",
      brand_color: "#b65a2e",
      accent_color: "#f2c7a7",
      color_reason:
        "Clay and soft peach feel welcoming while staying deep enough for readable buttons and ordering actions.",
    },
    {
      name: "Market herb",
      summary:
        "Fresh and calm for ingredient-led restaurants, balanced menus, and lunch-focused branches.",
      brand_color: "#4e6f52",
      accent_color: "#dde7d2",
      color_reason:
        "Muted herb green suggests freshness without becoming neon or losing contrast on mobile screens.",
    },
    {
      name: "Charcoal yuzu",
      summary:
        "Polished and evening-ready for izakaya, grill, ramen, and premium table-service concepts.",
      brand_color: "#3b332a",
      accent_color: "#e0b94d",
      color_reason:
        "Charcoal gives the page a refined base while yuzu gold adds appetite and warmth in small highlights.",
    },
    {
      name: "Nori cedar",
      summary:
        "Grounded and quiet for Japanese, sushi, ramen, and chef-led restaurants.",
      brand_color: "#2f4a3d",
      accent_color: "#d8b56d",
      color_reason:
        "Deep nori green with muted gold feels rooted, premium, and readable across branch pages.",
    },
    {
      name: "Coffee walnut",
      summary:
        "Soft and handcrafted for cafes, bakeries, dessert shops, and breakfast service.",
      brand_color: "#6b4a32",
      accent_color: "#e7c89b",
      color_reason:
        "Walnut and pastry tones feel handmade and warm while keeping checkout controls clear.",
    },
    {
      name: "Saigon basil",
      summary:
        "Bright but controlled for Vietnamese food, herbs, noodles, and fresh street-food energy.",
      brand_color: "#3f6b4a",
      accent_color: "#f0c66f",
      color_reason:
        "Basil green with a restrained golden accent communicates freshness without looking generic.",
    },
    {
      name: "Plum lacquer",
      summary:
        "Memorable and intimate for bars, date-night dining, and small restaurants with a stronger mood.",
      brand_color: "#743f4b",
      accent_color: "#e6c9c6",
      color_reason:
        "Muted plum creates a distinct identity while the light blush accent keeps the page gentle.",
    },
  ] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hexColor: string): RgbColor {
  const safeColor = sanitizeHexColor(hexColor);
  const hex = safeColor.substring(1);

  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b]
    .map((component) => clamp(Math.round(component), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return { h: hue * 60, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const normalizedHue = (((h % 360) + 360) % 360) / 360;

  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgb(p, q, normalizedHue + 1 / 3) * 255,
    g: hueToRgb(p, q, normalizedHue) * 255,
    b: hueToRgb(p, q, normalizedHue - 1 / 3) * 255,
  };
}

function mixColors(colorA: string, colorB: string, amount: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const weight = clamp(amount, 0, 1);

  return rgbToHex({
    r: a.r * (1 - weight) + b.r * weight,
    g: a.g * (1 - weight) + b.g * weight,
    b: a.b * (1 - weight) + b.b * weight,
  });
}

function adjustLightness(hexColor: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hexColor));
  return rgbToHex(
    hslToRgb({
      ...hsl,
      l: clamp(hsl.l + delta, 0.12, 0.82),
    }),
  );
}

function getRelativeLuminance(hexColor: string): number {
  const { r, g, b } = hexToRgb(hexColor);
  const toLinear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(colorA: string, colorB: string): number {
  const luminanceA = getRelativeLuminance(colorA);
  const luminanceB = getRelativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);

  return (lighter + 0.05) / (darker + 0.05);
}

function normalizeProfessionalPrimary(color: string): string {
  const safeColor = sanitizeHexColor(color);
  const hsl = rgbToHsl(hexToRgb(safeColor));
  let normalized = rgbToHex(
    hslToRgb({
      h: hsl.h,
      s: clamp(hsl.s, 0.28, 0.62),
      l: clamp(hsl.l, 0.25, 0.46),
    }),
  );

  for (let step = 0; step < 8; step += 1) {
    if (getContrastRatio(normalized, CUSTOMER_CREAM) >= 4.5) {
      return normalized;
    }

    normalized = adjustLightness(normalized, -0.035);
  }

  return normalized;
}

function normalizeProfessionalAccent(
  accentColor: string | null | undefined,
  primaryColor: string,
): string {
  const source = isValidHexColor(accentColor)
    ? sanitizeHexColor(accentColor)
    : mixColors(primaryColor, CUSTOMER_CREAM, 0.72);
  const hsl = rgbToHsl(hexToRgb(source));

  return rgbToHex(
    hslToRgb({
      h: hsl.h,
      s: clamp(hsl.s, 0.18, 0.48),
      l: clamp(hsl.l, 0.62, 0.84),
    }),
  );
}

function alpha(color: string, opacity: number): string {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1)})`;
}

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

export function normalizeProfessionalBrandPalette(
  colors: {
    brandColor?: string | null;
    accentColor?: string | null;
  },
  fallback: ProfessionalBrandPalette = PROFESSIONAL_RESTAURANT_PALETTES[0],
): { brandColor: string; accentColor: string } {
  const primary = normalizeProfessionalPrimary(
    colors.brandColor && isValidHexColor(colors.brandColor)
      ? colors.brandColor
      : fallback.brand_color,
  );

  return {
    brandColor: primary,
    accentColor: normalizeProfessionalAccent(
      colors.accentColor && isValidHexColor(colors.accentColor)
        ? colors.accentColor
        : fallback.accent_color,
      primary,
    ),
  };
}

export function getProfessionalRestaurantPalettes(context?: {
  cuisine?: string | null;
  style?: string | null;
  specialties?: string | null;
  ownerIntro?: string | null;
}): ProfessionalBrandPalette[] {
  const text = [
    context?.cuisine,
    context?.style,
    context?.specialties,
    context?.ownerIntro,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const preferredNames: string[] = [];

  if (/(phở|pho|bún|bun|bánh mì|banh mi|vietnam|việt|viet)/i.test(text)) {
    preferredNames.push("Saigon basil", "Hearth clay", "Market herb");
  } else if (
    /(ramen|ラーメン|sushi|寿司|izakaya|居酒屋|yakitori|焼き鳥|japan|japanese)/i.test(
      text,
    )
  ) {
    preferredNames.push("Nori cedar", "Charcoal yuzu", "Hearth clay");
  } else if (/(coffee|cafe|café|bakery|bread|pastry|cake|dessert)/i.test(text)) {
    preferredNames.push("Coffee walnut", "Market herb", "Plum lacquer");
  } else if (/(bar|wine|night|evening|premium|date|cocktail)/i.test(text)) {
    preferredNames.push("Plum lacquer", "Charcoal yuzu", "Nori cedar");
  }

  const selected = preferredNames
    .map((name) =>
      PROFESSIONAL_RESTAURANT_PALETTES.find((palette) => palette.name === name),
    )
    .filter((palette): palette is ProfessionalBrandPalette => Boolean(palette));

  for (const palette of PROFESSIONAL_RESTAURANT_PALETTES) {
    if (selected.length >= 3) break;
    if (!selected.some((existing) => existing.name === palette.name)) {
      selected.push(palette);
    }
  }

  return selected.slice(0, 3);
}

export function createCustomerBrandTheme(
  brandColor: string | null | undefined,
  accentColor?: string | null,
): CustomerBrandTheme {
  const { brandColor: primary, accentColor: accent } =
    normalizeProfessionalBrandPalette({ brandColor, accentColor });
  const primaryForeground =
    getContrastRatio(primary, CUSTOMER_CREAM) >= 4.5
      ? CUSTOMER_CREAM
      : CUSTOMER_INK;
  const accentForeground =
    getContrastRatio(accent, CUSTOMER_INK) >= 4.5
      ? CUSTOMER_INK
      : CUSTOMER_CREAM;

  return {
    raw: sanitizeHexColor(brandColor),
    primary,
    primaryHover: adjustLightness(primary, -0.06),
    primaryForeground,
    accent,
    accentForeground,
    soft: alpha(primary, 0.12),
    softer: alpha(primary, 0.06),
    ring: alpha(primary, 0.34),
    background: mixColors(CUSTOMER_CREAM, primary, 0.035),
    surface: mixColors("#ffffff", primary, 0.025),
    surfaceElevated: mixColors(CUSTOMER_CREAM, primary, 0.055),
    darkSurface: mixColors(CUSTOMER_DARK_SURFACE, primary, 0.12),
    darkSurfaceElevated: mixColors(CUSTOMER_DARK_SURFACE, primary, 0.2),
    darkMuted: mixColors(CUSTOMER_RICE, primary, 0.18),
    border: alpha(primary, 0.22),
    heroGradient: `radial-gradient(circle at top left, ${alpha(primary, 0.72)}, transparent 36%), radial-gradient(circle at top right, ${alpha(accent, 0.18)}, transparent 26%), linear-gradient(180deg, ${mixColors(CUSTOMER_DARK_SURFACE, primary, 0.18)} 0%, ${CUSTOMER_DARK_SURFACE} 58%, #080705 100%)`,
    menuHeroGradient: `linear-gradient(150deg, ${primary} 0%, ${mixColors(primary, CUSTOMER_DARK_SURFACE, 0.18)} 58%, ${mixColors(primary, CUSTOMER_DARK_SURFACE, 0.34)} 100%)`,
  };
}

/**
 * Creates safe CSS custom properties for theming
 * @param primaryColor - The primary theme color
 * @returns Object with safe CSS custom properties
 */
export function createThemeProperties(
  primaryColor: string | null | undefined,
): Record<string, string> {
  return createCustomerThemeProperties(primaryColor);
}

export function createCustomerThemeProperties(
  primaryColor: string | null | undefined,
  accentColor?: string | null,
): Record<string, string> {
  const theme = createCustomerBrandTheme(primaryColor, accentColor);
  const rgb = hexToRgb(theme.primary);

  return {
    "--brand-color": theme.primary,
    "--theme-primary": theme.primary,
    "--theme-primary-hover": theme.primaryHover,
    "--theme-primary-foreground": theme.primaryForeground,
    "--theme-primary-rgb": `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    "--theme-primary-50": alpha(theme.primary, 0.05),
    "--theme-primary-100": alpha(theme.primary, 0.1),
    "--theme-primary-200": alpha(theme.primary, 0.2),
    "--theme-primary-500": alpha(theme.primary, 0.5),
    "--theme-primary-700": alpha(theme.primary, 0.7),
    "--theme-primary-900": alpha(theme.primary, 0.9),
    "--customer-brand": theme.primary,
    "--customer-brand-hover": theme.primaryHover,
    "--customer-brand-foreground": theme.primaryForeground,
    "--customer-accent": theme.accent,
    "--customer-accent-foreground": theme.accentForeground,
    "--customer-brand-soft": theme.soft,
    "--customer-brand-softer": theme.softer,
    "--customer-brand-ring": theme.ring,
    "--customer-background": theme.background,
    "--customer-surface": theme.surface,
    "--customer-surface-elevated": theme.surfaceElevated,
    "--customer-dark-surface": theme.darkSurface,
    "--customer-dark-surface-elevated": theme.darkSurfaceElevated,
    "--customer-dark-muted": theme.darkMuted,
    "--customer-border": theme.border,
    "--customer-hero-gradient": theme.heroGradient,
    "--customer-menu-hero-gradient": theme.menuHeroGradient,
  };
}

/**
 * Gets a contrasting text color (black or white) for a given background color
 * @param backgroundColor - The background hex color
 * @returns '#000000' or '#ffffff' for optimal contrast
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const safeColor = sanitizeHexColor(backgroundColor);

  return getContrastRatio(safeColor, CUSTOMER_CREAM) >=
    getContrastRatio(safeColor, CUSTOMER_INK)
    ? CUSTOMER_CREAM
    : CUSTOMER_INK;
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
