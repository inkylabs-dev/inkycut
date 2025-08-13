import React from 'react';
import { useAtom } from 'jotai';
import { 
  FolderIcon, 
  DocumentTextIcon, 
  Squares2X2Icon, 
  SpeakerWaveIcon, 
  PencilSquareIcon 
} from '@heroicons/react/24/outline';
import { activeTabAtom, editContextAtom } from './atoms';
import FileTab from './FileTab';
import ElementTab from './ElementTab';
import PagesTab from './PagesTab';
import AudioTab from './AudioTab';
import EditTab from './EditTab';

interface InteractiveTabsProps {
  disableFileUpload?: boolean;
}

export default function InteractiveTabs({ disableFileUpload = false }: InteractiveTabsProps) {
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const [editContext, setEditContext] = useAtom(editContextAtom);
  
  // If edit tab is active but no edit context, switch to files tab
  React.useEffect(() => {
    if (activeTab === 'edit' && !editContext) {
      setActiveTab('files');
    }
  }, [activeTab, editContext, setActiveTab]);

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-strokedark">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center ${
            activeTab === 'files'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title="Files"
        >
          <FolderIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center ${
            activeTab === 'pages'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title="Pages"
        >
          <DocumentTextIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center ${
            activeTab === 'elements'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title="Elements"
        >
          <Squares2X2Icon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setActiveTab('audios')}
          className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center ${
            activeTab === 'audios'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          title="Audios"
        >
          <SpeakerWaveIcon className="h-5 w-5" />
        </button>
        {editContext && (
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center ${
              activeTab === 'edit'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title={`Edit ${editContext.type === 'page' ? 'Page' : 'Audio'}`}
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>
        )}
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
