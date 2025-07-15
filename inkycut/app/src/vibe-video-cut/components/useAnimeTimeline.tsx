// Credits: https://revidcraft.com/posts/remotion-part-02
import { useEffect, useId, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Timeline } from "animejs";

export const useAnimeTimeline = <T extends HTMLElement>(
  animeTimelineFactory: () => Timeline,
  deps?: React.DependencyList,
) => {
  // const animationScopeRef = useRef<T>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = useId();

  useEffect(() => {
    // Clean up existing timeline
    if (timelineRef.current) {
      timelineRef.current.pause();
    }
    
    // Delay timeline creation to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      timelineRef.current = animeTimelineFactory();
      timelineRef.current.pause();
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      if (timelineRef.current) {
        timelineRef.current.pause();
      }
    };
  }, deps || []);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.seek((frame / fps) * 1000);
    }
  }, [frame, fps]);

  return id.replaceAll(":", "_");
};