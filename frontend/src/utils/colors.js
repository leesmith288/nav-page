// Helper function to convert hex to RGB
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper function to determine if a color is dark
export const isColorDark = (color, darkness = 0) => {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  
  const adjustedR = rgb.r * (1 - darkness / 100) + 255 * (darkness / 100);
  const adjustedG = rgb.g * (1 - darkness / 100) + 255 * (darkness / 100);
  const adjustedB = rgb.b * (1 - darkness / 100) + 255 * (darkness / 100);
  
  const luminance = (0.299 * adjustedR + 0.587 * adjustedG + 0.114 * adjustedB) / 255;
  return luminance < 0.5;
};

// Helper function to convert hex to hue
export const hexToHue = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (diff === 0) return 0;
  
  let hue;
  if (max === r) {
    hue = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    hue = ((b - r) / diff + 2) / 6;
  } else {
    hue = ((r - g) / diff + 4) / 6;
  }
  
  return hue * 360;
};
