import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { CompositionElement } from './types';

/**
 * Component to preview a composition element with appropriate rendering based on element type
 */
interface ElementPreviewProps { 
  element: CompositionElement; 
  className?: string;
}

const ElementPreview: React.FC<ElementPreviewProps> = ({ element, className = "w-10 h-10" }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (element.src && (element.type === 'image' || element.type === 'video')) {
      setPreviewUrl(element.src);
    }
  }, [element]);

  if (element.type === 'image' && previewUrl) {
    return (
      <img 
        src={previewUrl} 
        alt={element.text || 'Image'}
        className={`${className} object-cover rounded border border-gray-200`}
      />
    );
  }

  if (element.type === 'video' && previewUrl) {
    return (
      <video 
        src={previewUrl} 
        className={`${className} object-cover rounded border border-gray-200`}
        muted
        onMouseEnter={(e) => {
          const video = e.target as HTMLVideoElement;
          video.play().catch(() => {
            // Handle play error silently
          });
        }}
        onMouseLeave={(e) => {
          const video = e.target as HTMLVideoElement;
          video.pause();
          video.currentTime = 0;
        }}
      />
    );
  }

  if (element.type === 'text') {
    return (
      <div className={`${className} bg-gray-100 rounded border border-gray-200 flex items-center justify-center p-2`}>
        <DocumentTextIcon className="h-5 w-5 text-gray-600" />
      </div>
    );
  }

  // Fallback to icon for unknown types
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-blue-500" />;
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-purple-500" />;
      case 'text':
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`${className} bg-gray-100 rounded border border-gray-200 flex items-center justify-center`}>
      {getElementIcon(element.type)}
    </div>
  );
};

export default ElementPreview;
