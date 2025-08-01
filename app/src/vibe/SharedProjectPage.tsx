import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { EyeIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LeftPanel, MiddlePanel, RightPanel } from '../packages/editor';
import {
  projectAtom,
  updateProjectAtom,
  selectedElementAtom,
  selectedPageAtom,
  chatMessagesAtom,
  loadingAtom,
  errorAtom,
  setLoadingAtom,
  setErrorAtom,
  updateElementAtom,
  updateCompositionAtom,
  addChatMessageAtom,
  setSelectedElementAtom,
  setSelectedPageAtom,
  ensureCompositionIDs,
  isSharedProjectAtom,
  importFilesAtom,
  forkProjectAtom,
} from '../packages/editor';
import { getSharedProject } from 'wasp/client/operations';
import { parseShareableKey, importKey, decryptData } from '../packages/editor/utils/encryptionUtils';

export default function SharedProjectPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [loadingState, setLoadingState] = useState<'loading' | 'decrypting' | 'error' | 'success' | 'missing-key'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Jotai state
  const [project, setProject] = useAtom(projectAtom);
  const setIsLoading = useSetAtom(setLoadingAtom);
  const setGlobalError = useSetAtom(setErrorAtom);
  const setUpdateProject = useSetAtom(updateProjectAtom);
  const setChatMessages = useSetAtom(chatMessagesAtom);
  const setIsSharedProject = useSetAtom(isSharedProjectAtom);
  const importFiles = useSetAtom(importFilesAtom);
  const forkProject = useSetAtom(forkProjectAtom);

  useEffect(() => {
    if (!shareId) {
      setLoadingState('error');
      setError('Invalid share link');
      return;
    }

    loadSharedProject();
  }, [shareId]);

  const loadSharedProject = async () => {
    try {
      setLoadingState('loading');
      setError(null);

      // Get the decryption key from the URL fragment
      const urlFragment = window.location.hash;
      const keyMatch = urlFragment.match(/key=([^&]+)/);
      
      if (!keyMatch) {
        setLoadingState('missing-key');
        setError('No decryption key found in URL. The share link appears to be incomplete.');
        return;
      }

      const shareableKey = keyMatch[1];

      // Get the encrypted project data
      const result = await getSharedProject({ shareId: shareId! });
      
      setLoadingState('decrypting');

      // Parse the encrypted data
      const encryptedPayload = JSON.parse(result.encryptedData);
      const { encrypted, iv } = encryptedPayload;

      // Import the key and decrypt the data
      const keyBase64 = parseShareableKey(shareableKey);
      const cryptoKey = await importKey(keyBase64);
      const decryptedJson = await decryptData(encrypted, iv, cryptoKey);
      const project = JSON.parse(decryptedJson);

      // Ensure the project has proper IDs
      if (project.composition) {
        project.composition = ensureCompositionIDs(project.composition);
      }

      // Extract files from project and store in memory
      const projectFiles = project.files || [];
      
      // Set as shared project (this switches to memory storage)
      setIsSharedProject(true);
      
      // Import files to memory storage
      if (projectFiles.length > 0) {
        await importFiles(projectFiles);
      }

      // Set the project in read-only mode without files
      const readOnlyProject = {
        ...project,
        files: [], // Remove files from project data
        appState: {
          ...project.appState,
          viewMode: 'view' as const,
          selectedPageId: project.composition?.pages?.[0]?.id || null,
          selectedElementId: null,
        }
      };

      setProject(readOnlyProject);
      setLoadingState('success');

    } catch (error: unknown) {
      console.error('Error loading shared project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLoadingState('error');
      
      if (errorMessage.includes('decrypt') || errorMessage.includes('key')) {
        setError('Failed to decrypt project. The decryption key may be invalid or corrupted.');
      } else if (errorMessage.includes('not found')) {
        setError('Shared project not found. The link may have expired or been deleted.');
      } else {
        setError(`Failed to load shared project: ${errorMessage}`);
      }
    }
  };

  const handleGoToEditor = () => {
    navigate('/vibe');
  };

  const handleForkAndEdit = async () => {
    if (project) {
      try {
        // Fork the project (migrates files from memory to IndexedDB)
        await forkProject();
        
        // Create the forked project with new metadata
        const forkedProject = {
          ...project,
          id: `forked-${Date.now()}`, // Generate new ID
          name: `${project.name} (Forked)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Reset appState for editing
          appState: {
            selectedElementId: null,
            selectedPageId: project.composition?.pages?.[0]?.id || null,
            viewMode: 'edit' as const,
            zoomLevel: 1,
            showGrid: false,
            isLoading: false,
            error: null,
            history: { past: [], future: [] }
          }
        };

        // Update the project
        setProject(forkedProject);
        
        // Clear chat messages and reset to welcome message
        setChatMessages([
          {
            id: 1,
            role: 'assistant',
            content: 'Project forked successfully! I\'m your AI assistant. How can I help you edit your forked project?',
            timestamp: new Date().toISOString()
          }
        ]);
        
        // Navigate to the editor
        navigate('/vibe');
      } catch (error) {
        console.error('Failed to fork project:', error);
        alert('Failed to fork project. Please try again.');
      }
    }
  };

  if (loadingState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Shared Project</h2>
          <p className="text-gray-600 dark:text-gray-300">Fetching encrypted project data...</p>
        </div>
      </div>
    );
  }

  if (loadingState === 'decrypting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Decrypting Project</h2>
          <p className="text-gray-600 dark:text-gray-300">Decrypting project data with end-to-end encryption...</p>
        </div>
      </div>
    );
  }

  if (loadingState === 'error' || loadingState === 'missing-key') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-boxdark-2">
        <div className="text-center max-w-md mx-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {loadingState === 'missing-key' ? 'Invalid Share Link' : 'Error Loading Project'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 mr-2"
            >
              Try Again
            </button>
            <button
              onClick={handleGoToEditor}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-strokedark text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-boxdark hover:bg-gray-50 dark:hover:bg-boxdark-2"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go to Editor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show the editor in view mode (no navbar, like VibeEditorPage)
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 dark:bg-boxdark-2">
      {/* Main content area - no top banner/navbar */}
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Panel - Files / Elements (read-only) */}
        <div className="w-80 bg-white dark:bg-boxdark border-r border-gray-200 dark:border-strokedark flex-shrink-0 overflow-hidden">
          <LeftPanel 
            isReadOnly={false} // Allow menu to be shown
            disableFileUpload={true} // Disable file uploads on shared projects
            menuConfig={{
              showImport: false,
              showExport: true,
              showShare: false,
              showForkAndEdit: true,
              showReset: false,
              showSettings: true,
              showHome: true,
              showFollow: true,
              showGitHub: true,
            }}
            onForkAndEdit={handleForkAndEdit}
          />
        </div>

        {/* Middle Panel - Frozen Code Editor */}
        <div className="flex-1 overflow-hidden">
          <MiddlePanel
            onTimelineUpdate={() => {}} // No-op in read-only mode
            onCompositionUpdate={() => {}} // No-op in read-only mode
            onPageSelect={() => {}} // No-op in read-only mode
            isReadOnly={true}
          />
        </div>

        {/* Right Panel - Read-only mode with frozen code editor */}
        <div className="w-80 bg-gray-50 dark:bg-boxdark border-l border-gray-200 dark:border-strokedark flex-shrink-0 overflow-hidden">
          <RightPanel 
            onSendMessage={() => {}} 
            isReadOnly={true}
            readOnlyMessage="The upload has been secured with end-to-end encryption, which means that InkyCut server and third parties can't read the content."
          />
        </div>
      </div>
    </div>
  );
}
