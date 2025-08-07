import React from 'react';
import { useAtom } from 'jotai';
import { projectAtom, addUserMessageToQueueAtom } from './atoms';
import { CompositionPage } from '../composition/types';
import PageListItem from './PageListItem';

export default function PagesTab() {
  const [project] = useAtom(projectAtom);
  const [, addUserMessageToQueue] = useAtom(addUserMessageToQueueAtom);

  if (!project?.composition?.pages) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pages</h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 py-2">No pages found</div>
      </div>
    );
  }

  const pages = project.composition.pages;

  const handleDeletePage = (page: CompositionPage) => {
    const command = `/del-page --id ${page.id}`;
    addUserMessageToQueue(command);
  };

  const handleCopyPageId = (page: CompositionPage) => {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern Clipboard API
      navigator.clipboard.writeText(page.id).catch(() => {
        console.error('Failed to copy page ID to clipboard');
      });
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = page.id;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy page ID to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pages</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="space-y-2">
        {pages.map((page) => (
          <PageListItem
            key={page.id}
            page={page}
            fps={project.composition.fps}
            onDelete={() => handleDeletePage(page)}
            onCopyId={() => handleCopyPageId(page)}
          />
        ))}
      </div>
    </div>
  );
}