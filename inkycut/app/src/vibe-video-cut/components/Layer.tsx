import React, {useMemo} from 'react';
import {Sequence} from 'remotion';
import type {CompositionElement} from './types';
 
export const Layer: React.FC<{
  item: CompositionElement;
}> = ({item}) => {
  const style: React.CSSProperties = useMemo(() => {
    return {
      backgroundColor: item.color,
      position: 'absolute',
      left: item.x,
      top: item.y,
      width: item.width,
      height: item.height,
    };
  }, [item.color, item.height, item.x, item.y, item.width]);
  
return (
    <Sequence
        key={item.id}
        from={item.startTime}
        {...(item.endTime !== undefined && item.startTime !== undefined
            ? {durationInFrames: item.endTime - item.startTime}
            : {})}
        layout="none"
    >
        <div className="layer-component" style={style} />
    </Sequence>
);
};