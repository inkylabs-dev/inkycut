import type { CompositionAudio, LocalFile } from '../composition/types';

/**
 * Props for the AudioTimeline component that displays audio tracks in grouped timelines
 */
export interface AudioTimelineProps {
  /** Total project duration in frames for clamping */
  totalProjectDurationFrames?: number;
  /** Callback for audio click-to-seek */
  onAudioClick?: (targetFrame: number) => void;
}

/**
 * Props for the AudioTimelineGroup component that renders a single timeline lane
 */
export interface AudioTimelineGroupProps {
  /** Array of audio tracks in this timeline group */
  timeline: CompositionAudio[];
  /** Index of this timeline group */
  timelineIndex: number;
  /** Callback for audio click-to-seek */
  onAudioClick?: (targetFrame: number) => void;
}

/**
 * Props for the AudioBlock component that renders individual audio blocks
 */
export interface AudioBlockProps {
  /** Audio data for this block */
  audio: CompositionAudio;
  /** Left position in pixels */
  leftPosition: number;
  /** Block width in pixels */
  blockWidth: number;
  /** Duration of the audio in seconds */
  audioDuration: number;
  /** Callback for audio click-to-seek */
  onAudioClick?: (targetFrame: number) => void;
}
