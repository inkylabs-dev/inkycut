import React, { useState, useEffect } from 'react';
import { XMarkIcon, KeyIcon, EyeIcon, EyeSlashIcon, SwatchIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAtom } from 'jotai';
import useColorMode from './hooks/useColorMode';
import { ThemeMode, agentSettingsAtom } from './atoms';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [colorMode, setColorMode] = useColorMode();
  const [agentSettings, setAgentSettings] = useAtom(agentSettingsAtom);

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

      setSaveMessage(apiKey ? 'Settings saved successfully!' : 'API key cleared.');
      
      // Auto-close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (theme: ThemeMode) => {
    setColorMode(theme);
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
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-strokedark flex-shrink-0">
          <div className="flex items-center space-x-2">
            <CogIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Theme Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <SwatchIcon className="inline h-4 w-4 mr-1" />
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => handleThemeChange(theme)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors capitalize ${
                    colorMode === theme
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Choose how the editor should appear. System matches your device's theme preference.
            </p>
          </div>

          {/* OpenAI API Key Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your API key is stored locally and used for AI video editing features.
              <br />
              Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-500">OpenAI Platform</a>.
            </p>
          </div>

          {/* Agent Settings Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <BoltIcon className="inline h-4 w-4 mr-1" />
              Agent Settings
            </label>
            
            {/* Max Steps Setting */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Maximum Steps
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={agentSettings.maxSteps}
                    onChange={(e) => setAgentSettings({
                      ...agentSettings,
                      maxSteps: parseInt(e.target.value)
                    })}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">
                    {agentSettings.maxSteps}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum number of steps the agent can take to achieve your goal.
                </p>
              </div>

              {/* Temperature Setting */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Creativity Level
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={agentSettings.temperature}
                    onChange={(e) => setAgentSettings({
                      ...agentSettings,
                      temperature: parseFloat(e.target.value)
                    })}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">
                    {agentSettings.temperature.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Higher values make the agent more creative but potentially less focused.
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  AI Model
                </label>
                <select
                  value={agentSettings.model}
                  onChange={(e) => setAgentSettings({
                    ...agentSettings,
                    model: e.target.value
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choose the AI model for agent operations. GPT-4o offers the best performance.
                </p>
              </div>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`p-3 rounded-md ${
              saveMessage.includes('success') || saveMessage.includes('cleared')
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
            }`}>
              <p className="text-sm">{saveMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-gray-800 rounded-b-lg flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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