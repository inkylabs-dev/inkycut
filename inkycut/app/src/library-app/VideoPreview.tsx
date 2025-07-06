import { useState, useEffect } from 'react';
import { useQuery, getLibraryFileDownloadURL } from 'wasp/client/operations';
import { type File } from 'wasp/entities';

interface VideoPreviewProps {
  videoFile: File;
  className?: string;
}

export default function VideoPreview({ videoFile, className = '' }: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const downloadQuery = useQuery(
    getLibraryFileDownloadURL,
    { fileId: videoFile.id },
    { enabled: false }
  );

  const loadVideoUrl = async () => {
    if (videoUrl || isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await downloadQuery.refetch();
      if (result.status === 'success') {
        setVideoUrl(result.data);
      }
    } catch (error) {
      console.error('Error loading video URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideoUrl();
  }, [videoFile.id]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-32 border border-gray-200 dark:border-gray-600 rounded-md ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading video...</span>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`flex items-center justify-center h-32 border border-gray-200 dark:border-gray-600 rounded-md ${className}`}>
        <span className="text-sm text-gray-500 dark:text-gray-400">Video not available</span>
      </div>
    );
  }

  return (
    <video
      src={videoUrl}
      controls
      className={`w-full max-w-md h-32 object-cover rounded-md border border-gray-200 dark:border-gray-600 ${className}`}
      preload="metadata"
    >
      Your browser does not support the video tag.
    </video>
  );
}
