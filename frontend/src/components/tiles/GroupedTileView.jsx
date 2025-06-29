import React from 'react';
import { ExternalLink, Edit2, Trash2 } from 'lucide-react';
import FaviconImage from '../common/FaviconImage';
import { hexToRgb } from '../../utils/colors';

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

export default GroupedTileView;
