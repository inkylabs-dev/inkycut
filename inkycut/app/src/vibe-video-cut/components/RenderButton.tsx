import React, { useState, useEffect } from 'react';

interface RenderButtonProps {
  projectId: string;
  projectData: any;
}

const RenderButton: React.FC<RenderButtonProps> = ({ projectId, projectData }) => {
  // Store a snapshot of project data at render time to avoid unnecessary updates
  const [renderDataSnapshot, setRenderDataSnapshot] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // No need for SSE or polling in offline mode - the rendering is simulated locally
  // The simulateOfflineRendering function handles the progress updates directly

  // Handle render button click - simulating the render process offline
  const handleRenderClick = () => {
    try {
      setIsRendering(true);
      setProgress(0);
      setVideoUrl(null);
      setError(null);
      setStatus('preparing');
      
      console.log('Starting offline render simulation for project:', projectId);
      
      // Take a snapshot of current project data
      const dataSnapshot = {
        ...projectData,
        _renderTimestamp: Date.now()
      };
      setRenderDataSnapshot(dataSnapshot);
      
      // Generate a local task ID
      const localTaskId = `local_task_${Date.now()}`;
      setTaskId(localTaskId);
      
      // Simulate rendering process with timeouts
      simulateOfflineRendering(localTaskId);
      
    } catch (err: any) {
      console.error('Error starting render:', err);
      setError(err?.message || 'Failed to start rendering');
      setIsRendering(false);
    }
  };
  
  // Function to simulate the rendering process locally
  const simulateOfflineRendering = (localTaskId: string) => {
    const totalSteps = 10;
    let currentStep = 0;
    
    const updateProgress = () => {
      currentStep++;
      const progressValue = Math.round((currentStep / totalSteps) * 100);
      
      setProgress(progressValue);
      setStatus(currentStep < totalSteps ? 'processing' : 'completed');
      
      if (currentStep === totalSteps) {
        // Create a fake download URL - in a real offline app, this might be a blob URL or data URL
        setVideoUrl(`data:video/mp4,${projectId}_${Date.now()}`);
        setIsRendering(false);
      } else {
        // Continue the simulation
        setTimeout(updateProgress, 1000);
      }
    };
    
    // Start the simulation
    setTimeout(updateProgress, 1000);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">Video Rendering</h3>
      
      {renderDataSnapshot && !videoUrl && (
        <div className="text-xs text-gray-500 mb-2">
          Last render started: {new Date(renderDataSnapshot._renderTimestamp).toLocaleTimeString()}
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
      
      {isRendering && (
        <div className="space-y-2">
          <p className="text-sm font-medium capitalize">{status || 'Processing'}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">{progress}% complete</p>
        </div>
      )}
      
      {videoUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-700">Rendering complete!</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              This is a simulated offline render. In a real application, a video file would be generated locally.
            </p>
            <button 
              onClick={() => alert('This is a simulated download in offline mode.')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Simulated Download
            </button>
          </div>
        </div>
      )}
      
      {!isRendering && !videoUrl && (
        <div>
          <button
            onClick={handleRenderClick}
            disabled={isRendering}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Simulate Render (Offline Mode)
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Running in offline mode - all operations are simulated locally
          </p>
        </div>
      )}
    </div>
  );
};

export default RenderButton;
