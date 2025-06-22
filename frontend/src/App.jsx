import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Globe, Loader2, ExternalLink, Grid, Save, AlertCircle, Image } from 'lucide-react';
import pinyin from 'pinyin';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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

// Tile Component (for rendering in DragOverlay)
function TileContent({ tile, isDragging = false }) {
  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return (
    <div
      className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4 h-32 relative overflow-hidden group"
      style={(() => {
        if (!tile.darkness || tile.darkness === 0) {
          return {
            borderTop: `4px solid ${tile.color}`,
            cursor: isDragging ? 'grabbing' : 'grab',
          };
        }
        
        const rgb = hexToRgb(tile.color);
        if (rgb) {
          const alpha = tile.darkness / 100;
          return {
            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
            borderTop: `4px solid ${tile.color}`,
            cursor: isDragging ? 'grabbing' : 'grab',
          };
        }
        
        return {
          borderTop: `4px solid ${tile.color}`,
          cursor: isDragging ? 'grabbing' : 'grab',
        };
      })()}
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
  );
}

// Sortable Tile Component
function SortableTile({ tile, onEdit, onDelete }) {
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
    opacity: isDragging ? 0.3 : 1,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group transition-all duration-200"
    >
      <div {...attributes} {...listeners}>
        <TileContent tile={tile} />
      </div>
      
      {/* Edit/Delete Buttons - Outside of draggable area */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20 pointer-events-none">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(tile);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors pointer-events-auto"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(tile.id);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors pointer-events-auto"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </button>
      </div>
      
      {/* Clickable link - separate from draggable area */}
      {!isDragging && (
        <a
          href={tile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          onClick={(e) => {
            // Only navigate if not clicking on buttons
            if (e.target.closest('button')) {
              e.preventDefault();
            }
          }}
        />
      )}
    </div>
  );
}

// Enhanced favicon component with custom icon support
const FaviconImage = ({ url, name, color, customIcon }) => {
  const [currentSrc, setCurrentSrc] = useState(0);
  const [hasError, setHasError] = useState(false);
  
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();

  // If custom icon is provided, use it directly
  if (customIcon) {
    return (
      <img 
        src={customIcon}
        alt={name}
        className="w-12 h-12 object-contain"
        onError={() => setHasError(true)}
        loading="lazy"
        style={{
          WebkitImageRendering: '-webkit-optimize-contrast',
          imageRendering: 'crisp-edges',
        }}
      />
    );
  }

  // Priority order of favicon sources (from highest to lowest quality)
  const faviconSources = [
    // 1. Clearbit Logo API - Highest quality, returns company logos
    `https://logo.clearbit.com/${domain}`,
    
    // 2. Google's S2 favicons with size parameter - Good quality
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    
    // 3. Favicon.ico directly from the site - Variable quality
    `https://${domain}/favicon.ico`,
    
    // 4. DuckDuckGo icons - Fallback option
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    
    // 5. Additional fallback - favicon grabber service
    `https://favicongrabber.com/api/grab/${domain}`,
  ];

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
        className="w-10 h-10"
        style={{ color: color }}
      />
    );
  }

  return (
    <img 
      src={faviconSources[currentSrc]}
      alt={name}
      className="w-12 h-12 object-contain"
      onError={handleError}
      loading="lazy"
      style={{
        WebkitImageRendering: '-webkit-optimize-contrast',
        imageRendering: 'crisp-edges',
      }}
    />
  );
};

function App() {
  const [tiles, setTiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);

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

  // Filter tiles based on search
  const filteredTiles = tiles.filter(tile => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const namePinyin = toPinyin(tile.name).toLowerCase();
    const nameMatch = tile.name.toLowerCase().includes(searchLower) || namePinyin.includes(searchLower);
    const urlMatch = tile.url.toLowerCase().includes(searchLower);
    return nameMatch || urlMatch;
  });

  // Handle drag start
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
  };

  // Handle drag end for @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tiles.findIndex((tile) => tile.id === active.id);
      const newIndex = tiles.findIndex((tile) => tile.id === over.id);
      
      const newTiles = arrayMove(tiles, oldIndex, newIndex);
      saveTiles(newTiles);
    }
    
    setActiveId(null);
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

  // Tile Modal Component
  const TileModal = () => {
    const [formData, setFormData] = useState(
      editingTile || { name: '', url: '', color: '#3B82F6', darkness: 0, customIcon: '' }
    );
    const [showCustomIcon, setShowCustomIcon] = useState(!!formData.customIcon);

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
                <div className="flex gap-2 flex-wrap">
                  {['#FF6B6B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#059669', '#DC2626', '#7C3AED'].map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>保存中...</span>
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTiles.map(tile => tile.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredTiles.map((tile) => (
                  <SortableTile
                    key={tile.id}
                    tile={tile}
                    onEdit={(tile) => {
                      setEditingTile(tile);
                      setIsAddModalOpen(true);
                    }}
                    onDelete={handleDeleteTile}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div className="cursor-grabbing">
                  <TileContent 
                    tile={tiles.find(t => t.id === activeId)} 
                    isDragging={true}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && <TileModal />}
      
      {/* Footer */}
      <div className="text-center py-4 text-sm text-gray-500">
        
      </div>
    </div>
  );
}

export default App;
