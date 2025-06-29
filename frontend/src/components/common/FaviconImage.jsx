import React, { useState } from 'react';
import { Globe } from 'lucide-react';

const FaviconImage = ({ url, name, color, customIcon, cachedFavicon, size = 'normal' }) => {
  const [currentSrc, setCurrentSrc] = useState(0);
  const [hasError, setHasError] = useState(false);
  
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();

  const sizeClass = size === 'small' ? 'w-6 h-6' : 'w-12 h-12';
  const iconSizeClass = size === 'small' ? 'w-5 h-5' : 'w-10 h-10';

  // If custom icon is provided, use it directly
  if (customIcon) {
    return (
      <img 
        src={customIcon}
        alt={name}
        className={`${sizeClass} object-contain`}
        onError={() => setHasError(true)}
        loading="lazy"
        style={{
          WebkitImageRendering: '-webkit-optimize-contrast',
          imageRendering: 'crisp-edges',
        }}
      />
    );
  }

  // If cached favicon exists, try it first
  const baseFaviconSources = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://${domain}/favicon.ico`,
  ];

  // Put cached favicon at the beginning if it exists
  const faviconSources = cachedFavicon 
    ? [cachedFavicon, ...baseFaviconSources.filter(src => src !== cachedFavicon)]
    : baseFaviconSources;

  const handleError = () => {
    if (currentSrc < faviconSources.length - 1) {
      setCurrentSrc(currentSrc + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !domain) {
    return (
      <Globe 
        className={iconSizeClass}
        style={{ color: color }}
      />
    );
  }

  return (
    <img 
      src={faviconSources[currentSrc]}
      alt={name}
      className={`${sizeClass} object-contain`}
      onError={handleError}
      loading="lazy"
      style={{
        WebkitImageRendering: '-webkit-optimize-contrast',
        imageRendering: 'crisp-edges',
      }}
    />
  );
};

export default FaviconImage;
