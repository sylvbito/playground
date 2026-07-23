const query = window.matchMedia('(prefers-color-scheme: dark)');
export function getSystemVariant() { return query.matches ? 'dark' : 'light'; }
export function subscribeSystemVariant(callback) {
  const listener = event => callback(event.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
