import { useUIStore } from '../uiStore';

export function useDisplaySettings() {
  const { displayMode, setDisplayMode } = useUIStore();
  
  return {
    displayMode,
    setDisplayMode,
  };
}
