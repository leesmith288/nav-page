import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';

const ColorMeaningsModal = ({ isOpen, onClose, colorMeanings, onSave, tiles }) => {
  const [meanings, setMeanings] = useState(colorMeanings);
  const [editingColor, setEditingColor] = useState(null);
  const [newMeaning, setNewMeaning] = useState({ name: '', emoji: '', description: '' });
  
  // Sync local state with props when modal opens or colorMeanings change
  useEffect(() => {
    setMeanings(colorMeanings);
  }, [colorMeanings, isOpen]);
  
  // Get all unique colors from tiles
  const usedColors = [...new Set(tiles.map(tile => tile.color.toUpperCase()))];
  
  const handleSave = (color) => {
    const updatedMeanings = {
      ...colorMeanings,  // Start with all existing meanings from props
      [color]: { ...newMeaning }  // Add/update only the specific color
    };
    setMeanings(updatedMeanings);
    onSave(updatedMeanings);
    setEditingColor(null);
    setNewMeaning({ name: '', emoji: '', description: '' });
  };
  
  const handleDelete = (color) => {
    const updatedMeanings = { ...colorMeanings };  // Start with existing meanings
    delete updatedMeanings[color];
    setMeanings(updatedMeanings);
    onSave(updatedMeanings);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">颜色含义管理</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {usedColors.map(color => {
            const meaning = meanings[color];
            const isEditing = editingColor === color;
            
            return (
              <div key={color} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                
                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMeaning.emoji}
                        onChange={(e) => setNewMeaning({ ...newMeaning, emoji: e.target.value })}
                        placeholder="🏷️"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <input
                        type="text"
                        value={newMeaning.name}
                        onChange={(e) => setNewMeaning({ ...newMeaning, name: e.target.value })}
                        placeholder="名称"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      />
                    </div>
                    <input
                      type="text"
                      value={newMeaning.description}
                      onChange={(e) => setNewMeaning({ ...newMeaning, description: e.target.value })}
                      placeholder="描述（可选）"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(color)}
                        disabled={!newMeaning.name}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingColor(null);
                          setNewMeaning({ name: '', emoji: '', description: '' });
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {meaning ? (
                          <>
                            <span className="text-lg">{meaning.emoji}</span>
                            <span className="font-medium text-gray-800">{meaning.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 font-mono">{color}</span>
                        )}
                      </div>
                      {meaning?.description && (
                        <p className="text-sm text-gray-600 mt-1">{meaning.description}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingColor(color);
                          setNewMeaning(meaning || { name: '', emoji: '', description: '' });
                        }}
                        className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {meaning && (
                        <button
                          onClick={() => handleDelete(color)}
                          className="p-1.5 text-red-600 hover:bg-gray-200 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ColorMeaningsModal;
