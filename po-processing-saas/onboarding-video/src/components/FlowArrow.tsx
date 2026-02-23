import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';

type FlowArrowProps = {
  delay?: number;
  width?: number;
};

export const FlowArrow: React.FC<FlowArrowProps> = ({ delay = 0, width = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: SPRINGS.smooth });
  const scaleX = interpolate(progress, [0, 1], [0, 1]);
  const opacity = progress;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        opacity,
      }}
    >
      <svg width={width} height={24} viewBox={`0 0 ${width} 24`}>
        <line
          x1={0}
          y1={12}
          x2={width - 12}
          y2={12}
          stroke={COLORS.primary}
          strokeWidth={3}
          strokeDasharray={width}
          strokeDashoffset={width * (1 - scaleX)}
        />
        <polygon
          points={`${width - 12},6 ${width},12 ${width - 12},18`}
          fill={COLORS.primary}
          opacity={scaleX > 0.8 ? 1 : 0}
        />
      </svg>
    </div>
  );
};
