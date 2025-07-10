import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  MusicalNoteIcon,
  PhotoIcon,
  VideoCameraIcon,
  PlusIcon,
  HomeIcon,
  DocumentTextIcon,
  Bars3Icon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
import { Link } from 'react-router-dom';
import { CompositionElement } from './types';


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

// Element Preview Component
const ElementPreview: React.FC<{ 
  element: CompositionElement; 
  className?: string;
}> = ({ element, className = "w-10 h-10" }) => {
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

interface LeftPanelProps {
  project: any;
  selectedElement: any;
  selectedPage?: any;
  onElementSelect: (element: any) => void;
  onElementUpdate?: (elementId: string, updatedData: Partial<CompositionElement> | any) => void;
  propertiesEnabled: boolean;
}

export default function LeftPanel({ project, selectedElement, selectedPage, onElementSelect, onElementUpdate, propertiesEnabled }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'elements'>('explorer');
  const [isDragOver, setIsDragOver] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState<{[key: string]: boolean}>({});
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [assets, setAssets] = useState<Array<{
    id: number;
    name: string;
    type: string;
    size: string;
    file: File | null;
  }>>([]);
  const { data: user } = useAuth();

  // Reset recently updated state when selected element changes
  useEffect(() => {
    setRecentlyUpdated({});
  }, [selectedElement]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Helper function to handle element updates
  const handleElementUpdate = (key: keyof CompositionElement, value: any) => {
    if (onElementUpdate && selectedElement?.id) {
      const update = { [key]: value } as Partial<CompositionElement>;
      onElementUpdate(selectedElement.id, update);
      
      // Visual feedback for change
      setRecentlyUpdated(prev => ({ ...prev, [key]: true }));
      
      // Clear visual feedback after a delay
      setTimeout(() => {
        setRecentlyUpdated(prev => ({ ...prev, [key]: false }));
      }, 800);
    }
  };

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center mb-4">
          <div className="relative">
            <button 
              className="text-gray-700 hover:text-gray-900 focus:outline-none" 
              onClick={() => setShowMenu(!showMenu)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {showMenu && (
              <div 
                ref={menuRef}
                className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
              >
                <div className="py-1">
                  
                  <Link 
                    to="/"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <HomeIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Home Page
                  </Link>
                  
                  <a 
                    href="https://twitter.com/inkycut" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <HeartIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Follow Us
                  </a>
                  
                  <a 
                    href="https://github.com/inkylabsio/inkycut" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="mr-2 h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-gray-500 text-sm">
          {project?.user?.email && `Created by ${project.user.email}`}
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
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'explorer' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Project Assets</h3>
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
                {assets.length > 0 ? (
                  assets.map((asset) => (
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
                  ))
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <div className="text-center">
                      <DocumentIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium">No assets yet</p>
                      <p className="text-xs mt-1">Drag and drop files here to add assets</p>
                    </div>
                  </div>
                )}
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
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedPage ? `${selectedPage.name} Elements` : 'Page Elements'}
              </h3>
            </div>
            
            {selectedPage && selectedPage.elements ? (
              <div className="space-y-2">
                {selectedPage.elements.map((element: CompositionElement) => (
                  <div
                    key={element.id}
                    className={`p-3 rounded cursor-pointer border ${
                      selectedElement?.id === element.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => onElementSelect(element)}
                  >
                    <div className="flex items-center">
                      <ElementPreview element={element} className="w-12 h-12 mr-3" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {element.type === 'text' ? 
                            (element.text ? 
                              (element.text.length > 20 ? `${element.text.substring(0, 20)}...` : element.text) 
                              : 'Text Element'
                            ) : 
                            (element.src ? 
                              element.src.split('/').pop() || `${element.type} Element` 
                              : `${element.type} Element`)
                          }
                        </div>
                        <div className="text-xs text-gray-500 capitalize flex items-center">
                          <span className="mr-2">{element.type}</span>
                          {element.startTime !== undefined && element.endTime !== undefined && (
                            <span className="text-xs bg-gray-100 px-1 rounded">
                              {element.startTime}s - {element.endTime}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">
                  <DocumentIcon className="h-12 w-12 mx-auto text-gray-300" />
                </div>
                <p className="text-sm">
                  {selectedPage ? 'No elements in this page' : 'Click on a page block to view its elements'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
