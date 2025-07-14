import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { XMarkIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load API key from localStorage when dialog opens
      const savedApiKey = localStorage.getItem('openai-api-key') || '';
      setApiKey(savedApiKey);
      setSaveMessage('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Validate API key format (basic check)
      if (apiKey && !apiKey.startsWith('sk-')) {
        throw new Error('OpenAI API key should start with "sk-"');
      }

      // Save to localStorage
      if (apiKey) {
        localStorage.setItem('openai-api-key', apiKey);
      } else {
        localStorage.removeItem('openai-api-key');
      }

      setSaveMessage(apiKey ? 'API key saved successfully!' : 'API key cleared.');
      
      // Auto-close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <CogIcon className="h-6 w-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* OpenAI API Key Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <KeyIcon className="inline h-4 w-4 mr-1" />
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showApiKey ? (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your API key is stored locally and used for AI video editing features.
              <br />
              Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">OpenAI Platform</a>.
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`p-3 rounded-md ${
              saveMessage.includes('success') || saveMessage.includes('cleared')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <p className="text-sm">{saveMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Import CogIcon separately since it's also used here
import { CogIcon } from '@heroicons/react/24/outline';