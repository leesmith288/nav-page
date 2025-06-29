import { useEffect } from 'react';

export function useKeyboardShortcuts({ 
  filteredTiles, 
  viewMode, 
  setIsCommandPaletteOpen 
}) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Ctrl/Cmd + K for command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }
      
      // Number keys 1-9 to open tiles (only in grid view)
      if (viewMode === 'grid' && e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = parseInt(e.key) - 1;
        if (filteredTiles[index]) {
          window.open(filteredTiles[index].url, '_blank');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [filteredTiles, viewMode, setIsCommandPaletteOpen]);
}
