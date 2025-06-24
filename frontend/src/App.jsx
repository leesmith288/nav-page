import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Globe, Loader2, ExternalLink, Grid, Save, AlertCircle, Image, RefreshCw, Command } from 'lucide-react';
import pinyin from 'pinyin';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// API configuration - Update this with your worker URL
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8787/api' 
  : 'https://nav-page-worker.baidu2.workers.dev/api';

// Convert Chinese to Pinyin for search
const toPinyin = (text) => {
  try {
    const py = pinyin(text, {
      style: pinyin.STYLE_NORMAL,
      heteronym: false
    });
    return py.flat().join('');
  } catch {
    return text;
  }
};

function App() {
  const [tiles, setTiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [refreshingFavicons, setRefreshingFavicons] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load tiles from API
  useEffect(() => {
    loadTiles();
  }, []);

  const loadTiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tiles`);
      if (!response.ok) throw new Error('Failed to load tiles');
      const data = await response.json();
      setTiles(data.tiles || []);
    } catch (err) {
      setError('无法加载磁贴数据');
      console.error('Error loading tiles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save tiles to API
  const saveTiles = async (newTiles) => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/tiles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiles: newTiles })
      });
      if (!response.ok) throw new Error('Failed to save tiles');
      setTiles(newTiles);
    } catch (err) {
      setError('无法保存磁贴数据');
      console.error('Error saving tiles:', err);
    } finally {
      setSaving(false);
    }
  };

  // Refresh all favicons
  const refreshFavicons = async () => {
    setRefreshingFavicons(true);
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
    setRefreshingFavicons(false);
  };

  // Filter tiles based on search
  const filteredTiles = tiles.filter(tile => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const namePinyin = toPinyin(tile.name).toLowerCase();
    const nameMatch = tile.name.toLowerCase().includes(searchLower) || namePinyin.includes(searchLower);
    const urlMatch = tile.url.toLowerCase().includes(searchLower);
    return nameMatch || urlMatch;
  });

  // Keyboard shortcuts for opening tiles 1-9
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
      
      // Number keys 1-9 to open tiles
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = parseInt(e.key) - 1;
        if (filteredTiles[index]) {
          window.open(filteredTiles[index].url, '_blank');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [filteredTiles]);

  // Handle drag end for @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tiles.findIndex((tile) => tile.id === active.id);
      const newIndex = tiles.findIndex((tile) => tile.id === over.id);
      
      const newTiles = arrayMove(tiles, oldIndex, newIndex);
      saveTiles(newTiles);
    }
  };

  // Add/Edit tile
  const handleSaveTile = (tileData) => {
    let newTiles;
    if (editingTile) {
      newTiles = tiles.map(t => t.id === editingTile.id ? { ...t, ...tileData } : t);
    } else {
      const newTile = {
        id: Date.now().toString(),
        ...tileData
      };
      newTiles = [...tiles, newTile];
    }
    saveTiles(newTiles);
    setIsAddModalOpen(false);
    setEditingTile(null);
  };

  // Delete tile
  const handleDeleteTile = (id) => {
    if (confirm('确定要删除这个磁贴吗？')) {
      const newTiles = tiles.filter(t => t.id !== id);
      saveTiles(newTiles);
    }
  };

  // Export configuration
  const handleExport = () => {
    const dataStr = JSON.stringify({ tiles }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `navigation-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import configuration
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tiles && Array.isArray(data.tiles)) {
          saveTiles(data.tiles);
        } else {
          alert('无效的配置文件格式');
        }
      } catch (error) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Helper function to determine if a color is dark
  const isColorDark = (color, darkness = 0) => {
    // Convert hex to RGB
    const rgb = hexToRgb(color);
    if (!rgb) return false;
    
    // Adjust for darkness level
    const adjustedR = rgb.r * (1 - darkness / 100) + 255 * (darkness / 100);
    const adjustedG = rgb.g * (1 - darkness / 100) + 255 * (darkness / 100);
    const adjustedB = rgb.b * (1 - darkness / 100) + 255 * (darkness / 100);
    
    // Calculate luminance
    const luminance = (0.299 * adjustedR + 0.587 * adjustedG + 0.114 * adjustedB) / 255;
    return luminance < 0.5;
  };

  // Command Palette Component
  const CommandPalette = () => {
    const [paletteSearch, setPaletteSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    const paletteFilteredTiles = tiles.filter(tile => {
      if (!paletteSearch) return true;
      const searchLower = paletteSearch.toLowerCase();
      const namePinyin = toPinyin(tile.name).toLowerCase();
      const nameMatch = tile.name.toLowerCase().includes(searchLower) || namePinyin.includes(searchLower);
      const urlMatch = tile.url.toLowerCase().includes(searchLower);
      return nameMatch || urlMatch;
    });

    useEffect(() => {
      if (isCommandPaletteOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    useEffect(() => {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsCommandPaletteOpen(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < paletteFilteredTiles.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (paletteFilteredTiles[selectedIndex]) {
            window.open(paletteFilteredTiles[selectedIndex].url, '_blank');
            setIsCommandPaletteOpen(false);
          }
        }
      };

      if (isCommandPaletteOpen) {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }
    }, [isCommandPaletteOpen, paletteFilteredTiles, selectedIndex]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [paletteSearch]);

    if (!isCommandPaletteOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20">
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Command className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="输入搜索或按 ESC 退出..."
                className="w-full pl-10 pr-4 py-3 text-lg focus:outline-none"
              />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {paletteFilteredTiles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                没有找到匹配的磁贴
              </div>
            ) : (
              <div className="py-2">
                {paletteFilteredTiles.map((tile, index) => (
                  <div
                    key={tile.id}
                    className={`px-4 py-3 cursor-pointer flex items-center gap-3 ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      window.open(tile.url, '_blank');
                      setIsCommandPaletteOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ backgroundColor: `${tile.color}15` }}
                    >
                      <FaviconImage 
                        url={tile.url} 
                        name={tile.name} 
                        color={tile.color}
                        customIcon={tile.customIcon}
                        cachedFavicon={tile.cachedFavicon}
                        size="small"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{tile.name}</div>
                      <div className="text-sm text-gray-500 truncate">{tile.url}</div>
                    </div>
                    {index < 9 && (
                      <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>↑↓ 导航 · Enter 打开 · ESC 退出</span>
            <span>Ctrl+K 打开命令面板</span>
          </div>
        </div>
      </div>
    );
  };

  // Sortable Tile Component
  function SortableTile({ tile, index }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: tile.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`relative group cursor-move ${isDragging ? '' : 'transition-all duration-200'}`}
      >
        <div
          className={`block bg-white rounded-xl shadow-sm hover:shadow-lg p-4 h-32 relative overflow-hidden group ${isDragging ? '' : 'transition-all duration-300'}`}
          style={(() => {
            if (!tile.darkness || tile.darkness === 0) {
              return {
                borderTop: `4px solid ${tile.color}`,
              };
            }
            
            const rgb = hexToRgb(tile.color);
            if (rgb) {
              const alpha = tile.darkness / 100;
              return {
                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
                borderTop: `4px solid ${tile.color}`,
              };
            }
            
            return {
              borderTop: `4px solid ${tile.color}`,
            };
          })()}
          onClick={(e) => {
            if (!e.target.closest('button') && !e.ctrlKey && !e.metaKey) {
              window.open(tile.url, '_blank');
            }
          }}
        >
          {/* Keyboard shortcut indicator */}
          {index < 9 && (
            <div className="absolute top-2 left-2 w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {index + 1}
            </div>
          )}

          {/* External link indicator */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </div>
          
          {/* Large Favicon */}
          <div className="flex items-center justify-center mb-3">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: `${tile.color}15` }}
            >
              <FaviconImage 
                url={tile.url} 
                name={tile.name} 
                color={tile.color}
                customIcon={tile.customIcon}
                cachedFavicon={tile.cachedFavicon}
              />
            </div>
          </div>
          
          {/* Title with dynamic color based on background darkness */}
          <h3 
            className={`text-sm font-medium text-center truncate px-1 ${
              tile.darkness > 50 ? 'text-white' : 'text-gray-800'
            }`}
          >
            {tile.name}
          </h3>
        </div>
        
        {/* Edit/Delete Buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditingTile(tile);
              setIsAddModalOpen(true);
            }}
            className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteTile(tile.id);
            }}
            className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

  // Enhanced favicon component with custom icon support
  const FaviconImage = ({ url, name, color, customIcon, cachedFavicon, size = 'normal' }) => {
    const [currentSrc, setCurrentSrc] = useState(0);
    const [hasError, setHasError] = useState(false);
    
    const domain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    })();

    const sizeClass = size === 'small' ? 'w-6 h-6' : 'w-12 h-12';
    const iconSizeClass = size === 'small' ? 'w-5 h-5' : 'w-10 h-10';

    // If custom icon is provided, use it directly
    if (customIcon) {
      return (
        <img 
          src={customIcon}
          alt={name}
          className={`${sizeClass} object-contain`}
          onError={() => setHasError(true)}
          loading="lazy"
          style={{
            WebkitImageRendering: '-webkit-optimize-contrast',
            imageRendering: 'crisp-edges',
          }}
        />
      );
    }

    // If cached favicon exists, try it first
    const baseFaviconSources = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://${domain}/favicon.ico`,
    ];

    // Put cached favicon at the beginning if it exists
    const faviconSources = cachedFavicon 
      ? [cachedFavicon, ...baseFaviconSources.filter(src => src !== cachedFavicon)]
      : baseFaviconSources;

    const handleError = () => {
      if (currentSrc < faviconSources.length - 1) {
        setCurrentSrc(currentSrc + 1);
      } else {
        setHasError(true);
      }
    };

    if (hasError || !domain) {
      return (
        <Globe 
          className={iconSizeClass}
          style={{ color: color }}
        />
      );
    }

    return (
      <img 
        src={faviconSources[currentSrc]}
        alt={name}
        className={`${sizeClass} object-contain`}
        onError={handleError}
        loading="lazy"
        style={{
          WebkitImageRendering: '-webkit-optimize-contrast',
          imageRendering: 'crisp-edges',
        }}
      />
    );
  };

  // Tile Modal Component
  const TileModal = () => {
    const [formData, setFormData] = useState(
      editingTile || { name: '', url: '', color: '#BE002F', darkness: 0, customIcon: '' }
    );
    const [showCustomIcon, setShowCustomIcon] = useState(!!formData.customIcon);
    const [customColor, setCustomColor] = useState('');
    const [colorError, setColorError] = useState('');

    // Default colors
    const defaultColors = [
      '#BE002F', // Red
      '#FF0097', // Pink
      '#FA8C35', // Orange
      '#D9B611', // Yellow
      '#2ADD9C', // Green
    ];

    // Validate hex color
    const isValidHexColor = (color) => {
      return /^#[0-9A-F]{6}$/i.test(color);
    };

    // Handle custom color input
    const handleCustomColorSubmit = () => {
      const cleanedColor = customColor.startsWith('#') ? customColor : `#${customColor}`;
      
      if (isValidHexColor(cleanedColor)) {
        setFormData({ ...formData, color: cleanedColor.toUpperCase() });
        setCustomColor('');
        setColorError('');
      } else {
        setColorError('请输入有效的颜色代码，如 #9B4400');
      }
    };

    // Generate background style based on darkness
    const getPreviewStyle = () => {
      if (!formData.darkness || formData.darkness === 0) {
        return {
          backgroundColor: 'white',
          borderTop: `4px solid ${formData.color}`,
        };
      }
      
      const alpha = formData.darkness / 100;
      const rgb = hexToRgb(formData.color);
      if (rgb) {
        return {
          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
          borderTop: `4px solid ${formData.color}`,
        };
      }
      
      return {
        backgroundColor: 'white',
        borderTop: `4px solid ${formData.color}`,
      };
    };

    // Helper to convert hex to RGB
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingTile ? '编辑磁贴' : '添加新磁贴'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：Google"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">网址</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
              <div className="space-y-3">
                {/* Default colors */}
                <div className="flex gap-2 mb-3">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition-all border-2 ${
                        formData.color === color 
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 border-gray-300' 
                          : 'hover:scale-105 border-transparent'
                      }`}
                      style={{ 
                        backgroundColor: color,
                      }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom color input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setColorError('');
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomColorSubmit();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入颜色代码，如 #9B4400"
                    />
                    <button
                      onClick={handleCustomColorSubmit}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      应用
                    </button>
                  </div>
                  {colorError && (
                    <p className="text-sm text-red-500">{colorError}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>当前颜色：</span>
                    <div 
                      className="w-6 h-6 rounded border border-gray-300" 
                      style={{ backgroundColor: formData.color }}
                    />
                    <span className="font-mono">{formData.color}</span>
                  </div>
                </div>
                
                {/* Darkness slider */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>背景深度</span>
                    <span>{formData.darkness || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.darkness || 0}
                    onChange={(e) => setFormData({ ...formData, darkness: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #e5e7eb 0%, ${formData.color} ${formData.darkness || 0}%, #e5e7eb ${formData.darkness || 0}%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0% (仅顶部)</span>
                    <span>100% (全彩)</span>
                  </div>
                </div>
                
                {/* Preview */}
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">预览效果：</p>
                  <div 
                    className="w-24 h-24 rounded-xl shadow-sm mx-auto transition-all duration-300"
                    style={getPreviewStyle()}
                  >
                    <div className="h-full flex items-center justify-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">自定义图标</label>
                <button
                  type="button"
                  onClick={() => setShowCustomIcon(!showCustomIcon)}
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Image className="w-4 h-4" />
                  {showCustomIcon ? '隐藏' : '设置'}
                </button>
              </div>
              
              {showCustomIcon && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={formData.customIcon || ''}
                    onChange={(e) => setFormData({ ...formData, customIcon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/icon.png"
                  />
                  <p className="text-xs text-gray-500">
                    输入图标的完整URL地址，支持 PNG、JPG、SVG 等格式
                  </p>
                  {formData.customIcon && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                      <span className="text-sm text-gray-600">预览：</span>
                      <img 
                        src={formData.customIcon} 
                        alt="Icon preview" 
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <span className="hidden text-sm text-red-500">图标加载失败</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleSaveTile(formData)}
              disabled={!formData.name || !formData.url}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingTile(null);
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" style={{ backgroundColor: '#F8FAFB' }}>
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索名称或拼音..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">添加</span>
              </button>
              
              <button
                onClick={refreshFavicons}
                disabled={refreshingFavicons}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="刷新所有图标"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingFavicons ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-sm">刷新图标</span>
              </button>
              
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="导出配置"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <label className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="导入配置">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {saving && (
                <div className="flex items-center gap-2 text-sm text-blue-600 opacity-60">
                  <Save className="w-4 h-4" />
                  <span className="text-xs">已保存</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tiles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredTiles.length === 0 ? (
          <div className="text-center py-12">
            <Grid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {searchTerm ? '没有找到匹配的磁贴' : '还没有添加任何磁贴'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                添加第一个磁贴
              </button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTiles.map(tile => tile.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredTiles.map((tile, index) => (
                  <SortableTile
                    key={tile.id}
                    tile={tile}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-sm text-gray-600 opacity-90">
        <div className="flex items-center gap-2 mb-1">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1-9</kbd>
          <span>快速打开磁贴</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+K</kbd>
          <span>搜索并启动</span>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && <TileModal />}
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Footer */}
      <div className="text-center py-4 text-sm text-gray-500">
        
      </div>
    </div>
  );
}

export default App;
