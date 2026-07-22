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
