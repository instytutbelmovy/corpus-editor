import { useUIStore } from '../uiStore';

export function useDisplaySettings() {
  const { displayMode, setDisplayMode, isSavingError } = useUIStore();

  return {
    displayMode,
    setDisplayMode,
    isSavingError,
  };
}
