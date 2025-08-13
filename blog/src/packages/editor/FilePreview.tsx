import React from 'react';
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

const FilePreview: React.FC<FilePreviewProps> = ({ type, className = "w-10 h-10" }) => {

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
        return <VideoCameraIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case 'audio':
        return <MusicalNoteIcon className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  return (
    <div className={`${className} bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center`}>
      {getFileIcon(type)}
    </div>
  );
};

export default FilePreview;
