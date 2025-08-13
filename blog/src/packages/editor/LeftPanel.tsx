import React, { useState } from 'react';
import EditorMenu from './EditorMenu';
import InteractiveTabs from './InteractiveTabs';
import DialogsWrapper from './DialogsWrapper';

interface MenuConfig {
  showImport?: boolean;
  showExport?: boolean;
  showShare?: boolean;
  showForkAndEdit?: boolean;
  showReset?: boolean;
  showSettings?: boolean;
  showHome?: boolean;
  showFollow?: boolean;
  showGitHub?: boolean;
  showJsonModel?: boolean;
}

interface LeftPanelProps {
  isReadOnly?: boolean;
  disableFileUpload?: boolean;
  menuConfig?: MenuConfig;
  onForkAndEdit?: () => void;
  showImportDialog?: boolean;
  setShowImportDialog?: (show: boolean) => void;
  showExportDialog?: boolean;
  setShowExportDialog?: (show: boolean) => void;
  exportFormat?: 'json' | 'mp4' | 'webm';
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void;
  showShareDialog?: boolean;
  setShowShareDialog?: (show: boolean) => void;
  showJsonModelDialog?: boolean;
  setShowJsonModelDialog?: (show: boolean) => void;
  onCompositionUpdate?: (composition: any) => void;
}

export default function LeftPanel({ 
  isReadOnly = false,
  disableFileUpload = false,
  menuConfig = {
    showImport: true,
    showExport: true,
    showShare: true,
    showForkAndEdit: false,
    showReset: true,
    showSettings: true,
    showHome: true,
    showFollow: true,
    showGitHub: true,
    showJsonModel: true,
  },
  onForkAndEdit,
  showImportDialog: propShowImportDialog,
  setShowImportDialog: propSetShowImportDialog,
  showExportDialog: propShowExportDialog,
  setShowExportDialog: propSetShowExportDialog,
  exportFormat: propExportFormat,
  setExportFormat: propSetExportFormat,
  showShareDialog: propShowShareDialog,
  setShowShareDialog: propSetShowShareDialog,
  showJsonModelDialog: propShowJsonModelDialog,
  setShowJsonModelDialog: propSetShowJsonModelDialog,
  onCompositionUpdate
}: LeftPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [internalShowImportDialog, setInternalShowImportDialog] = useState(false);
  const [internalShowExportDialog, setInternalShowExportDialog] = useState(false);
  const [internalShowShareDialog, setInternalShowShareDialog] = useState(false);
  const [internalShowJsonModelDialog, setInternalShowJsonModelDialog] = useState(false);
  
  // Use prop-based dialog state when available, otherwise use internal state
  const showImportDialog = propShowImportDialog !== undefined ? propShowImportDialog : internalShowImportDialog;
  const setShowImportDialog = propSetShowImportDialog !== undefined ? propSetShowImportDialog : setInternalShowImportDialog;
  
  const showExportDialog = propShowExportDialog !== undefined ? propShowExportDialog : internalShowExportDialog;
  const setShowExportDialog = propSetShowExportDialog !== undefined ? propSetShowExportDialog : setInternalShowExportDialog;
  
  const showShareDialog = propShowShareDialog !== undefined ? propShowShareDialog : internalShowShareDialog;
  const setShowShareDialog = propSetShowShareDialog !== undefined ? propSetShowShareDialog : setInternalShowShareDialog;
  
  const showJsonModelDialog = propShowJsonModelDialog !== undefined ? propShowJsonModelDialog : internalShowJsonModelDialog;
  const setShowJsonModelDialog = propSetShowJsonModelDialog !== undefined ? propSetShowJsonModelDialog : setInternalShowJsonModelDialog;

  return (
    <div className="h-full flex flex-col">
      {/* Editor Menu */}
      <EditorMenu
        isReadOnly={isReadOnly}
        menuConfig={menuConfig}
        onForkAndEdit={onForkAndEdit}
        onShowImportDialog={() => setShowImportDialog(true)}
        onShowExportDialog={() => setShowExportDialog(true)}
        onShowShareDialog={() => setShowShareDialog(true)}
        onShowJsonModelDialog={() => setShowJsonModelDialog(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      {/* Interactive Tabs */}
      <InteractiveTabs disableFileUpload={disableFileUpload} />

      {/* All Dialogs */}
      <DialogsWrapper
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        showImportDialog={showImportDialog}
        onCloseImportDialog={() => setShowImportDialog(false)}
        showExportDialog={showExportDialog}
        onCloseExportDialog={() => setShowExportDialog(false)}
        exportFormat={propExportFormat}
        onFormatChange={propSetExportFormat}
        showShareDialog={showShareDialog}
        onCloseShareDialog={() => setShowShareDialog(false)}
        showJsonModelDialog={showJsonModelDialog}
        onCloseJsonModelDialog={() => setShowJsonModelDialog(false)}
        onCompositionUpdate={onCompositionUpdate}
      />
    </div>
  );
}
