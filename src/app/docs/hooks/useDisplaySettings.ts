import { useState, useEffect } from 'react';

export type DisplayMode = 'full' | 'compact';

interface DisplaySettings {
  mode: DisplayMode;
}

const STORAGE_KEY = 'editing-panel-display-settings';

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    if (typeof window === 'undefined') {
      return { mode: 'full' };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Памылка загрузкі налад адлюстравання:', error);
    }

    return { mode: 'full' };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn('Памылка захавання налад адлюстравання:', error);
      }
    }
  }, [settings]);

  const setDisplayMode = (mode: DisplayMode) => {
    setSettings(prev => ({ ...prev, mode }));
  };

  return {
    displayMode: settings.mode,
    setDisplayMode,
  };
}
