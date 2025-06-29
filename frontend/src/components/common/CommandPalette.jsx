import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'lucide-react';
import FaviconImage from './FaviconImage';
import { toPinyin } from '../../utils/pinyin';

const CommandPalette = ({ isOpen, onClose, tiles }) => {
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const paletteFilteredTiles = tiles.filter(tile => {
    if (!paletteSearch) return true;
    const searchLower = paletteSearch.toLowerCase();
    const namePinyin = toPinyin(tile.name).toLowerCase();
    const nameMatch = tile.name.toLowerCase().includes(searchLower) || namePinyin.includes(searchLower);
    const urlMatch = tile.url.toLowerCase().includes(searchLower);
    return nameMatch || urlMatch;
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to selected item when using keyboard navigation
  useEffect(() => {
    if (isKeyboardNav && scrollRef.current) {
      const container = scrollRef.current;
      const items = container.querySelectorAll('[data-command-item]');
      const selectedItem = items[selectedIndex];
      
      if (selectedItem) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        
        // Check if item is outside visible area
        if (itemRect.bottom > containerRect.bottom) {
          // Scroll down
          selectedItem.scrollIntoView({ block: 'end', behavior: 'smooth' });
        } else if (itemRect.top < containerRect.top) {
          // Scroll up
          selectedItem.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    }
  }, [selectedIndex, isKeyboardNav]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex(prev => 
          prev < paletteFilteredTiles.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsKeyboardNav(true);
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : paletteFilteredTiles.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (paletteFilteredTiles[selectedIndex]) {
          window.open(paletteFilteredTiles[selectedIndex].url, '_blank');
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, paletteFilteredTiles, selectedIndex, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
    setIsKeyboardNav(false);
  }, [paletteSearch]);

  // Handle mouse movement
  const handleMouseMove = () => {
    setIsKeyboardNav(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Command className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={inputRef}
              type="text"
              value={paletteSearch}
              onChange={(e) => setPaletteSearch(e.target.value)}
              placeholder="输入搜索或按 ESC 退出..."
              className="w-full pl-10 pr-4 py-3 text-lg focus:outline-none"
            />
          </div>
        </div>
        
        <div 
          ref={scrollRef} 
          className="max-h-96 overflow-y-auto"
          style={{ scrollBehavior: isKeyboardNav ? 'smooth' : 'auto' }}
        >
          {paletteFilteredTiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              没有找到匹配的磁贴
            </div>
          ) : (
            <div className="py-2">
              {paletteFilteredTiles.map((tile, index) => (
                <div
                  key={tile.id}
                  data-command-item
                  className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    window.open(tile.url, '_blank');
                    onClose();
                  }}
                  onMouseEnter={() => {
                    if (!isKeyboardNav) {
                      setSelectedIndex(index);
                    }
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: `${tile.color}15` }}
                  >
                    <FaviconImage 
                      url={tile.url} 
                      name={tile.name} 
                      color={tile.color}
                      customIcon={tile.customIcon}
                      cachedFavicon={tile.cachedFavicon}
                      size="small"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{tile.name}</div>
                    <div className="text-sm text-gray-500 truncate">{tile.url}</div>
                  </div>
                  {index < 9 && (
                    <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
          <span>↑↓ 导航 · Enter 打开 · ESC 退出</span>
          <span>Ctrl+K 打开命令面板</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
