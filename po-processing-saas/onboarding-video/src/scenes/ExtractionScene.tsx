import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';

const extractedFields = [
  { label: 'PO Number', value: 'PO-2026-1087', delay: 20 },
  { label: 'Vendor', value: 'Powerweld Inc.', delay: 28 },
  { label: 'Date', value: '2026-01-15', delay: 36 },
  { label: 'Line Items', value: '12 items extracted', delay: 44 },
  { label: 'Total', value: '$4,850.00', delay: 52 },
];

export const ExtractionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // AI badge
  const badgeProgress = spring({ frame: frame - 10, fps, config: SPRINGS.snappy });
  const badgeScale = interpolate(badgeProgress, [0, 1], [0, 1]);

  // Confidence gauge
  const gaugeProgress = spring({ frame: frame - 60, fps, config: SPRINGS.smooth });
  const gaugeValue = interpolate(gaugeProgress, [0, 1], [0, 92.5]);
  const gaugeColor =
    gaugeValue >= 85 ? COLORS.success :
    gaugeValue >= 60 ? COLORS.warning : COLORS.danger;

  return (
    <SceneContainer
      title="AI-Powered Extraction"
      subtitle="Claude Vision API reads and structures your PO data automatically"
    >
      <div style={{ display: 'flex', gap: 60, flex: 1, alignItems: 'center' }}>
        {/* Left: AI processing visualization */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* AI Badge */}
          <div
            style={{
              transform: `scale(${badgeScale})`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: `${COLORS.primary}20`,
              padding: '12px 24px',
              borderRadius: 12,
              width: 'fit-content',
              border: `1px solid ${COLORS.primary}40`,
            }}
          >
            <span style={{ fontSize: 28 }}>{'\u{1F916}'}</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.primary }}>
              Claude Vision AI
            </span>
          </div>

          {/* Extracted fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {extractedFields.map((field, index) => {
              const fieldProgress = spring({
                frame: frame - field.delay,
                fps,
                config: SPRINGS.snappy,
              });
              const fieldOpacity = fieldProgress;
              const fieldX = interpolate(fieldProgress, [0, 1], [-30, 0]);

              return (
                <div
                  key={index}
                  style={{
                    opacity: fieldOpacity,
                    transform: `translateX(${fieldX}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: COLORS.bgCard,
                    padding: '16px 24px',
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      color: COLORS.textMuted,
                      width: 120,
                      fontWeight: 500,
                    }}
                  >
                    {field.label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                    {field.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Confidence gauge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            width: 280,
          }}
        >
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: `8px solid ${COLORS.bgCard}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Gauge arc */}
            <svg
              width={200}
              height={200}
              style={{ position: 'absolute', top: -4, left: -4 }}
            >
              <circle
                cx={100}
                cy={100}
                r={96}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={8}
                strokeDasharray={`${(gaugeValue / 100) * 603} 603`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: gaugeColor,
                }}
              >
                {Math.round(gaugeValue)}%
              </div>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>
                Confidence
              </div>
            </div>
          </div>
          <p
            style={{
              fontSize: 16,
              color: COLORS.textMuted,
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            High confidence extractions auto-approve.
            Low confidence routes to review queue.
          </p>
        </div>
      </div>
    </SceneContainer>
  );
};
