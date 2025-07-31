import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import Markdown from 'react-markdown';
import { XMarkIcon, DocumentArrowDownIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { addUserMessageToQueueAtom } from './atoms';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: ExportFormat;
  onFormatChange?: (format: ExportFormat) => void;
}

type ExportFormat = 'json' | 'mp4' | 'webm';

export default function ExportDialog({ 
  isOpen, 
  onClose, 
  initialFormat = 'json', 
  onFormatChange
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(initialFormat);
  const addMessageToQueue = useSetAtom(addUserMessageToQueueAtom);

  // Sync with external format state
  useEffect(() => {
    setSelectedFormat(initialFormat);
  }, [initialFormat]);

  const handleFormatChange = (format: ExportFormat) => {
    setSelectedFormat(format);
    if (onFormatChange) {
      onFormatChange(format);
    }
  };

  const handleExport = () => {
    if (selectedFormat === 'json') {
      // Add the export command to the message queue
      // RightPanel will process it naturally as if the user typed it
      addMessageToQueue('/export --yes --format json');
      onClose();
    } else {
      // Show coming soon message for video formats
      alert(`${selectedFormat.toUpperCase()} export is coming soon! Currently, you can run:\n\nnpx @inkycut/render /path/to/project.json\n\nto generate the video.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export Project</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">
                Choose export format:
              </label>
              
              <div className="space-y-3">
                {/* JSON Option */}
                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={selectedFormat === 'json'}
                    onChange={(e) => handleFormatChange(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="ml-3 flex items-center">
                    <DocumentArrowDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">JSON Project File</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Export project data as JSON file</div>
                    </div>
                  </div>
                </label>

                {/* MP4 Option */}
                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="mp4"
                    checked={selectedFormat === 'mp4'}
                    onChange={(e) => handleFormatChange(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="ml-3 flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        MP4 Video
                        <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">Coming Soon</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Export as MP4 video file</div>
                    </div>
                  </div>
                </label>

                {/* WebM Option */}
                <label className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="webm"
                    checked={selectedFormat === 'webm'}
                    onChange={(e) => handleFormatChange(e.target.value as ExportFormat)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="ml-3 flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        WebM Video
                        <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">Coming Soon</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Export as WebM video file</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {(selectedFormat === 'mp4' || selectedFormat === 'webm') && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  <strong>Coming Soon!</strong> Video export will be available in a future update.
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                  
                  <Markdown>
                    {`
For now, you can follow the below instruction to render a video:

    $ git clone git@github.com:inkylabs-dev/inkycut.git
    $ cd inkycut/app
    $ npm install
    $ npm run build
    $ npm run render -- -i /path/to/project.json
                    `}
                  </Markdown>                    
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}