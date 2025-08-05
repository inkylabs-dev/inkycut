import React from 'react';
import { useServiceWorker } from '../utils/serviceWorker';

export default function ServiceWorkerStatus() {
  const { isSupported, isRegistered, version, clearCache, sendMessage } = useServiceWorker();

  const handleClearCache = async () => {
    const success = await clearCache();
    alert(success ? 'Cache cleared successfully' : 'Failed to clear cache');
  };

  const handleTestMessage = async () => {
    try {
      const response = await sendMessage({ type: 'GET_VERSION' });
      alert(`Service Worker version: ${response.version}`);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        Service Workers are not supported in this browser
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-semibold text-blue-900 mb-2">Service Worker Status</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Supported:</strong> {isSupported ? '✅' : '❌'}
        </div>
        <div>
          <strong>Registered:</strong> {isRegistered ? '✅' : '❌'}
        </div>
        <div>
          <strong>Version:</strong> {version}
        </div>
        <div className="pt-2 space-x-2">
          <button
            onClick={handleTestMessage}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Test Message
          </button>
          <button
            onClick={handleClearCache}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}