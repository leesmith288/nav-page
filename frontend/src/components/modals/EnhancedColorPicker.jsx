import React, { useState } from 'react';
import { hexToRgb } from '../../utils/colors';

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

export default EnhancedColorPicker;
