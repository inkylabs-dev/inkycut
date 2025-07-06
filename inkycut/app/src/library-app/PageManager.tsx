import React, { useState, useRef } from 'react';
import { createPage, updatePage, deletePage, reorderPages } from 'wasp/client/operations';
import { type Page, type File } from 'wasp/entities';
import { FiPlus, FiTrash2, FiEdit2, FiVideo, FiMove } from 'react-icons/fi';
import VideoUploadComponent from './VideoUploadComponent';
import VideoPreview from './VideoPreview';

type PageWithFile = Page & { videoFile: File | null };

interface PageManagerProps {
  libraryId: string;
  pages: PageWithFile[];
  onPagesChange: (pages: PageWithFile[]) => void;
}

interface EditingPage {
  id: string;
  title: string;
  llmNotes: string;
}

export default function PageManager({ libraryId, pages, onPagesChange }: PageManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editingPage, setEditingPage] = useState<EditingPage | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddPage = async (insertIndex?: number) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const newPage = await createPage({
        libraryId,
        title: `Page ${pages.length + 1}`,
        llmNotes: '',
        insertIndex,
      });
      
      // Update pages list
      if (insertIndex !== undefined) {
        const updatedPages = [...pages];
        updatedPages.splice(insertIndex, 0, newPage);
        onPagesChange(updatedPages);
      } else {
        onPagesChange([...pages, newPage]);
      }
    } catch (error) {
      console.error('Error creating page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await deletePage({ id: pageId });
      
      // Update pages list
      const updatedPages = pages.filter(page => page.id !== pageId);
      onPagesChange(updatedPages);
    } catch (error) {
      console.error('Error deleting page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePage = async (pageId: string, updates: { title?: string; llmNotes?: string }) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const updatedPage = await updatePage({ id: pageId, ...updates });
      
      // Update pages list
      const updatedPages = pages.map(page => 
        page.id === pageId ? updatedPage : page
      );
      onPagesChange(updatedPages);
    } catch (error) {
      console.error('Error updating page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPage) return;
    
    await handleUpdatePage(editingPage.id, {
      title: editingPage.title,
      llmNotes: editingPage.llmNotes,
    });
    
    setEditingPage(null);
  };

  const handleVideoUploaded = (updatedPage: any, pageId: string) => {
    // Update the pages list to reflect the new video file
    const updatedPages = pages.map(page => 
      page.id === pageId ? updatedPage : page
    );
    onPagesChange(updatedPages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const reorderedPages = [...pages];
    const draggedPage = reorderedPages[draggedIndex];
    reorderedPages.splice(draggedIndex, 1);
    reorderedPages.splice(dropIndex, 0, draggedPage);

    // Update local state immediately
    onPagesChange(reorderedPages);
    setDraggedIndex(null);

    // Save the new order
    try {
      await reorderPages({
        libraryId,
        pageIds: reorderedPages.map(page => page.id),
      });
    } catch (error) {
      console.error('Error reordering pages:', error);
      // Revert on error
      onPagesChange(pages);
    }
  };

  const triggerFileUpload = (pageId: string) => {
    // This function is no longer needed as we use the VideoUploadComponent
    console.log('Video upload for page:', pageId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Pages ({pages.length})
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => handleAddPage()}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            <FiPlus className="mr-1" />
            Add Page
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
            <FiVideo className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No pages</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first page.
            </p>
            <div className="mt-6">
              <button
                onClick={() => handleAddPage()}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <FiPlus className="mr-2" />
                Add Your First Page
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pages.map((page, index) => (
            <div
              key={page.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-4 transition-all duration-200 ${
                draggedIndex === index ? 'opacity-50' : ''
              } border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <FiMove className="text-gray-400 mt-1 cursor-move" />
                  <div className="flex-1 min-w-0">
                    {editingPage?.id === page.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Page Title
                          </label>
                          <input
                            type="text"
                            value={editingPage?.title || ''}
                            onChange={(e) => editingPage && setEditingPage({ ...editingPage, title: e.target.value })}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white text-sm transition-colors"
                            placeholder="Enter page title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            LLM Notes
                          </label>
                          <textarea
                            value={editingPage?.llmNotes || ''}
                            onChange={(e) => editingPage && setEditingPage({ ...editingPage, llmNotes: e.target.value })}
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white text-sm transition-colors resize-none"
                            placeholder="Enter notes for LLM processing"
                          />
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditingPage(null)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {page.title}
                            </p>
                            {page.llmNotes && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                  <span className="font-medium text-gray-700 dark:text-gray-200">LLM Notes:</span>
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                  {page.llmNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Video Upload Area */}
                        <div className="mt-3">
                          {page.videoFile ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                                  <FiVideo className="mr-1" />
                                  {page.videoFile.name}
                                </div>
                              </div>
                              {/* Video Preview */}
                              <div className="relative">
                                <VideoPreview videoFile={page.videoFile} />
                              </div>
                              <VideoUploadComponent
                                pageId={page.id}
                                onVideoUploaded={(uploadedFile) => handleVideoUploaded(uploadedFile, page.id)}
                                className="mt-2"
                              />
                            </div>
                          ) : (
                            <VideoUploadComponent
                              pageId={page.id}
                              onVideoUploaded={(uploadedFile) => handleVideoUploaded(uploadedFile, page.id)}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {editingPage?.id !== page.id && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAddPage(index)}
                      className="text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors"
                      title="Add page above"
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingPage({
                        id: page.id,
                        title: page.title,
                        llmNotes: page.llmNotes || '',
                      })}
                      className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors"
                      title="Edit page"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors"
                      title="Delete page"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
