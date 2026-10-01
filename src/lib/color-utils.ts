/**
 * Professional Color Conversion Utilities
 * Supports hex, RGB, and HSL color formats with proper conversion
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const sanitized = hex.replace("#", "");
  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.padStart(2, "0");
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB string (e.g., "255 128 64") to hex
 */
export function rgbStringToHex(rgbString: string): string {
  const parts = rgbString.split(" ").map(p => parseInt(p.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) return "#000000";
  return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
}

/**
 * Convert hex to RGB string (e.g., "255 128 64")
 */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Convert HSL string (e.g., "210 70% 50%") to hex
 */
export function hslStringToHex(hslString: string): string {
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return "#000000";

  const hsl: HSL = {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3]),
  };

  const rgb = hslToRgb(hsl);
  return rgbToHex(rgb);
}

/**
 * Convert hex to HSL string (e.g., "210 70% 50%")
 */
export function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Convert RGB string to HSL string
 */
export function rgbStringToHslString(rgbString: string): string {
  const parts = rgbString.split(" ").map(p => parseInt(p.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) return "0 0% 0%";

  const hsl = rgbToHsl({ r: parts[0], g: parts[1], b: parts[2] });
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.min(100, hsl.l + percent);
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, hsl.l - percent);
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Generate color palette from base color
 */
export function generatePalette(baseHex: string): string[] {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb);

  return [
    rgbToHex(hslToRgb({ ...hsl, l: 95 })), // Lightest
    rgbToHex(hslToRgb({ ...hsl, l: 85 })),
    rgbToHex(hslToRgb({ ...hsl, l: 70 })),
    rgbToHex(hslToRgb({ ...hsl, l: 50 })), // Base
    rgbToHex(hslToRgb({ ...hsl, l: 35 })),
    rgbToHex(hslToRgb({ ...hsl, l: 20 })), // Darkest
  ];
}
