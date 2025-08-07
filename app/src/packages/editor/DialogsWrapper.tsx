import React from 'react';
import SettingsDialog from './SettingsDialog';
import ImportDialog from './ImportDialog';
import ExportDialog from './ExportDialog';
import ShareDialog from './ShareDialog';
import { JsonModelDialog } from './JsonModelDialog';

interface DialogsWrapperProps {
  showSettings: boolean;
  onCloseSettings: () => void;
  showImportDialog: boolean;
  onCloseImportDialog: () => void;
  showExportDialog: boolean;
  onCloseExportDialog: () => void;
  exportFormat?: 'json' | 'mp4' | 'webm';
  onFormatChange?: (format: 'json' | 'mp4' | 'webm') => void;
  showShareDialog: boolean;
  onCloseShareDialog: () => void;
  showJsonModelDialog: boolean;
  onCloseJsonModelDialog: () => void;
  onCompositionUpdate?: (composition: any) => void;
}

export default function DialogsWrapper({
  showSettings,
  onCloseSettings,
  showImportDialog,
  onCloseImportDialog,
  showExportDialog,
  onCloseExportDialog,
  exportFormat,
  onFormatChange,
  showShareDialog,
  onCloseShareDialog,
  showJsonModelDialog,
  onCloseJsonModelDialog,
  onCompositionUpdate
}: DialogsWrapperProps) {
  return (
    <>
      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={onCloseSettings}
      />

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={onCloseImportDialog}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={onCloseExportDialog}
        initialFormat={exportFormat}
        onFormatChange={onFormatChange}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={onCloseShareDialog}
      />

      {/* JSON Model Dialog */}
      <JsonModelDialog
        isOpen={showJsonModelDialog}
        onClose={onCloseJsonModelDialog}
        onCompositionUpdate={onCompositionUpdate}
      />
    </>
  );
}
