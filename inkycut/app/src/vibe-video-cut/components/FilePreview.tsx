import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  MusicalNoteIcon,
  PhotoIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';

/**
 * Component to preview file content with appropriate rendering based on file type
 */
interface FilePreviewProps { 
  file: File | null; 
  type: string; 
  name: string;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, type, name, className = "w-10 h-10" }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // useEffect(() => {
  //   if (file && (type === 'image' || type === 'video')) {
  //     const url = URL.createObjectURL(file);
  //     setPreviewUrl(url);
      
  //     return () => {
  //       URL.revokeObjectURL(url);
  //     };
  //   }
  // }, [file, type]);

  // if (type === 'image' && previewUrl) {
  //   return (
  //     <img 
  //       src={previewUrl} 
  //       alt={name}
  //       className={`${className} object-cover rounded border border-gray-200`}
  //     />
  //   );
  // }

  // if (type === 'video' && previewUrl) {
  //   return (
  //     <video 
  //       src={previewUrl} 
  //       className={`${className} object-cover rounded border border-gray-200`}
  //       muted
  //       onMouseEnter={(e) => {
  //         const video = e.target as HTMLVideoElement;
  //         video.play().catch(() => {
  //           // Handle play error silently
  //         });
  //       }}
  //       onMouseLeave={(e) => {
  //         const video = e.target as HTMLVideoElement;
  //         video.pause();
  //         video.currentTime = 0;
  //       }}
  //     />
  //   );
  // }

  // Fallback to icon for non-previewable files or files without File object
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-blue-500" />;
      case 'audio':
        return <MusicalNoteIcon className="h-5 w-5 text-green-500" />;
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`${className} bg-gray-100 rounded border border-gray-200 flex items-center justify-center`}>
      {getFileIcon(type)}
    </div>
  );
};

export default FilePreview;
