import React, { useState } from 'react';
import FileTab from './FileTab';
import ElementTab from './ElementTab';

interface InteractiveTabsProps {
  disableFileUpload?: boolean;
}

export default function InteractiveTabs({ disableFileUpload = false }: InteractiveTabsProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'elements'>('files');

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-strokedark">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'files'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'elements'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Elements
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'files' && (
          <FileTab disableFileUpload={disableFileUpload} />
        )}

        {activeTab === 'elements' && (
          <ElementTab />
        )}
      </div>
    </div>
  );
}
