import React from 'react';
import { ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FaviconImage from '../common/FaviconImage';
import { hexToRgb } from '../../utils/colors';

function SortableTile({ tile, index, activeColorFilters, onEdit, onDelete }) {
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
    transition: isDragging ? undefined : transition,
  };

  const isFilteredOut = activeColorFilters.length > 0 && !activeColorFilters.includes(tile.color.toUpperCase());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative group cursor-move
        ${isFilteredOut ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
        ${isDragging ? 'z-50' : 'z-auto'}
      `}
    >
      <div
        className={`block bg-white rounded-xl shadow-sm hover:shadow-lg p-4 h-32 relative overflow-hidden group ${
          isDragging ? 'opacity-50' : ''
        }`}
        style={(() => {
          if (!tile.darkness || tile.darkness === 0) {
            return {
              borderTop: `4px solid ${tile.color}`,
            };
          }
          
          const rgb = hexToRgb(tile.color);
          if (rgb) {
            const alpha = tile.darkness / 100;
            return {
              backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`,
              borderTop: `4px solid ${tile.color}`,
            };
          }
          
          return {
            borderTop: `4px solid ${tile.color}`,
          };
        })()}
        onClick={(e) => {
          if (!e.target.closest('button') && !e.ctrlKey && !e.metaKey) {
            window.open(tile.url, '_blank');
          }
        }}
      >
        {/* Keyboard shortcut indicator */}
        {index < 9 && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            {index + 1}
          </div>
        )}

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
        
        {/* Title with dynamic color based on background darkness */}
        <h3 
          className={`text-sm font-medium text-center truncate px-1 ${
            tile.darkness > 50 ? 'text-white' : 'text-gray-800'
          }`}
        >
          {tile.name}
        </h3>
      </div>
      
      {/* Edit/Delete Buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(tile);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(tile.id);
          }}
          className="p-1.5 bg-white rounded-lg hover:bg-gray-100 shadow-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
        </button>
      </div>
    </div>
  );
}

export default SortableTile;
