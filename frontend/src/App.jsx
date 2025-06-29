import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Upload, Grid, Loader2, ExternalLink, Save, AlertCircle, RefreshCw, Settings } from 'lucide-react';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
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

  // Load color meanings from localStorage
  useEffect(() => {
    const savedMeanings = localStorage.getItem('colorMeanings');
    if (savedMeanings) {
      setColorMeanings(JSON.parse(savedMeanings));
    }
  }, []);

  const saveColorMeanings = (meanings) => {
    localStorage.setItem('colorMeanings', JSON.stringify(meanings));
    setColorMeanings(meanings);
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
                onClick={handleRefreshFavicons}
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
