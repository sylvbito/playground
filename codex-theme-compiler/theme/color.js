const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));

export function hexToRgb(hex) {
  if (!isHex(hex)) throw new Error(`Invalid six-digit hex colour: ${hex}`);
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const part = value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0').toUpperCase();
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function mix(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = clamp(amount);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrast(a, b) {
  const high = Math.max(relativeLuminance(a), relativeLuminance(b));
  const low = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (high + 0.05) / (low + 0.05);
}

export function bestInk(background) {
  return contrast('#000000', background) >= contrast('#FFFFFF', background) ? '#000000' : '#FFFFFF';
}

export function readableForeground(foreground, background, target = 4.5) {
  if (contrast(foreground, background) >= target) return foreground.toUpperCase();
  const endpoint = bestInk(background);
  if (contrast(endpoint, background) < target) return endpoint;
  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index += 1) {
    const midpoint = (low + high) / 2;
    if (contrast(mix(foreground, endpoint, midpoint), background) >= target) high = midpoint;
    else low = midpoint;
  }
  return mix(foreground, endpoint, high);
}
