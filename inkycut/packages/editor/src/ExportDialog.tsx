import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { XMarkIcon, DocumentArrowDownIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { projectAtom } from './atoms';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'json' | 'mp4' | 'webm';

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [project] = useAtom(projectAtom);

  const handleExport = () => {
    if (selectedFormat === 'json') {
      handleJSONExport();
    } else {
      // Show coming soon message for video formats
      alert(`${selectedFormat.toUpperCase()} export is coming soon! Currently, you can run:\n\nnpx @inkycut/render /path/to/project.json\n\nto generate the video.`);
    }
  };

  const handleJSONExport = () => {
    if (!project) {
      alert('No project to export');
      return;
    }

    setIsExporting(true);

    try {
      // Create JSON blob
      const jsonData = JSON.stringify(project, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name || 'project'}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export project');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Export Project</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-3">
                Choose export format:
              </label>
              
              <div className="space-y-3">
                {/* JSON Option */}
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={selectedFormat === 'json'}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <DocumentArrowDownIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">JSON Project File</div>
                      <div className="text-xs text-gray-500">Export project data as JSON file</div>
                    </div>
                  </div>
                </label>

                {/* MP4 Option */}
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="mp4"
                    checked={selectedFormat === 'mp4'}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        MP4 Video
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>
                      </div>
                      <div className="text-xs text-gray-500">Export as MP4 video file</div>
                    </div>
                  </div>
                </label>

                {/* WebM Option */}
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="webm"
                    checked={selectedFormat === 'webm'}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        WebM Video
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>
                      </div>
                      <div className="text-xs text-gray-500">Export as WebM video file</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {(selectedFormat === 'mp4' || selectedFormat === 'webm') && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  <strong>Coming Soon!</strong> Video export will be available in a future update.
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  For now, you can use: <code className="bg-blue-100 px-1 rounded">npx @inkycut/render /path/to/project.json</code>
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}