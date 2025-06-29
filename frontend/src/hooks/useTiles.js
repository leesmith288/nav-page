import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function useTiles() {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load tiles from API
  const loadTiles = async () => {
    try {
      setLoading(true);
      const data = await api.loadTiles();
      setTiles(data);
    } catch (err) {
      setError('无法加载磁贴数据');
      console.error('Error loading tiles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save tiles to API
  const saveTiles = async (newTiles, isOptimistic = false) => {
    // If this is an optimistic update, update state immediately
    if (isOptimistic) {
      setTiles(newTiles);
    }
    
    try {
      setSaving(true);
      await api.saveTiles(newTiles);
      
      // Only update state if this wasn't an optimistic update
      if (!isOptimistic) {
        setTiles(newTiles);
      }
    } catch (err) {
      // If this was an optimistic update and it failed, rollback
      if (isOptimistic) {
        // Reload from server to get the correct state
        loadTiles();
        setError('保存失败，已恢复到之前的状态');
      } else {
        setError('无法保存磁贴数据');
      }
      console.error('Error saving tiles:', err);
    } finally {
      setSaving(false);
    }
  };

  // Refresh all favicons
  const refreshFavicons = async () => {
    const updatedTiles = await Promise.all(
      tiles.map(async (tile) => {
        if (tile.customIcon) return tile; // Skip tiles with custom icons
        
        const domain = (() => {
          try {
            return new URL(tile.url).hostname;
          } catch {
            return '';
          }
        })();

        if (!domain) return tile;

        // Test favicon sources in order
        const faviconSources = [
          `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
          `https://${domain}/favicon.ico`,
        ];

        for (const src of faviconSources) {
          try {
            const img = new Image();
            img.src = src;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              setTimeout(reject, 3000); // 3s timeout
            });
            
            // If successful, save this favicon URL
            return { ...tile, cachedFavicon: src };
          } catch {
            continue;
          }
        }
        
        return tile; // Return unchanged if no favicon found
      })
    );

    await saveTiles(updatedTiles);
  };

  useEffect(() => {
    loadTiles();
  }, []);

  return {
    tiles,
    setTiles,
    loading,
    saving,
    error,
    setError,
    saveTiles,
    refreshFavicons,
    loadTiles
  };
}
