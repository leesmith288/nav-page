import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Download, Upload, Globe, Loader2, ExternalLink, Grid, Save, AlertCircle } from 'lucide-react';
import pinyin from 'pinyin';

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
  const [draggedTile, setDraggedTile] = useState(null);
  const [dragOverTile, setDragOverTile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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

  // Drag and drop handlers
  const handleDragStart = (e, tile) => {
    setDraggedTile(tile);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, tile) => {
    e.preventDefault();
    if (draggedTile && draggedTile.id !== tile.id) {
      setDragOverTile(tile.id);
    }
  };

  const handleDragEnd = () => {
    setDraggedTile(null);
    setDragOverTile(null);
  };

  const handleDrop = (e, targetTile) => {
    e.preventDefault();
    if (!draggedTile || draggedTile.id === targetTile.id) return;

    const newTiles = [...tiles];
    const draggedIndex = newTiles.findIndex(t => t.id === draggedTile.id);
    const targetIndex = newTiles.findIndex(t => t.id === targetTile.id);

    // Swap positions
    [newTiles[draggedIndex], newTiles[targetIndex]] = [newTiles[targetIndex], newTiles[draggedIndex]];
    
    saveTiles(newTiles);
    setDraggedTile(null);
    setDragOverTile(null);
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

  // Enhanced favicon component with multiple sources and HD processing
  const FaviconImage = ({ url, name, color }) => {
    const [processedSrc, setProcessedSrc] = useState(null);
    const [currentSrc, setCurrentSrc] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(true);
    const canvasRef = useRef(null);
    const processedCache = useRef({});
    
    const domain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    })();

    // Priority order of favicon sources (from highest to lowest quality)
    const faviconSources = [
      // 1. Clearbit Logo API - Highest quality, returns company logos
      `https://logo.clearbit.com/${domain}`,
      
      // 2. Google's S2 favicons with size parameter - Good quality
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      
      // 3. Favicon Kit - provides multiple sizes
      `https://api.faviconkit.com/${domain}/144`,
      
      // 4. Icon Horse - another high quality source
      `https://icon.horse/icon/${domain}`,
      
      // 5. DuckDuckGo icons - Fallback option
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      
      // 6. Google's standard favicon service
      `https://www.google.com/s2/favicons?domain=${domain}`,
      
      // 7. Favicon.ico directly from the site - Variable quality
      `https://${domain}/favicon.ico`,
    ];

    // Advanced image processing for HD quality
    const processImage = (imgSrc) => {
      // Check cache first
      const cacheKey = `${domain}-${currentSrc}`;
      if (processedCache.current[cacheKey]) {
        setProcessedSrc(processedCache.current[cacheKey]);
        setIsProcessing(false);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d', { 
          alpha: true,
          desynchronized: true
        });
        
        // Target size for HD quality
        const targetSize = 192;
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // Clear canvas
        ctx.clearRect(0, 0, targetSize, targetSize);
        
        // Determine if image is low resolution
        const isLowRes = img.width <= 64 || img.height <= 64;
        const isVeryLowRes = img.width <= 32 || img.height <= 32;
        
        if (isLowRes) {
          // Multi-pass upscaling for better quality
          const passes = isVeryLowRes ? 3 : 2;
          let tempCanvas = document.createElement('canvas');
          let tempCtx = tempCanvas.getContext('2d');
          
          // First pass - initial upscale
          let currentSize = Math.max(img.width, img.height);
          for (let i = 0; i < passes; i++) {
            currentSize = Math.min(currentSize * 2, targetSize);
            tempCanvas.width = currentSize;
            tempCanvas.height = currentSize;
            
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';
            
            if (i === 0) {
              // First draw from original image
              tempCtx.drawImage(img, 0, 0, currentSize, currentSize);
            } else {
              // Subsequent draws from previous canvas
              tempCtx.drawImage(tempCanvas, 0, 0, currentSize, currentSize);
            }
          }
          
          // Final draw with enhancement filters
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Apply slight blur to reduce pixelation
          ctx.filter = 'blur(0.5px)';
          ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize);
          
          // Second pass - sharpening
          ctx.globalCompositeOperation = 'source-over';
          ctx.filter = 'contrast(1.2) saturate(1.1) brightness(1.05)';
          ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
          
          // Edge enhancement for very low res images
          if (isVeryLowRes) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.filter = 'contrast(1.1)';
            ctx.globalAlpha = 0.9;
            ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
            ctx.globalAlpha = 1.0;
          }
        } else {
          // For high-res images, use high quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.filter = 'none';
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
        }
        
        // Convert to data URL with high quality
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        
        // Cache the result
        processedCache.current[cacheKey] = dataUrl;
        
        setProcessedSrc(dataUrl);
        setIsProcessing(false);
      };
      
      img.onerror = () => {
        if (currentSrc < faviconSources.length - 1) {
          setCurrentSrc(currentSrc + 1);
        } else {
          setHasError(true);
          setIsProcessing(false);
        }
      };
      
      img.src = imgSrc;
    };

    useEffect(() => {
      if (!hasError && domain && faviconSources[currentSrc]) {
        setIsProcessing(true);
        processImage(faviconSources[currentSrc]);
      }
    }, [currentSrc, domain, hasError]);

    if (hasError || !domain) {
      return (
        <Globe 
          className="w-10 h-10"
          style={{ color: color }}
        />
      );
    }

    return (
      <>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {isProcessing ? (
          <div className="w-12 h-12 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-transparent animate-spin" />
          </div>
        ) : processedSrc ? (
          <img 
            src={processedSrc}
            alt={name}
            className="w-12 h-12 object-contain"
            style={{
              imageRendering: 'high-quality',
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
        ) : null}
      </>
    );
  };

  // Tile Modal Component
  const TileModal = () => {
    const [formData, setFormData] = useState(
      editingTile || { name: '', url: '', color: '#3B82F6' }
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredTiles.map((tile) => (
              <div
                key={tile.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tile)}
                onDragOver={(e) => handleDragOver(e, tile)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, tile)}
                className={`
                  relative group cursor-move transition-all duration-200
                  ${draggedTile?.id === tile.id ? 'opacity-50' : ''}
                  ${dragOverTile === tile.id ? 'scale-105' : ''}
                `}
              >
                <a
                  href={tile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-4 h-32 relative overflow-hidden"
                  style={{
                    borderTop: `4px solid ${tile.color}`,
                  }}
                  onClick={(e) => {
                    if (e.target.closest('button')) {
                      e.preventDefault();
                    }
                  }}
                >
                  {/* External link indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-sm font-medium text-gray-800 text-center truncate px-1">
                    {tile.name}
                  </h3>
                </a>
                
                {/* Edit/Delete Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
            ))}
          </div>
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
