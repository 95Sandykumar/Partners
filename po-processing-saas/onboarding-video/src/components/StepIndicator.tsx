import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';

type StepIndicatorProps = {
  number: number;
  label: string;
  icon: string;
  delay?: number;
  color?: string;
  isActive?: boolean;
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  number,
  label,
  icon,
  delay = 0,
  color = COLORS.primary,
  isActive = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: SPRINGS.snappy });
  const scale = interpolate(progress, [0, 1], [0, 1]);
  const opacity = progress;

  const labelProgress = spring({ frame: frame - delay - 10, fps, config: SPRINGS.smooth });
  const labelOpacity = labelProgress;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity,
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: isActive ? color : `${color}30`,
          border: `3px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 32 }}>{icon}</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: isActive ? COLORS.white : color,
          }}
        >
          {number}
        </span>
      </div>
      <span
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.text,
          opacity: labelOpacity,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
};
