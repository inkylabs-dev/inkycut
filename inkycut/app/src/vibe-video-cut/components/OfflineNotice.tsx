import React from 'react';

interface OfflineNoticeProps {
  className?: string;
}

const OfflineNotice: React.FC<OfflineNoticeProps> = ({ className = '' }) => {
  return (
    <div className={`p-4 border rounded-lg bg-gray-50 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold text-gray-700">Offline Mode</h3>
      <p className="text-sm text-gray-600 mt-2">
        This app is running completely offline. All data is stored locally in your browser.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        No server connection is required for this application to work.
      </p>
    </div>
  );
};

export default OfflineNotice;
