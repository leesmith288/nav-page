import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Globe, Loader2, ExternalLink, Grid, Save, AlertCircle, Image, RefreshCw, Command, Layers, Palette, X, Check, Settings } from 'lucide-react';
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
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  
  const adjustedR = rgb.r * (1 - darkness / 100) + 255 * (darkness / 100);
  const adjustedG = rgb.g * (1 - darkness / 100) + 255 * (darkness / 100);
  const adjustedB = rgb.b * (1 - darkness / 100) + 255 * (darkness / 100);
  
  const luminance = (0.299 * adjustedR + 0.587 * adjustedG + 0.114 * adjustedB) / 255;
  return luminance < 0.5;
};

// Helper function to convert hex to hue
const hexToHue = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (diff === 0) return 0;
  
  let hue;
  if (max === r) {
    hue = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    hue = ((b - r) / diff + 2) / 6;
  } else {
    hue = ((r - g) / diff + 4) / 6;
  }
  
  return hue * 360;
};

// Color Filter Component
const ColorFilter = ({ tiles, activeColors, onColorToggle, onReset, colorMeanings }) => {
  // Group tiles by color and count
  const colorGroups = tiles.reduce((acc, tile) => {
    const color = tile.color.toUpperCase();
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});

  const isAllSelected = activeColors.length === 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/50 backdrop-blur-sm rounded-lg">
      {/* All filter */}
      <button
        onClick={onReset}
        className={`
          px-3 py-1.5 rounded-full text-sm font-medium transition-all
          ${isAllSelected 
            ? 'bg-gray-900 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
      >
        全部
      </button>

      <div className="w-px h-6 bg-gray-300" />

      {/* Color filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(colorGroups).map(([color, count]) => {
          const isActive = activeColors.includes(color);
          const meaning = colorMeanings[color];
          
          return (
            <button
              key={color}
              onClick={() => onColorToggle(color)}
              className={`
                group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
                transition-all duration-200 transform
                ${isActive 
                  ? 'scale-105 shadow-lg' 
                  : 'hover:scale-105 hover:shadow-md'
                }
              `}
              style={{
                backgroundColor: isActive ? color : `${color}20`,
                border: `2px solid ${isActive ? color : 'transparent'}`,
              }}
            >
              {/* Color dot */}
              <div 
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: color }}
              />
              
              {/* Count */}
              <span 
                className={`
                  text-xs font-medium
                  ${isActive ? 'text-white' : 'text-gray-700'}
                `}
                style={{
                  color: isActive && isColorDark(color) ? 'white' : 
                         isActive ? 'black' : 
                         undefined
                }}
              >
                {count}
              </span>

              {/* Tooltip */}
              {meaning && (
                <div className="
                  absolute -top-8 left-1/2 transform -translate-x-1/2
                  bg-gray-900 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity
                  pointer-events-none whitespace-nowrap z-10
                ">
                  {meaning.emoji} {meaning.name}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeColors.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <span className="text-sm text-gray-500">
            {activeColors.length} 个颜色筛选
          </span>
        </>
      )}
    </div>
  );
};

// View Mode Toggle Component
const ViewModeToggle = ({ mode, onChange }) => {
  const modes = [
    { id: 'grid', icon: Grid, label: '网格视图' },
    { id: 'grouped', icon: Layers, label: '分组视图' },
    { id: 'rainbow', icon: Palette, label: '彩虹视图' },
  ];

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md
            transition-all duration-200
            ${mode === id 
              ? 'bg-white shadow-sm text-gray-900' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
};

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

// Grouped View Component
const GroupedTileView = ({ tiles, onEditTile, onDeleteTile, colorMeanings }) => {
  // Group tiles by color
  const colorGroups = tiles.reduce((acc, tile) => {
    const color = tile.color.toUpperCase();
    if (!acc[color]) acc[color] = [];
    acc[color].push(tile);
    return acc;
  }, {});

  // Sort groups by number of tiles (popular colors first)
  const sortedGroups = Object.entries(colorGroups)
    .sort(([, a], [, b]) => b.length - a.length);

  return (
    <div className="space-y-8">
      {sortedGroups.map(([color, groupTiles]) => {
        const info = colorMeanings[color];

        return (
          <div key={color} className="relative animate-fadeIn">
            {/* Section Header */}
            <div className="mb-4 flex items-center gap-3">
              {/* Color indicator line */}
              <div 
                className="h-1 w-12 rounded-full"
                style={{ backgroundColor: color }}
              />
              
              {/* Section title */}
              <div className="flex items-center gap-2">
                {info && (
                  <>
                    <span className="text-2xl">{info.emoji}</span>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {info.name}
                    </h3>
                  </>
                )}
                <span className="text-sm text-gray-500 font-mono">
                  {color} ({groupTiles.length})
                </span>
              </div>
              
              {/* Description */}
              {info && info.description && (
                <span className="text-sm text-gray-500 hidden md:inline">
                  {info.description}
                </span>
              )}
            </div>

            {/* Tiles Grid for this color */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {groupTiles.map((tile, index) => (
                <div
                  key={tile.id}
                  className="relative group animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className="block bg-white rounded-xl shadow-sm hover:shadow-lg p-4 h-32 relative overflow-hidden group transition-all duration-300 cursor-pointer"
                    style={{
                      borderTop: `4px solid ${tile.color}`,
                      ...(tile.darkness > 0 && {
                        backgroundColor: (() => {
                          const rgb = hexToRgb(tile.color);
                          if (rgb) {
                            const alpha = tile.darkness / 100;
                            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
                          }
                          return 'white';
                        })()
                      })
                    }}
                    onClick={() => window.open(tile.url, '_blank')}
                  >
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
                    
                    <h3 className={`text-sm font-medium text-center truncate px-1 ${
                      tile.darkness > 50 ? 'text-white' : 'text-gray-800'
                    }`}>
                      {tile.name}
                    </h3>

                    {/* Edit/Delete buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTile(tile);
                        }}
                        className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTile(tile.id);
                        }}
                        className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Rainbow View Component (tiles sorted by hue)
const RainbowTileView = ({ tiles, onEditTile, onDeleteTile }) => {
  // Convert hex to HSL and sort by hue
  const sortedTiles = [...tiles].sort((a, b) => {
    const hueA = hexToHue(a.color);
    const hueB = hexToHue(b.color);
    return hueA - hueB;
  });

  return (
    <div className="relative">
      {/* Rainbow gradient background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="h-full w-full rounded-lg" style={{
          background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #0000ff, #8800ff)'
        }} />
      </div>
      
      {/* Tiles in rainbow order */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 relative">
        {sortedTiles.map((tile, index) => (
          <div
            key={tile.id}
            className="relative group animate-slideIn"
            style={{ 
              animationDelay: `${index * 30}ms`,
              animationFillMode: 'backwards'
            }}
          >
            <div
              className="block bg-white rounded-xl shadow-sm hover:shadow-lg p-4 h-32 relative overflow-hidden group transition-all duration-300 cursor-pointer"
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

              {/* Edit/Delete Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditTile(tile);
                  }}
                  className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteTile(tile.id);
                  }}
                  className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Color Picker without Smart Suggestions
const EnhancedColorPicker = ({ formData, setFormData, existingTiles, colorMeanings }) => {
  const [customColor, setCustomColor] = useState('');
  const [colorError, setColorError] = useState('');
  
  // Get all unique colors from existing tiles
  const usedColors = [...new Set(existingTiles.map(tile => tile.color.toUpperCase()))];
  
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
  
  return (
    <div>
      {/* All available colors from tiles */}
      <div className="space-y-3">
        {usedColors.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {usedColors.map(color => {
              const colorInfo = colorMeanings[color];
              return (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`relative group w-10 h-10 rounded-lg transition-all border-2 ${
                    formData.color === color 
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 border-gray-300' 
                      : 'hover:scale-105 border-transparent'
                  }`}
                  style={{ 
                    backgroundColor: color,
                  }}
                  title={colorInfo?.name || color}
                >
                  {/* Show color code on hover */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-mono text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {color}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom color input */}
        <div className="space-y-2 mt-8">
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
            style={(() => {
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
            })()}
          >
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tile Modal Component
const TileModal = ({ isOpen, onClose, editingTile, onSave, existingTiles, colorMeanings }) => {
  const [formData, setFormData] = useState(
    editingTile || { name: '', url: '', color: '#BE002F', darkness: 0, customIcon: '' }
  );
  const [showCustomIcon, setShowCustomIcon] = useState(!!formData.customIcon);

  useEffect(() => {
    if (editingTile) {
      setFormData(editingTile);
      setShowCustomIcon(!!editingTile.customIcon);
    } else {
      setFormData({ name: '', url: '', color: '#BE002F', darkness: 0, customIcon: '' });
      setShowCustomIcon(false);
    }
  }, [editingTile]);

  if (!isOpen) return null;

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
            <EnhancedColorPicker
              formData={formData}
              setFormData={setFormData}
              existingTiles={existingTiles}
              colorMeanings={colorMeanings}
            />
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
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.url}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            保存
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

// Color Meanings Modal
const ColorMeaningsModal = ({ isOpen, onClose, colorMeanings, onSave, tiles }) => {
  const [meanings, setMeanings] = useState(colorMeanings);
  const [editingColor, setEditingColor] = useState(null);
  const [newMeaning, setNewMeaning] = useState({ name: '', emoji: '', description: '' });
  
  // Sync local state with props when modal opens or colorMeanings change
  useEffect(() => {
    setMeanings(colorMeanings);
  }, [colorMeanings, isOpen]);
  
  // Get all unique colors from tiles
  const usedColors = [...new Set(tiles.map(tile => tile.color.toUpperCase()))];
  
  const handleSave = (color) => {
    const updatedMeanings = {
      ...colorMeanings,  // Start with all existing meanings from props
      [color]: { ...newMeaning }  // Add/update only the specific color
    };
    setMeanings(updatedMeanings);
    onSave(updatedMeanings);
    setEditingColor(null);
    setNewMeaning({ name: '', emoji: '', description: '' });
  };
  
  const handleDelete = (color) => {
    const updatedMeanings = { ...colorMeanings };  // Start with existing meanings
    delete updatedMeanings[color];
    setMeanings(updatedMeanings);
    onSave(updatedMeanings);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">颜色含义管理</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {usedColors.map(color => {
            const meaning = meanings[color];
            const isEditing = editingColor === color;
            
            return (
              <div key={color} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMeaning.emoji}
                        onChange={(e) => setNewMeaning({ ...newMeaning, emoji: e.target.value })}
                        placeholder="🏷️"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <input
                        type="text"
                        value={newMeaning.name}
                        onChange={(e) => setNewMeaning({ ...newMeaning, name: e.target.value })}
                        placeholder="名称"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <input
                      type="text"
                      value={newMeaning.description}
                      onChange={(e) => setNewMeaning({ ...newMeaning, description: e.target.value })}
                      placeholder="描述（可选）"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(color)}
                        disabled={!newMeaning.name}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingColor(null);
                          setNewMeaning({ name: '', emoji: '', description: '' });
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {meaning && (
                          <>
                            <span className="text-lg">{meaning.emoji}</span>
                            <span className="font-medium text-gray-800">{meaning.name}</span>
                          </>
                        )}
                        <span className="text-sm text-gray-500 font-mono">{color}</span>
                      </div>
                      {meaning?.description && (
                        <p className="text-sm text-gray-600 mt-1">{meaning.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingColor(color);
                          setNewMeaning(meaning || { name: '', emoji: '', description: '' });
                        }}
                        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {meaning && (
                        <button
                          onClick={() => handleDelete(color)}
                          className="p-1.5 text-red-600 hover:bg-gray-200 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Command Palette Component
const CommandPalette = ({ isOpen, onClose, tiles }) => {
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const paletteFilteredTiles = tiles.filter(tile => {
    if (!paletteSearch) return true;
    const searchLower = paletteSearch.toLowerCase();
    const namePinyin = toPinyin(tile.name).toLowerCase();
    const nameMatch = tile.name.toLowerCase().includes(searchLower) || namePinyin.includes(searchLower);
    const urlMatch = tile.url.toLowerCase().includes(searchLower);
    return nameMatch || urlMatch;
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to selected item when using keyboard navigation
  useEffect(() => {
    if (isKeyboardNav && scrollRef.current) {
      const container = scrollRef.current;
      const items = container.querySelectorAll('[data-command-item]');
      const selectedItem = items[selectedIndex];
      
      if (selectedItem) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        
        // Check if item is outside visible area
        if (itemRect.bottom > containerRect.bottom) {
          // Scroll down
          selectedItem.scrollIntoView({ block: 'end', behavior: 'smooth' });
        } else if (itemRect.top < containerRect.top) {
          // Scroll up
          selectedItem.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    }
  }, [selectedIndex, isKeyboardNav]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex(prev => 
          prev < paletteFilteredTiles.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : paletteFilteredTiles.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (paletteFilteredTiles[selectedIndex]) {
          window.open(paletteFilteredTiles[selectedIndex].url, '_blank');
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, paletteFilteredTiles, selectedIndex, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
    setIsKeyboardNav(false);
  }, [paletteSearch]);

  // Handle mouse movement
  const handleMouseMove = () => {
    setIsKeyboardNav(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
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
        
        <div 
          ref={scrollRef} 
          className="max-h-96 overflow-y-auto"
          style={{ scrollBehavior: isKeyboardNav ? 'smooth' : 'auto' }}
        >
          {paletteFilteredTiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              没有找到匹配的磁贴
            </div>
          ) : (
            <div className="py-2">
              {paletteFilteredTiles.map((tile, index) => (
                <div
                  key={tile.id}
                  data-command-item
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    window.open(tile.url, '_blank');
                    onClose();
                  }}
                  onMouseEnter={() => {
                    if (!isKeyboardNav) {
                      setSelectedIndex(index);
                    }
                  }}
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
function SortableTile({ tile, index, activeColorFilters, onEdit, onDelete }) {
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
    transition: isDragging ? undefined : transition,
  };

  const isFilteredOut = activeColorFilters.length > 0 && !activeColorFilters.includes(tile.color.toUpperCase());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative group cursor-move
        ${isFilteredOut ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
        ${isDragging ? 'z-50' : 'z-auto'}
      `}
    >
      <div
        className={`block bg-white rounded-xl shadow-sm hover:shadow-lg p-4 h-32 relative overflow-hidden group ${
          isDragging ? 'opacity-50' : ''
        }`}
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
            onEdit(tile);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(tile.id);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </button>
      </div>
    </div>
  );
}

// Main App Component
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
  const [activeColorFilters, setActiveColorFilters] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'grouped', 'rainbow'
  const [colorMeanings, setColorMeanings] = useState({});
  const [isColorMeaningsModalOpen, setIsColorMeaningsModalOpen] = useState(false);

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

  // Load tiles and color meanings from API
  useEffect(() => {
    loadTiles();
    loadColorMeanings();
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

  const loadColorMeanings = () => {
    const savedMeanings = localStorage.getItem('colorMeanings');
    if (savedMeanings) {
      setColorMeanings(JSON.parse(savedMeanings));
    }
  };

  const saveColorMeanings = (meanings) => {
    localStorage.setItem('colorMeanings', JSON.stringify(meanings));
    setColorMeanings(meanings);
  };

// Save tiles to API
const saveTiles = async (newTiles, isOptimistic = false) => {
  // If this is an optimistic update, update state immediately
  if (isOptimistic) {
    setTiles(newTiles);
  }
  
  try {
    setSaving(true);
    const response = await fetch(`${API_BASE_URL}/tiles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles: newTiles })
    });
    if (!response.ok) throw new Error('Failed to save tiles');
    
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

  // Filter tiles based on search and color
  const filteredTiles = tiles.filter(tile => {
    // First apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const namePinyin = toPinyin(tile.name).toLowerCase();
      const nameMatch = tile.name.toLowerCase().includes(searchLower) || 
                       namePinyin.includes(searchLower);
      const urlMatch = tile.url.toLowerCase().includes(searchLower);
      if (!nameMatch && !urlMatch) return false;
    }
    
    // Then apply color filter for grid view only
    if (viewMode === 'grid' && activeColorFilters.length > 0) {
      return activeColorFilters.includes(tile.color.toUpperCase());
    }
    
    return true;
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
  }, [filteredTiles, viewMode]);

// Handle drag end for @dnd-kit
const handleDragEnd = (event) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    const oldIndex = tiles.findIndex((tile) => tile.id === active.id);
    const newIndex = tiles.findIndex((tile) => tile.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newTiles = arrayMove([...tiles], oldIndex, newIndex);
      
      // Immediate visual update
      setTiles(newTiles);
      
      // Background save (without optimistic flag since we already updated state)
      saveTiles(newTiles, false);
    }
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
    const dataStr = JSON.stringify({ tiles, colorMeanings }, null, 2);
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
        }
        if (data.colorMeanings) {
          saveColorMeanings(data.colorMeanings);
        }
        if (!data.tiles && !data.colorMeanings) {
          alert('无效的配置文件格式');
        }
      } catch (error) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  // Color filter handlers
  const handleColorToggle = (color) => {
    setActiveColorFilters(prev => {
      if (prev.includes(color)) {
        return prev.filter(c => c !== color);
      }
      return [...prev, color];
    });
  };

  const handleColorReset = () => {
    setActiveColorFilters([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" style={{ backgroundColor: '#F8FAFB' }}>
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>

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
              {/* View Mode Toggle */}
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
              
              <div className="w-px h-8 bg-gray-300" />
              
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">添加</span>
              </button>
              
              <button
                onClick={() => setIsColorMeaningsModalOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="颜色含义设置"
              >
                <Settings className="w-5 h-5" />
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
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Save className="w-4 h-4 animate-pulse" />
                  <span className="text-xs">已保存</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Color Filter (only show in grid view) */}
          {tiles.length > 0 && viewMode === 'grid' && (
            <div className="mt-4">
              <ColorFilter
                tiles={tiles}
                activeColors={activeColorFilters}
                onColorToggle={handleColorToggle}
                onReset={handleColorReset}
                colorMeanings={colorMeanings}
              />
            </div>
          )}
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

      {/* Tiles Grid/Views */}
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
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
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
                        activeColorFilters={activeColorFilters}
                        onEdit={(tile) => {
                          setEditingTile(tile);
                          setIsAddModalOpen(true);
                        }}
                        onDelete={handleDeleteTile}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            
            {/* Grouped View */}
            {viewMode === 'grouped' && (
              <GroupedTileView
                tiles={filteredTiles}
                onEditTile={(tile) => {
                  setEditingTile(tile);
                  setIsAddModalOpen(true);
                }}
                onDeleteTile={handleDeleteTile}
                colorMeanings={colorMeanings}
              />
            )}
            
            {/* Rainbow View */}
            {viewMode === 'rainbow' && (
              <RainbowTileView
                tiles={filteredTiles}
                onEditTile={(tile) => {
                  setEditingTile(tile);
                  setIsAddModalOpen(true);
                }}
                onDeleteTile={handleDeleteTile}
              />
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <TileModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTile(null);
        }}
        editingTile={editingTile}
        onSave={handleSaveTile}
        existingTiles={tiles}
        colorMeanings={colorMeanings}
      />
      
      {/* Color Meanings Modal */}
      <ColorMeaningsModal
        isOpen={isColorMeaningsModalOpen}
        onClose={() => setIsColorMeaningsModalOpen(false)}
        colorMeanings={colorMeanings}
        onSave={saveColorMeanings}
        tiles={tiles}
      />
      
      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tiles={tiles}
      />
      
      {/* Footer */}
      <div className="text-center py-4 text-sm text-gray-500">
        
      </div>
    </div>
  );
}

export default App;
