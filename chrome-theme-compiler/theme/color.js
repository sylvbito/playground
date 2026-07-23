export function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function mix(first, second, amount) {
  const a = hexToRgb(first), b = hexToRgb(second);
  return rgbToHex({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });
}

export function rgbToOklch(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = value => {
    value /= 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [red, green, blue] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const axisA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const axisB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: lightness, c: Math.hypot(axisA, axisB), h: Math.atan2(axisB, axisA) };
}

export function oklchToHex(lightness, chroma, hue) {
  let safeChroma = Math.max(0, chroma);
  for (let attempt = 0; attempt < 28; attempt += 1, safeChroma *= 0.9) {
    const axisA = safeChroma * Math.cos(hue), axisB = safeChroma * Math.sin(hue);
    const l = lightness + 0.3963377774 * axisA + 0.2158037573 * axisB;
    const m = lightness - 0.1055613458 * axisA - 0.0638541728 * axisB;
    const s = lightness - 0.0894841775 * axisA - 1.291485548 * axisB;
    const red = 4.0767416621 * l ** 3 - 3.3077115913 * m ** 3 + 0.2309699292 * s ** 3;
    const green = -1.2684380046 * l ** 3 + 2.6097574011 * m ** 3 - 0.3413193965 * s ** 3;
    const blue = -0.0041960863 * l ** 3 - 0.7034186147 * m ** 3 + 1.707614701 * s ** 3;
    if (Math.min(red, green, blue) >= 0 && Math.max(red, green, blue) <= 1) {
      const gamma = value => 255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);
      return rgbToHex({ r: gamma(red), g: gamma(green), b: gamma(blue) });
    }
  }
  return lightness > 0.55 ? '#FFFFFF' : '#000000';
}

export function tone(hex, lightness, chromaFactor = 1, hueOffset = 0) {
  const point = rgbToOklch(hex);
  return oklchToHex(Math.max(0.02, Math.min(0.99, lightness)), point.c * chromaFactor, point.h + hueOffset);
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const values = [r, g, b].map(value => {
    value /= 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

export function contrast(first, second) {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

export function bestInk(background) {
  return contrast('#FFFFFF', background) >= contrast('#000000', background) ? '#FFFFFF' : '#000000';
}

export function readableForeground(seed, background, target = 4.5) {
  if (contrast(seed, background) >= target) return seed;
  const destination = bestInk(background);
  for (let amount = 0.04; amount <= 1; amount += 0.04) {
    const candidate = mix(seed, destination, amount);
    if (contrast(candidate, background) >= target) return candidate;
  }
  return destination;
}
