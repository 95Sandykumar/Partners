import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS, TIMING } from '../constants';

type AnimatedListProps = {
  items: string[];
  startDelay?: number;
  color?: string;
};

export const AnimatedList: React.FC<AnimatedListProps> = ({
  items,
  startDelay = 0,
  color = COLORS.primary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {items.map((item, index) => {
        const delay = startDelay + index * TIMING.stagger.items;
        const progress = spring({ frame: frame - delay, fps, config: SPRINGS.snappy });
        const translateX = interpolate(progress, [0, 1], [-40, 0]);
        const opacity = progress;

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 22, color: COLORS.text, lineHeight: 1.4 }}>
              {item}
            </span>
          </div>
        );
      })}
    </div>
  );
};
