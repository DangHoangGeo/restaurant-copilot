# Restaurant Font Options Guide

This document contains all the font configurations for different restaurant styles. Simply copy and paste the desired option into your `layout.tsx` file.

## Current: Modern & Sophisticated ✓

**Features:** Clean, elegant, highly readable
**Best for:** Fine dining, modern restaurants, professional establishments

```tsx
import { Cormorant_Garamond, Noto_Serif_JP, Noto_Serif_KR } from 'next/font/google';

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const fontMap = {
  en: cormorantGaramond,
  vi: cormorantGaramond,
  ja: notoSerifJP,
  ko: notoSerifKR,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || cormorantGaramond;
```

## Option 2: Warm & Inviting

**Features:** Friendly, approachable, cozy feeling
**Best for:** Cafes, bistros, family restaurants, casual dining

```tsx
import { Crimson_Text, Sawarabi_Mincho, Gowun_Dodum } from 'next/font/google';

const crimsonText = Crimson_Text({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
});

const sawarabiMincho = Sawarabi_Mincho({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
});

const gowunDodum = Gowun_Dodum({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
});

const fontMap = {
  en: crimsonText,
  vi: crimsonText,
  ja: sawarabiMincho,
  ko: gowunDodum,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || crimsonText;
```

## Option 3: Luxury & Fine Dining

**Features:** Refined, classical, premium feel
**Best for:** High-end restaurants, wine bars, upscale establishments

```tsx
import { Libre_Baskerville, Zen_Old_Mincho, Gowun_Batang } from 'next/font/google';

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

const zenOldMincho = Zen_Old_Mincho({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

const gowunBatang = Gowun_Batang({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

const fontMap = {
  en: libreBaskerville,
  vi: libreBaskerville,
  ja: zenOldMincho,
  ko: gowunBatang,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || libreBaskerville;
```

## Option 4: Creative & Artisan

**Features:** Unique, handcrafted feel, artistic
**Best for:** Artisan cafes, creative spaces, specialty restaurants

```tsx
import { Lora, Klee_One, Stylish } from 'next/font/google';

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const kleeOne = Klee_One({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-sans',
});

const stylish = Stylish({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
});

const fontMap = {
  en: lora,
  vi: lora,
  ja: kleeOne,
  ko: stylish,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || lora;
```

## Option 5: Classic Restaurant

**Features:** Traditional, timeless, professional
**Best for:** Traditional restaurants, steakhouses, classic establishments

```tsx
import { Playfair_Display, Shippori_Mincho, Nanum_Myeongjo } from 'next/font/google';

const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

const fontMap = {
  en: playfairDisplay,
  vi: playfairDisplay,
  ja: shipporiMincho,
  ko: nanumMyeongjo,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || playfairDisplay;
```

## Option 6: Modern Sans-Serif

**Features:** Clean, minimal, contemporary
**Best for:** Modern fast-casual, tech-forward restaurants, minimalist design

```tsx
import { Inter, Noto_Sans_JP, Noto_Sans_KR } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const fontMap = {
  en: inter,
  vi: inter,
  ja: notoSansJP,
  ko: notoSansKR,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || inter;
```

## Option 7: Elegant Script-Like

**Features:** Sophisticated, flowing, elegant
**Best for:** Upscale cafes, romantic restaurants, wine bars

```tsx
import { Dancing_Script, Yuji_Syuku, Cute_Font } from 'next/font/google';

const dancingScript = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const yujiSyuku = Yuji_Syuku({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
});

const cuteFont = Cute_Font({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
});

const fontMap = {
  en: dancingScript,
  vi: dancingScript,
  ja: yujiSyuku,
  ko: cuteFont,
};

// In the function:
const font = fontMap[params.locale as keyof typeof fontMap] || dancingScript;
```

## How to Switch Fonts

1. Copy the desired font configuration from above
2. Replace the font imports in your `layout.tsx` file
3. Replace the font configurations
4. Update the `fontMap` object
5. Update the fallback font in the function

## Testing Tips

- Test with actual Vietnamese text to see how the fonts render
- Check font loading performance - some fonts may be larger than others
- Consider your restaurant's brand identity when choosing
- Test on different devices and screen sizes
- Make sure the fonts are readable at different sizes (especially for menu items)

## Font Characteristics

- **Serif fonts** (like Cormorant Garamond, Playfair Display): More traditional, elegant, good for fine dining
- **Sans-serif fonts** (like Inter, Noto Sans): More modern, clean, good for contemporary restaurants
- **Script fonts** (like Dancing Script): More decorative, use sparingly for special occasions

## Performance Notes

- Google Fonts are optimized for web performance
- Using `variable` fonts provides better performance than multiple weights
- Consider preloading fonts for better initial page load
- Each additional font family adds to the bundle size
