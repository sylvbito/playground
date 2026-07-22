const KEY = 'orbit.appearance.v1';

export function createSettingsStore() {
  let confirmed = null;
  let queue = Promise.resolve();
  return {
    read() {
      try { confirmed = JSON.parse(localStorage.getItem(KEY)); } catch { confirmed = null; }
      return confirmed;
    },
    write(settings) {
      const previous = confirmed;
      queue = queue.then(async () => {
        try {
          localStorage.setItem(KEY, JSON.stringify(settings));
          confirmed = structuredClone(settings);
          return confirmed;
        } catch (error) {
          confirmed = previous;
          throw error;
        }
      });
      return queue;
    },
    clear() { localStorage.removeItem(KEY); confirmed = null; },
  };
}
