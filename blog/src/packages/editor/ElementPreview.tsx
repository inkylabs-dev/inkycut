import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import type { CompositionElement } from '../composition/types';
import { FileResolver } from '../composition/utils/fileResolver';

/**
 * Component to preview a composition element with appropriate rendering based on element type
 * Now supports file resolution for local file references
 */
interface ElementPreviewProps { 
  element: CompositionElement; 
  className?: string;
  fileResolver?: FileResolver;
}

const ElementPreview: React.FC<ElementPreviewProps> = ({ element, className = "w-10 h-10", fileResolver }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    if (element.src && (element.type === 'image' || element.type === 'video')) {
      // Check if we're resolving a local file reference
      const needsResolution = fileResolver && 
                             !element.src.startsWith('data:') && 
                             !element.src.startsWith('http://') && 
                             !element.src.startsWith('https://');
      
      // Resolve file reference using FileResolver if available
      const resolvedSrc = fileResolver ? fileResolver.resolve(element.src) : element.src;
      setPreviewUrl(resolvedSrc);
      setHasError(false);
      setIsResolved(Boolean(needsResolution && resolvedSrc !== element.src));
    } else {
      setPreviewUrl(null);
      setHasError(false);
      setIsResolved(false);
    }
  }, [element, fileResolver]);

  if (element.type === 'image' && previewUrl && !hasError) {
    return (
      <div className="relative">
        <img 
          src={previewUrl} 
          alt={element.text || 'Image'}
          className={`${className} object-cover rounded border border-gray-200 dark:border-gray-600`}
          onError={() => setHasError(true)}
        />
        {isResolved && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" 
               title="Using local file" />
        )}
      </div>
    );
  }

  if (element.type === 'video' && previewUrl && !hasError) {
    return (
      <div className="relative">
        <video 
          src={previewUrl} 
          className={`${className} object-cover rounded border border-gray-200 dark:border-gray-600`}
          muted
          preload="metadata"
          onError={() => setHasError(true)}
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
        {isResolved && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" 
               title="Using local file" />
        )}
      </div>
    );
  }

  if (element.type === 'text') {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center p-2`}>
        <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  // Fallback to icon for unknown types
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" />;
      case 'text':
        return <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  return (
    <div className={`${className} bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center`}>
      {getElementIcon(element.type)}
    </div>
  );
};

export default ElementPreview;
