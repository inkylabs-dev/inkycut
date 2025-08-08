import React, { useState } from 'react';
import FileTab from './FileTab';
import ElementTab from './ElementTab';
import PagesTab from './PagesTab';
import AudioTab from './AudioTab';
import EditTab from './EditTab';

interface InteractiveTabsProps {
  disableFileUpload?: boolean;
}

export default function InteractiveTabs({ disableFileUpload = false }: InteractiveTabsProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'elements' | 'pages' | 'audios' | 'edit'>('files');

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-strokedark">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'files'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'pages'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Pages
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'elements'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setActiveTab('audios')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'audios'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Audios
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'edit'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Edit
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {activeTab === 'files' && (
          <FileTab disableFileUpload={disableFileUpload} />
        )}

        {activeTab === 'pages' && (
          <PagesTab />
        )}

        {activeTab === 'elements' && (
          <ElementTab />
        )}

        {activeTab === 'audios' && (
          <AudioTab />
        )}

        {activeTab === 'edit' && (
          <EditTab />
        )}
      </div>
    </div>
  );
}
