import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  delay?: number;
  color?: string;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  delay = 0,
  color = COLORS.primary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: SPRINGS.smooth });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity = progress;
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        background: COLORS.bgCard,
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: COLORS.text,
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 16,
          color: COLORS.textMuted,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
};
