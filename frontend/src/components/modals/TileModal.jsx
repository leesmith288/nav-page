import React, { useState, useEffect } from 'react';
import { Image } from 'lucide-react';
import EnhancedColorPicker from './EnhancedColorPicker';

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

export default TileModal;
