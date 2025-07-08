import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  MusicalNoteIcon,
  PhotoIcon,
  VideoCameraIcon,
  PlusIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
import { Link } from 'react-router-dom';


// File Preview Component
const FilePreview: React.FC<{ 
  file: File | null; 
  type: string; 
  name: string;
  className?: string;
}> = ({ file, type, name, className = "w-10 h-10" }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && (type === 'image' || type === 'video')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, type]);

  if (type === 'image' && previewUrl) {
    return (
      <img 
        src={previewUrl} 
        alt={name}
        className={`${className} object-cover rounded border border-gray-200`}
      />
    );
  }

  if (type === 'video' && previewUrl) {
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

interface LeftPanelProps {
  project: any;
  selectedElement: any;
  onElementSelect: (element: any) => void;
}

export default function LeftPanel({ project, selectedElement, onElementSelect }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'elements' | 'properties'>('explorer');
  const [isDragOver, setIsDragOver] = useState(false);
  const [assets, setAssets] = useState<Array<{
    id: number;
    name: string;
    type: string;
    size: string;
    file: File | null;
  }>>([
    { id: 1, name: 'video1.mp4', type: 'video', size: '15.2 MB', file: null },
    { id: 2, name: 'audio1.mp3', type: 'audio', size: '3.4 MB', file: null },
    { id: 3, name: 'image1.jpg', type: 'image', size: '2.1 MB', file: null },
    { id: 4, name: 'image2.png', type: 'image', size: '1.8 MB', file: null },
  ]);
  const { data: user } = useAuth();

  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'webm':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'aac':
        return 'audio';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'document';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set isDragOver to false if we're leaving the entire drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const newAssets = files.map((file, index) => ({
        id: Date.now() + index, // Simple ID generation
        name: file.name,
        type: getFileType(file.name),
        size: formatFileSize(file.size),
        file: file // Store the actual File object for later use
      }));

      setAssets(prevAssets => [...prevAssets, ...newAssets]);
      console.log('Files dropped and added:', newAssets);
    }
  };

  const mockElements = [
    { id: 1, name: 'Text Layer 1', type: 'text', content: 'Hello World' },
    { id: 2, name: 'Video Layer 1', type: 'video', source: 'video1.mp4' },
    { id: 3, name: 'Audio Track 1', type: 'audio', source: 'audio1.mp3' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header with Home Icon and User Avatar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <Link 
          to={routes.LibraryRoute.to}
          className="p-2 hover:bg-gray-200 rounded-md transition-colors"
          title="Go to Library"
        >
          <HomeIcon className="h-5 w-5 text-gray-600" />
        </Link>
        
        <div 
          className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:bg-blue-600 transition-colors"
          title={user?.email || 'User'}
        >
          {getUserInitial()}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'explorer'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Explorer
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'elements'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'properties'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Properties
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'explorer' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Project Assets</h3>
              <button className="p-1 hover:bg-gray-100 rounded">
                <PlusIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div 
              className={`min-h-[200px] transition-all duration-200 ${
                isDragOver 
                  ? 'border-2 border-dashed border-blue-400 bg-blue-50' 
                  : 'border-2 border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => onElementSelect(asset)}
                  >
                    <FilePreview file={asset.file} type={asset.type} name={asset.name} className="w-12 h-12" />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                      <div className="text-xs text-gray-500">{asset.size}</div>
                    </div>
                  </div>
                ))}
                {isDragOver && (
                  <div className="flex items-center justify-center py-8 text-blue-600">
                    <div className="text-center">
                      <DocumentIcon className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      <p className="text-sm font-medium">Drop files here to add to project</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'elements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Timeline Elements</h3>
              <button className="p-1 hover:bg-gray-100 rounded">
                <PlusIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {mockElements.map((element) => (
                <div
                  key={element.id}
                  className={`p-2 rounded cursor-pointer ${
                    selectedElement?.id === element.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onElementSelect(element)}
                >
                  <div className="text-sm font-medium text-gray-900">{element.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{element.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Properties</h3>
            {selectedElement ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedElement.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={selectedElement.type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    readOnly
                  />
                </div>
                {selectedElement.type === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={selectedElement.content}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={3}
                      readOnly
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select an element to view properties</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
