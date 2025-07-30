import { useRef, useEffect, useCallback } from 'react';
import { AudioObject, LocalFile } from '../types';

/**
 * Audio Sync Manager - Manages Web Audio API integration with Remotion Player
 * Provides frame-perfect audio synchronization for timeline-based audio tracks
 */
export class AudioSyncManager {
  private audioContext: AudioContext;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private masterGain: GainNode;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentFrame = 0;
  private fps = 30;

  constructor() {
    // Create audio context
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Load an audio track from a data URL
   */
  async loadAudioTrack(audioTrack: AudioObject, dataUrl: string): Promise<void> {
    try {
      // Convert data URL to ArrayBuffer
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Store the buffer
      this.audioBuffers.set(audioTrack.id, audioBuffer);
      
      console.log(`Audio track loaded: ${audioTrack.name}`);
    } catch (error) {
      console.error(`Failed to load audio track ${audioTrack.name}:`, error);
    }
  }

  /**
   * Start playback synchronized with video player
   */
  play(currentFrame: number, fps: number): void {
    this.currentFrame = currentFrame;
    this.fps = fps;
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.pauseTime = currentFrame / fps;
    
    // Schedule audio tracks to play from current position
    this.scheduleAudioFromFrame(currentFrame, fps);
  }

  /**
   * Pause audio playback
   */
  pause(): void {
    this.isPlaying = false;
    this.stopAllSources();
  }

  /**
   * Seek to a specific frame
   */
  seekTo(frame: number, fps: number): void {
    this.currentFrame = frame;
    this.fps = fps;
    this.pauseTime = frame / fps;
    
    // Stop current sources
    this.stopAllSources();
    
    // If playing, restart from new position
    if (this.isPlaying) {
      this.startTime = this.audioContext.currentTime;
      this.scheduleAudioFromFrame(frame, fps);
    }
  }

  /**
   * Schedule audio tracks to play from a specific frame
   */
  private scheduleAudioFromFrame(currentFrame: number, fps: number): void {
    const currentTimeMs = (currentFrame / fps) * 1000;
    
    // Clear existing sources
    this.stopAllSources();
    
    // Schedule each audio track based on its timing
    for (const [trackId] of this.audioBuffers) {
      this.scheduleTrackFromTime(trackId, currentTimeMs);
    }
  }

  /**
   * Schedule a specific audio track from current time
   */
  private scheduleTrackFromTime(trackId: string, currentTimeMs: number): void {
    // This method will be populated when we have access to audio track data
    // For now, it's a placeholder for the scheduling logic
  }

  /**
   * Update audio synchronization based on current frame
   * Called frequently to maintain sync with video
   */
  syncToFrame(currentFrame: number, fps: number, audioTracks: AudioObject[]): void {
    if (!this.isPlaying || audioTracks.length === 0) return;
    
    // Only process if frame has changed significantly (avoid micro-updates)
    const frameThreshold = Math.max(1, Math.round(fps * 0.05)); // 5% of fps or 1 frame minimum
    if (Math.abs(currentFrame - this.currentFrame) < frameThreshold) return;
    
    this.currentFrame = currentFrame;
    this.fps = fps;
    const currentTimeMs = (currentFrame / fps) * 1000;
    
    // Check if any audio tracks need to be started or stopped
    audioTracks.forEach(audioTrack => {
      const trackStartTime = audioTrack.startTime;
      const trackEndTime = audioTrack.endTime || (audioTrack.startTime + audioTrack.duration);
      
      const shouldBePlaying = currentTimeMs >= trackStartTime && currentTimeMs <= trackEndTime;
      const isCurrentlyPlaying = this.audioSources.has(audioTrack.id);
      
      if (shouldBePlaying && !isCurrentlyPlaying) {
        // Start playing this track
        this.startAudioTrack(audioTrack, currentTimeMs);
      } else if (!shouldBePlaying && isCurrentlyPlaying) {
        // Stop playing this track
        this.stopAudioTrack(audioTrack.id);
      }
    });
  }

  /**
   * Start playing a specific audio track
   */
  private startAudioTrack(audioTrack: AudioObject, currentTimeMs: number): void {
    const audioBuffer = this.audioBuffers.get(audioTrack.id);
    if (!audioBuffer) return;

    // Create audio source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create gain node for volume control
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = audioTrack.muted ? 0 : audioTrack.volume;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Store references
    this.audioSources.set(audioTrack.id, source);
    this.gainNodes.set(audioTrack.id, gainNode);

    // Calculate offset from track start
    const offsetMs = currentTimeMs - audioTrack.startTime;
    const offsetSeconds = Math.max(0, offsetMs / 1000);

    // Handle looping
    source.loop = audioTrack.loop;

    // Apply fade in/out (simplified implementation)
    if (audioTrack.fadeIn && offsetSeconds < audioTrack.fadeIn / 1000) {
      const fadeInDuration = (audioTrack.fadeIn / 1000) - offsetSeconds;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        audioTrack.muted ? 0 : audioTrack.volume,
        this.audioContext.currentTime + fadeInDuration
      );
    }

    // Start playback from calculated offset
    try {
      source.start(this.audioContext.currentTime, offsetSeconds);
      
      // Clean up when finished
      source.onended = () => {
        this.audioSources.delete(audioTrack.id);
        this.gainNodes.delete(audioTrack.id);
      };
    } catch (error) {
      console.error(`Failed to start audio track ${audioTrack.name}:`, error);
      this.audioSources.delete(audioTrack.id);
      this.gainNodes.delete(audioTrack.id);
    }
  }

  /**
   * Stop a specific audio track
   */
  private stopAudioTrack(trackId: string): void {
    const source = this.audioSources.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.audioSources.delete(trackId);
      this.gainNodes.delete(trackId);
    }
  }

  /**
   * Stop all currently playing audio sources
   */
  private stopAllSources(): void {
    for (const [trackId, source] of this.audioSources) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
    }
    this.audioSources.clear();
    this.gainNodes.clear();
  }

  /**
   * Update volume for a specific audio track
   */
  setTrackVolume(trackId: string, volume: number): void {
    const gainNode = this.gainNodes.get(trackId);
    if (gainNode) {
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  /**
   * Mute/unmute a specific audio track
   */
  setTrackMuted(trackId: string, muted: boolean): void {
    const gainNode = this.gainNodes.get(trackId);
    if (gainNode) {
      const currentVolume = gainNode.gain.value;
      gainNode.gain.setValueAtTime(muted ? 0 : currentVolume, this.audioContext.currentTime);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  /**
   * Get current audio context state
   */
  getState(): AudioContextState {
    return this.audioContext.state;
  }

  /**
   * Clean up audio resources
   */
  cleanup(): void {
    this.stopAllSources();
    this.audioBuffers.clear();
    
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

/**
 * React hook for managing audio synchronization with Remotion Player
 */
export function useAudioSync() {
  const audioSyncManagerRef = useRef<AudioSyncManager | null>(null);

  // Initialize audio sync manager
  useEffect(() => {
    audioSyncManagerRef.current = new AudioSyncManager();
    
    return () => {
      audioSyncManagerRef.current?.cleanup();
    };
  }, []);

  // Load audio tracks when they change
  const loadAudioTracks = useCallback(async (audioTracks: AudioObject[], files: LocalFile[]) => {
    if (!audioSyncManagerRef.current) return;

    console.log('Loading audio tracks:', audioTracks.length, 'Files available:', files.length);
    
    for (const audioTrack of audioTracks) {
      const file = files.find(f => f.id === audioTrack.src);
      if (file && file.dataUrl && file.type.startsWith('audio/')) {
        console.log('Loading audio file:', file.name, 'Duration:', file.duration);
        await audioSyncManagerRef.current.loadAudioTrack(audioTrack, file.dataUrl);
      } else {
        console.warn('Audio file not found or invalid:', audioTrack.src, file);
      }
    }
  }, []);

  // Play audio synchronized with video
  const playAudio = useCallback((currentFrame: number, fps: number) => {
    audioSyncManagerRef.current?.play(currentFrame, fps);
  }, []);

  // Pause audio
  const pauseAudio = useCallback(() => {
    audioSyncManagerRef.current?.pause();
  }, []);

  // Seek audio to specific frame
  const seekAudio = useCallback((frame: number, fps: number) => {
    audioSyncManagerRef.current?.seekTo(frame, fps);
  }, []);

  // Sync audio to current frame (call this frequently)
  const syncAudio = useCallback((currentFrame: number, fps: number, audioTracks: AudioObject[]) => {
    audioSyncManagerRef.current?.syncToFrame(currentFrame, fps, audioTracks);
  }, []);

  // Update track volume
  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    audioSyncManagerRef.current?.setTrackVolume(trackId, volume);
  }, []);

  // Mute/unmute track
  const setTrackMuted = useCallback((trackId: string, muted: boolean) => {
    audioSyncManagerRef.current?.setTrackMuted(trackId, muted);
  }, []);

  // Set master volume
  const setMasterVolume = useCallback((volume: number) => {
    audioSyncManagerRef.current?.setMasterVolume(volume);
  }, []);

  return {
    loadAudioTracks,
    playAudio,
    pauseAudio,
    seekAudio,
    syncAudio,
    setTrackVolume,
    setTrackMuted,
    setMasterVolume,
    audioSyncManager: audioSyncManagerRef.current
  };
}