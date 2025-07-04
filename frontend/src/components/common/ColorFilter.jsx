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
            <div key={color} className="relative group">
              <button
                onClick={() => onColorToggle(color)}
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
                title={meaning ? `${meaning.emoji} ${meaning.name}` : color}
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
              
              {/* Bottom tooltip */}
              {meaning && (
                <div className="
                  absolute left-1/2 -translate-x-1/2 top-full mt-1
                  bg-gray-900 text-white text-xs px-2 py-1 rounded
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-all duration-200 z-50
                  pointer-events-none whitespace-nowrap
                  before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2
                  before:border-4 before:border-transparent before:border-b-gray-900
                ">
                  {meaning.emoji} {meaning.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Active filter count - more compact */}
      {activeColors.length > 0 && (
        <span className="text-xs text-gray-500 ml-2">
          ({activeColors.length})
        </span>
      )}
    </div>
  );
};

export default ColorFilter;
