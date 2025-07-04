import React, { useState } from 'react';
import { isColorDark } from '../../utils/colors';

const ColorFilter = ({ tiles, activeColors, onColorToggle, onReset, colorMeanings }) => {
  const [hoveredColor, setHoveredColor] = useState(null);
  
  // Group tiles by color and count
  const colorGroups = tiles.reduce((acc, tile) => {
    const color = tile.color.toUpperCase();
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});
  
  const isAllSelected = activeColors.length === 0;
  
  return (
    <div className="flex items-center gap-2">
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
      
      <div className="w-px h-6 bg-gray-200" />
      
      {/* Color filters */}
      <div className="flex items-center gap-1.5">
        {Object.entries(colorGroups).map(([color, count]) => {
          const isActive = activeColors.includes(color);
          const meaning = colorMeanings[color];
          
          return (
            <button
              key={color}
              onClick={() => onColorToggle(color)}
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                transition-all duration-200
                ${isActive 
                  ? 'shadow-md ring-2 ring-offset-1' 
                  : 'hover:shadow-sm'
                }
              `}
              style={{
                backgroundColor: isActive ? color : `${color}20`,
                borderColor: color,
                ringColor: isActive ? color : undefined,
              }}
            >
              {/* Color dot */}
              <div 
                className="w-3.5 h-3.5 rounded-full shadow-sm"
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
                         isActive && !isColorDark(color) ? 'black' : 
                         undefined
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Meaning display - shows on hover with arrow */}
      {hoveredColor && colorMeanings[hoveredColor] && (
        <div className="flex items-center gap-1 text-xs text-gray-600 ml-2 animate-fadeIn relative">
          {/* Arrow pointing from the left */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
          <div className="bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
            <span>{colorMeanings[hoveredColor].emoji}</span>
            <span>{colorMeanings[hoveredColor].name}</span>
          </div>
        </div>
      )}
      
      {/* Active filter count */}
      {activeColors.length > 0 && !hoveredColor && (
        <span className="text-xs text-gray-500 ml-2">
          ({activeColors.length})
        </span>
      )}
    </div>
  );
};

export default ColorFilter;
