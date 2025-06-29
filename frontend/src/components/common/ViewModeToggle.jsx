import React from 'react';
import { Grid, Layers, Palette } from 'lucide-react';

const ViewModeToggle = ({ mode, onChange }) => {
  const modes = [
    { id: 'grid', icon: Grid, label: '网格视图' },
    { id: 'grouped', icon: Layers, label: '分组视图' },
    { id: 'rainbow', icon: Palette, label: '彩虹视图' },
  ];

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md
            transition-all duration-200
            ${mode === id 
              ? 'bg-white shadow-sm text-gray-900' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline text-sm">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;
