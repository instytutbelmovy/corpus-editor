// Мінімальны localStorage для testEnvironment: node - каб zustand `persist`
// (uiStore) не сыпаў папярэджаньнямі ў тэстах.
const memoryStorage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, String(value));
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
    clear: () => memoryStorage.clear(),
  },
  configurable: true,
});
