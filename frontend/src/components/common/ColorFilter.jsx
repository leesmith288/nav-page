import React from 'react';
import { isColorDark } from '../../utils/colors';

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
              
              {/* Tooltip - positioned below */}
              {meaning && (
                <div className="
                  absolute top-full mt-2 left-1/2 transform -translate-x-1/2
                  bg-gray-900 text-white text-xs px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity
                  pointer-events-none whitespace-nowrap z-50
                  shadow-lg
                ">
                  {meaning.emoji} {meaning.name}
                  {/* Small arrow pointing up */}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
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

export default ColorFilter;
