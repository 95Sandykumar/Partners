import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';

const stats = [
  { label: "Today's POs", value: '24', icon: '\u{1F4C4}', color: COLORS.primary, delay: 15 },
  { label: 'Pending Review', value: '3', icon: '\u{1F550}', color: COLORS.warning, delay: 23 },
  { label: 'Avg Confidence', value: '91%', icon: '\u{1F4CA}', color: COLORS.success, delay: 31 },
  { label: 'Match Rate', value: '96%', icon: '\u{1F517}', color: COLORS.primaryLight, delay: 39 },
];

const barData = [65, 82, 45, 93, 78, 88, 71];
const barLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneContainer
      title="Real-Time Dashboard"
      subtitle="Monitor extraction performance, accuracy, and processing metrics"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1 }}>
        {/* Stat cards row */}
        <div style={{ display: 'flex', gap: 20 }}>
          {stats.map((stat, index) => {
            const progress = spring({
              frame: frame - stat.delay,
              fps,
              config: SPRINGS.snappy,
            });
            const scale = interpolate(progress, [0, 1], [0.8, 1]);
            const opacity = progress;

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  opacity,
                  transform: `scale(${scale})`,
                  background: COLORS.bgCard,
                  borderRadius: 14,
                  padding: '24px 20px',
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: COLORS.textMuted }}>{stat.label}</span>
                  <span style={{ fontSize: 22 }}>{stat.icon}</span>
                </div>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bar chart */}
        <div
          style={{
            flex: 1,
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.text,
              marginBottom: 24,
            }}
          >
            Weekly PO Volume
          </span>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 24,
              paddingBottom: 32,
            }}
          >
            {barData.map((value, index) => {
              const barProgress = spring({
                frame: frame - 50 - index * 5,
                fps,
                config: SPRINGS.smooth,
              });
              const barHeight = interpolate(barProgress, [0, 1], [0, value * 2.5]);

              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: barHeight,
                      background: `linear-gradient(to top, ${COLORS.primary}, ${COLORS.primaryLight})`,
                      borderRadius: '8px 8px 0 0',
                      minHeight: 4,
                    }}
                  />
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                    {barLabels[index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SceneContainer>
  );
};
