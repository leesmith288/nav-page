import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Download, Upload, Grid, Loader2, ExternalLink, Save, AlertCircle, RefreshCw, Settings, MoreHorizontal, ChevronDown } from 'lucide-react';
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

// Components
import ViewModeToggle from './components/common/ViewModeToggle';
import ColorFilter from './components/common/ColorFilter';
import CommandPalette from './components/common/CommandPalette';
import SortableTile from './components/tiles/SortableTile';
import GroupedTileView from './components/tiles/GroupedTileView';
import RainbowTileView from './components/tiles/RainbowTileView';
import TileModal from './components/modals/TileModal';
import ColorMeaningsModal from './components/modals/ColorMeaningsModal';

// Hooks
import { useTiles } from './hooks/useTiles';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Utils
import { toPinyin } from './utils/pinyin';
import { api } from './utils/api';
import { isColorDark } from './utils/colors';

// Custom hook for click outside detection
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

// Compact View Mode Toggle Component
const CompactViewModeToggle = ({ mode, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useClickOutside(dropdownRef, () => setIsOpen(false));
  
  const modes = [
    { id: 'grid', label: '网格视图' },
    { id: 'grouped', label: '分组视图' },
    { id: 'rainbow', label: '彩虹视图' },
  ];
  
  const currentMode = modes.find(m => m.id === mode);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
      >
        <span>{currentMode?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
          {modes.map((modeOption) => (
            <button
              key={modeOption.id}
              onClick={() => {
                onChange(modeOption.id);
                setIsOpen(false);
              }}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg
                ${mode === modeOption.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'hover:bg-gray-50'
                }
              `}
            >
              {modeOption.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// More Actions Dropdown Component
const MoreActionsDropdown = ({ 
  onRefreshFavicons, 
  onExport, 
  onImport, 
  onColorMeanings,
  refreshingFavicons 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useClickOutside(dropdownRef, () => setIsOpen(false));
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="更多操作"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
          <button
            onClick={() => {
              onColorMeanings();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg"
          >
            <Settings className="w-4 h-4" />
            颜色含义设置
          </button>
          
          <button
            onClick={() => {
              onRefreshFavicons();
              setIsOpen(false);
            }}
            disabled={refreshingFavicons}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingFavicons ? 'animate-spin' : ''}`} />
            刷新所有图标
          </button>
          
          <button
            onClick={() => {
              onExport();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出配置
          </button>
          
          <label className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer last:rounded-b-lg">
            <Upload className="w-4 h-4" />
            导入配置
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                onImport(e);
                setIsOpen(false);
              }}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};

// Enhanced ColorFilter Component with proper z-index
const EnhancedColorFilter = ({ tiles, activeColors, onColorToggle, onReset, colorMeanings }) => {
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
              
              {/* Tooltip - Fixed z-index issue */}
              {meaning && (
                <div className="
                  absolute -top-12 left-1/2 transform -translate-x-1/2
                  bg-gray-900 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity
                  pointer-events-none whitespace-nowrap z-[100]
                  before:content-[''] before:absolute before:top-full before:left-1/2 
                  before:transform before:-translate-x-1/2 before:border-4 
                  before:border-transparent before:border-t-gray-900
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

function App() {
  // State management
  const {
    tiles,
    setTiles,
    loading,
    saving,
    error,
    setError,
    saveTiles,
    refreshFavicons
  } = useTiles();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [refreshingFavicons, setRefreshingFavicons] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activeColorFilters, setActiveColorFilters] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'grouped', 'rainbow'
  const [colorMeanings, setColorMeanings] = useState({});
  const [isColorMeaningsModalOpen, setIsColorMeaningsModalOpen] = useState(false);
  const [savingColorMeanings, setSavingColorMeanings] = useState(false);

  // Refs
  const searchInputRef = useRef(null);

  // OS detection for keyboard shortcuts
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

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

  // Load color meanings from API
  useEffect(() => {
    loadColorMeanings();
  }, []);

  const loadColorMeanings = async () => {
    try {
      const meanings = await api.loadColorMeanings();
      setColorMeanings(meanings);
    } catch (err) {
      console.error('Error loading color meanings:', err);
      // Fallback to localStorage if API fails
      const savedMeanings = localStorage.getItem('colorMeanings');
      if (savedMeanings) {
        setColorMeanings(JSON.parse(savedMeanings));
      }
    }
  };

  const saveColorMeanings = async (meanings) => {
    try {
      setSavingColorMeanings(true);
      await api.saveColorMeanings(meanings);
      setColorMeanings(meanings);
      // Also save to localStorage as backup
      localStorage.setItem('colorMeanings', JSON.stringify(meanings));
    } catch (err) {
      console.error('Error saving color meanings:', err);
      setError('无法保存颜色含义');
    } finally {
      setSavingColorMeanings(false);
    }
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

  // Use keyboard shortcuts
  useKeyboardShortcuts({ 
    filteredTiles, 
    viewMode, 
    setIsCommandPaletteOpen 
  });

  // Handle search expansion
  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleSearchCollapse = () => {
    if (!searchTerm) {
      setIsSearchExpanded(false);
    }
  };

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
        
        // Background save
        saveTiles(newTiles, false);
      }
    }
  };

  // Handle favicon refresh
  const handleRefreshFavicons = async () => {
    setRefreshingFavicons(true);
    await refreshFavicons();
    setRefreshingFavicons(false);
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
          {/* Single Line Navigation */}
          <div className="flex items-center gap-3">
            {/* Search Icon/Expanded Bar */}
            <div className="relative">
              {isSearchExpanded ? (
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 min-w-[250px] sm:min-w-[300px]">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索名称或拼音..."
                    className="flex-1 bg-transparent focus:outline-none text-sm"
                    onBlur={handleSearchCollapse}
                  />
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearchExpanded(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSearchExpand}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={`搜索 (${isMac ? '⌘' : 'Ctrl'}+K)`}
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">添加</span>
            </button>

            {/* Color Filters - Only show if we have tiles and are not in search mode */}
            {!isSearchExpanded && tiles.length > 0 && viewMode === 'grid' && (
              <div className="flex items-center gap-2 flex-1 overflow-x-auto">
                <EnhancedColorFilter
                  tiles={tiles}
                  activeColors={activeColorFilters}
                  onColorToggle={handleColorToggle}
                  onReset={handleColorReset}
                  colorMeanings={colorMeanings}
                />
              </div>
            )}

            {/* View Mode Toggle */}
            <CompactViewModeToggle mode={viewMode} onChange={setViewMode} />

            {/* More Actions */}
            <MoreActionsDropdown
              onRefreshFavicons={handleRefreshFavicons}
              onExport={handleExport}
              onImport={handleImport}
              onColorMeanings={() => setIsColorMeaningsModalOpen(true)}
              refreshingFavicons={refreshingFavicons}
            />

            {/* Saving Indicator */}
            {(saving || savingColorMeanings) && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Save className="w-4 h-4 animate-pulse" />
                <span className="text-xs hidden sm:inline">已保存</span>
              </div>
            )}
          </div>

          {/* Color Filter Row - Show when search is expanded and we have tiles */}
          {isSearchExpanded && tiles.length > 0 && viewMode === 'grid' && (
            <div className="mt-4">
              <EnhancedColorFilter
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
