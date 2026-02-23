import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';

const stages = [
  {
    name: 'Exact Vendor Match',
    confidence: 100,
    example: 'B422 \u2192 B422',
    color: COLORS.success,
    delay: 20,
  },
  {
    name: 'Manufacturer Match',
    confidence: 95,
    example: 'MFG-4500 \u2192 C4500',
    color: COLORS.successLight,
    delay: 40,
  },
  {
    name: 'Prefix Normalized',
    confidence: 85,
    example: 'CMI-B5662 \u2192 B5662',
    color: COLORS.warning,
    delay: 60,
  },
  {
    name: 'Fuzzy Match',
    confidence: 72,
    example: 'B-422A \u2248 B422',
    color: COLORS.warningLight,
    delay: 80,
  },
];

export const MatchingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneContainer
      title="Smart Part Matching"
      subtitle="4-stage cascade finds the best match with confidence scoring"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        {stages.map((stage, index) => {
          const progress = spring({
            frame: frame - stage.delay,
            fps,
            config: SPRINGS.snappy,
          });
          const opacity = progress;
          const translateX = interpolate(progress, [0, 1], [-50, 0]);
          const barWidth = interpolate(progress, [0, 1], [0, stage.confidence]);

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: COLORS.bgCard,
                padding: '20px 32px',
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {/* Stage number */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: `${stage.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: stage.color,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              {/* Stage info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>
                    {stage.name}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontFamily: 'monospace',
                      color: COLORS.textMuted,
                    }}
                  >
                    {stage.example}
                  </span>
                </div>

                {/* Confidence bar */}
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: `${COLORS.bgDark}`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: stage.color,
                    }}
                  />
                </div>
              </div>

              {/* Confidence badge */}
              <div
                style={{
                  background: `${stage.color}20`,
                  color: stage.color,
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {stage.confidence}%
              </div>
            </div>
          );
        })}
      </div>
    </SceneContainer>
  );
};
