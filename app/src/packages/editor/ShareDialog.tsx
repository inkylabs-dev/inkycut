import React, { useState, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { 
  XMarkIcon, 
  ShareIcon, 
  ClipboardDocumentIcon, 
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { addUserMessageToQueueAtom } from './atoms';
import type { ShareDialogProps } from './types';

export default function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const addMessageToQueue = useSetAtom(addUserMessageToQueueAtom);

  const handleShare = () => {
    // Add the share command to the message queue with --yes flag for direct sharing
    // RightPanel will process it and show the result in the chat
    addMessageToQueue('/share --yes');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <ShareIcon className="h-5 w-5 mr-2" />
            Share Project
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center">
            <div className="mb-4">
              <ShareIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-500" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Share Your Project
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Create a secure shareable link for your project. The upload will be secured 
              with end-to-end encryption and the result will appear in the chat.
            </p>
            <button
              onClick={handleShare}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Generate Share Link
            </button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}