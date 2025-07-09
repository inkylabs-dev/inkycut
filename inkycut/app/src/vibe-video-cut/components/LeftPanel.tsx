import React, { useState, useEffect } from 'react';
import { 
  FolderIcon, 
  DocumentIcon, 
  MusicalNoteIcon,
  PhotoIcon,
  VideoCameraIcon,
  PlusIcon,
  HomeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from 'wasp/client/auth';
import { routes } from 'wasp/client/router';
import { Link } from 'react-router-dom';
import { CompositionElement } from './Composition';


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
  onElementUpdate?: (elementId: string, updatedData: Partial<CompositionElement>) => void;
}

export default function LeftPanel({ project, selectedElement, selectedPage, onElementSelect, onElementUpdate }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'elements' | 'properties'>('explorer');
  const [isDragOver, setIsDragOver] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState<{[key: string]: boolean}>({});
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

  // Reset recently updated state when selected element changes
  useEffect(() => {
    setRecentlyUpdated({});
  }, [selectedElement]);

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
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedPage ? `${selectedPage.name} Elements` : 'Page Elements'}
              </h3>
              <button className="p-1 hover:bg-gray-100 rounded">
                <PlusIcon className="h-4 w-4 text-gray-500" />
              </button>
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

        {activeTab === 'properties' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Properties</h3>
            {selectedElement ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={selectedElement.type || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    readOnly
                  />
                </div>
                
                {/* Position and size properties - show for all elements */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">X Position</label>
                    <input
                      type="number"
                      value={selectedElement.x}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['x'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleElementUpdate('x', value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Y Position</label>
                    <input
                      type="number"
                      value={selectedElement.y}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['y'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleElementUpdate('y', value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={selectedElement.width}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['width'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0) {
                          handleElementUpdate('width', value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={selectedElement.height}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['height'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0) {
                          handleElementUpdate('height', value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rotation (deg)</label>
                    <input
                      type="number"
                      value={selectedElement.rotation || 0}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['rotation'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleElementUpdate('rotation', value);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Z-index control for layering */}
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Layer Order (z-index)</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={selectedElement.zIndex || 0}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['zIndex'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleElementUpdate('zIndex', value);
                        }
                      }}
                    />
                    <div className="ml-2 flex">
                      <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-l"
                        title="Move Down"
                        onClick={() => {
                          const currentZ = selectedElement.zIndex || 0;
                          handleElementUpdate('zIndex', currentZ - 1);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-r border-l-0"
                        title="Move Up"
                        onClick={() => {
                          const currentZ = selectedElement.zIndex || 0;
                          handleElementUpdate('zIndex', currentZ + 1);
                        }}
                      >
                        ↑
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Higher values appear on top</p>
                </div>
                
                {/* Time properties - show for all elements */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="number"
                      value={selectedElement.startTime || 0}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['startTime'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      step="0.1"
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          handleElementUpdate('startTime', value);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="number"
                      value={selectedElement.endTime || 0}
                      className={`w-full px-3 py-2 border rounded-md text-sm ${
                        recentlyUpdated['endTime'] 
                          ? 'border-blue-500 bg-blue-50 transition-colors duration-300' 
                          : 'border-gray-300'
                      }`}
                      step="0.1"
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          handleElementUpdate('endTime', value);
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Text specific properties */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Text</label>
                      <textarea
                        value={selectedElement.text || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={3}
                        onChange={(e) => {
                          if (onElementUpdate && selectedElement?.id) {
                            onElementUpdate(selectedElement.id, { text: e.target.value });
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
                        <input
                          type="number"
                          value={selectedElement.fontSize || 16}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              const value = parseInt(e.target.value, 10);
                              if (!isNaN(value) && value > 0) {
                                onElementUpdate(selectedElement.id, { fontSize: value });
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Font Weight</label>
                        <select
                          value={selectedElement.fontWeight || "normal"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              onElementUpdate(selectedElement.id, { fontWeight: e.target.value });
                            }
                          }}
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="lighter">Lighter</option>
                          <option value="bolder">Bolder</option>
                          <option value="100">100</option>
                          <option value="200">200</option>
                          <option value="300">300</option>
                          <option value="400">400</option>
                          <option value="500">500</option>
                          <option value="600">600</option>
                          <option value="700">700</option>
                          <option value="800">800</option>
                          <option value="900">900</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={selectedElement.color || "#000000"}
                          className="w-10 h-10 p-1 border border-gray-300 rounded cursor-pointer"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              onElementUpdate(selectedElement.id, { color: e.target.value });
                            }
                          }}
                        />
                        <input
                          type="text"
                          value={selectedElement.color || "#000000"}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onChange={(e) => {
                            // Simple hex color validation
                            const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
                            if (colorRegex.test(e.target.value) && onElementUpdate && selectedElement?.id) {
                              onElementUpdate(selectedElement.id, { color: e.target.value });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Text Align</label>
                      <select
                        value={selectedElement.textAlign || "left"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        onChange={(e) => {
                          if (onElementUpdate && selectedElement?.id) {
                            onElementUpdate(selectedElement.id, { 
                              textAlign: e.target.value as 'left' | 'center' | 'right' 
                            });
                          }
                        }}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Video specific properties */}
                {selectedElement.type === 'video' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Video Start Time</label>
                        <input
                          type="number"
                          value={selectedElement.subclipStart || 0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          step="0.1"
                          min="0"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0) {
                                // Using startTime as the property that exists in CompositionElement
                                onElementUpdate(selectedElement.id, { startTime: value });
                              }
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Video End Time</label>
                        <input
                          type="number"
                          value={selectedElement.subclipEnd || 0}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          step="0.1"
                          min="0"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0) {
                                // Using endTime as the property that exists in CompositionElement
                                onElementUpdate(selectedElement.id, { endTime: value });
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    {selectedElement.src && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={selectedElement.src}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            onChange={(e) => {
                              if (onElementUpdate && selectedElement?.id) {
                                onElementUpdate(selectedElement.id, { src: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Opacity</label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={selectedElement.opacity ?? 1}
                          className="flex-1 mr-2"
                          onChange={(e) => {
                            if (onElementUpdate && selectedElement?.id) {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                onElementUpdate(selectedElement.id, { opacity: value });
                              }
                            }
                          }}
                        />
                        <span className="text-sm">
                          {Math.round((selectedElement.opacity ?? 1) * 100)}%
                        </span>
                      </div>
                    </div>
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
