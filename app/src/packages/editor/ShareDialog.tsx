import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  XMarkIcon, 
  ShareIcon, 
  ClipboardDocumentIcon, 
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { projectAtom } from './atoms';
import { generateKey, exportKey, encryptData, generateShareableKey } from './utils/encryptionUtils';
interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>;
}

interface ShareState {
  status: 'initial' | 'generating' | 'success' | 'error';
  shareableLink: string;
  error: string | null;
}

export default function ShareDialog({ isOpen, onClose, onShare }: ShareDialogProps) {
  const [project] = useAtom(projectAtom);
  const [shareState, setShareState] = useState<ShareState>({
    status: 'initial',
    shareableLink: '',
    error: null
  });
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setShareState({
        status: 'initial',
        shareableLink: '',
        error: null
      });
      setCopied(false);
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!project) {
      setShareState({
        status: 'error',
        shareableLink: '',
        error: 'No project to share'
      });
      return;
    }

    setShareState({
      status: 'generating',
      shareableLink: '',
      error: null
    });

    try {
      // Generate encryption key
      const key = await generateKey();
      const keyBase64 = await exportKey(key);
      const shareableKey = generateShareableKey(keyBase64);

      // Prepare project data for sharing (include files in encrypted data)
      const projectToShare = {
        ...project,
        // Include files in encrypted data for full project sharing
        files: project.files || [],
        appState: {
          selectedElementId: null,
          selectedPageId: project.composition?.pages?.[0]?.id || null,
          viewMode: 'view' as const,
          zoomLevel: 1,
          showGrid: false,
          isLoading: false,
          error: null,
          history: { past: [], future: [] }
        }
      };

      // Encrypt the project data
      const projectJson = JSON.stringify(projectToShare);
      const { encrypted, iv } = await encryptData(projectJson, key);

      // Combine encrypted data and IV
      const encryptedPayload = JSON.stringify({ encrypted, iv });

      // Call backend API to upload to S3 and get share ID
      const shareResponse = await onShare({
        encryptedData: encryptedPayload,
        projectName: project.name || 'Untitled Project'
      });

      const { shareId } = shareResponse;

      // Generate the shareable link
      const shareableLink = `${window.location.origin}/shared/${shareId}#key=${shareableKey}`;

      setShareState({
        status: 'success',
        shareableLink,
        error: null
      });

    } catch (error) {
      console.error('Share failed:', error);
      setShareState({
        status: 'error',
        shareableLink: '',
        error: error instanceof Error ? error.message : 'Failed to share project'
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareState.shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareState.shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ShareIcon className="h-5 w-5 mr-2" />
            Share Project
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Initial state */}
          {shareState.status === 'initial' && (
            <div className="text-center">
              <div className="mb-4">
                <ShareIcon className="h-16 w-16 mx-auto text-gray-300" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Share Your Project
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Create a secure shareable link for your project. The upload will be secured 
                with end-to-end encryption.
              </p>
              <button
                onClick={handleShare}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                Generate Share Link
              </button>
            </div>
          )}

          {/* Generating state */}
          {shareState.status === 'generating' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Generating...
              </h4>
              <p className="text-sm text-gray-600">
                Encrypting and uploading your project securely...
              </p>
            </div>
          )}

          {/* Success state */}
          {shareState.status === 'success' && (
            <div>
              <div className="mb-4 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckIcon className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Share Link Generated!
                </h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shareable Link
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={shareState.shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50 text-gray-600"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="h-4 w-4 mr-1 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-600">
                        <strong>End-to-End Encryption:</strong> The upload has been secured 
                        with end-to-end encryption, which means that InkyCut server and 
                        third parties can't read the content.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {shareState.status === 'error' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Share Failed
                </h4>
                <p className="text-sm text-red-600 mb-4">
                  {shareState.error}
                </p>
              </div>
              <button
                onClick={handleShare}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {shareState.status === 'success' ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}