import React, { useRef, useEffect, useState } from 'react';

interface AudioVisualizerProps {
  /** Audio blob to visualize */
  blob: Blob;
  /** Width of the visualization */
  width: number;
  /** Height of the visualization */
  height: number;
  /** Width of each bar */
  barWidth?: number;
  /** Gap between bars */
  gap?: number;
  /** Color of the bars */
  barColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Time in milliseconds to trim from the beginning of the audio */
  trimBefore?: number;
  /** Time in milliseconds to trim from the end of the audio */
  trimAfter?: number;
}

/**
 * Custom AudioVisualizer component that creates a waveform visualization
 * from an audio blob using Web Audio API
 */
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  blob,
  width,
  height,
  barWidth = 2,
  gap = 1,
  barColor = '#ffffff',
  backgroundColor = 'transparent',
  trimBefore = 0,
  trimAfter = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);

  useEffect(() => {
    const processAudioData = async () => {
      try {
        // Convert blob to array buffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get raw audio data from the first channel
        const rawData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Calculate the trimmed section indices
        const totalDurationMs = (rawData.length / sampleRate) * 1000;
        const trimBeforeMs = Math.max(0, trimBefore);
        const trimAfterMs = Math.max(0, trimAfter);
        
        // Calculate sample indices for the visible portion
        const startSample = Math.floor((trimBeforeMs / 1000) * sampleRate);
        const endSample = Math.floor(((totalDurationMs - trimAfterMs) / 1000) * sampleRate);
        
        // Ensure indices are within bounds
        const validStartSample = Math.max(0, Math.min(startSample, rawData.length));
        const validEndSample = Math.max(validStartSample, Math.min(endSample, rawData.length));
        
        // Extract only the visible portion of the audio
        const trimmedData = rawData.slice(validStartSample, validEndSample);
        
        // Calculate how many bars we can fit
        const barSpacing = barWidth + gap;
        const numBars = Math.floor(width / barSpacing);
        
        // Downsample the trimmed audio data to match the number of bars
        const samplesPerBar = Math.floor(trimmedData.length / numBars);
        const downsampledData = new Float32Array(numBars);
        
        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          const startIndex = i * samplesPerBar;
          const endIndex = Math.min(startIndex + samplesPerBar, trimmedData.length);
          
          // Calculate RMS (Root Mean Square) for this segment
          for (let j = startIndex; j < endIndex; j++) {
            sum += trimmedData[j] * trimmedData[j];
          }
          
          // RMS gives us the amplitude for this segment
          downsampledData[i] = Math.sqrt(sum / (endIndex - startIndex));
        }
        
        setAudioData(downsampledData);
        
        // Close audio context to free resources
        audioContext.close();
      } catch (error) {
        console.warn('Failed to process audio data:', error);
        setAudioData(null);
      }
    };

    if (blob) {
      processAudioData();
    }
  }, [blob, width, barWidth, gap, trimBefore, trimAfter]);

  useEffect(() => {
    if (!audioData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw bars
    ctx.fillStyle = barColor;
    
    const barSpacing = barWidth + gap;
    const maxAmplitude = Math.max(...audioData);
    
    for (let i = 0; i < audioData.length; i++) {
      const amplitude = audioData[i];
      const normalizedAmplitude = maxAmplitude > 0 ? amplitude / maxAmplitude : 0;
      const barHeight = normalizedAmplitude * height * 0.8; // Use 80% of height for visual padding
      
      const x = i * barSpacing;
      const y = (height - barHeight) / 2; // Center the bar vertically
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [audioData, width, height, barWidth, gap, barColor, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'block'
      }}
    />
  );
};

export default AudioVisualizer;