import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';

export const ReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel animation
  const leftProgress = spring({ frame: frame - 10, fps, config: SPRINGS.smooth });
  const rightProgress = spring({ frame: frame - 20, fps, config: SPRINGS.smooth });

  const leftOpacity = leftProgress;
  const leftX = interpolate(leftProgress, [0, 1], [-40, 0]);
  const rightOpacity = rightProgress;
  const rightX = interpolate(rightProgress, [0, 1], [40, 0]);

  // Button animation
  const btnProgress = spring({ frame: frame - 60, fps, config: SPRINGS.snappy });
  const btnScale = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity = btnProgress;

  // Correction highlight
  const highlightProgress = spring({ frame: frame - 80, fps, config: SPRINGS.smooth });
  const highlightOpacity = highlightProgress;

  return (
    <SceneContainer
      title="Review & Approve"
      subtitle="Side-by-side PDF viewer and extracted data for quick verification"
    >
      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {/* Left: PDF Viewer Mock */}
        <div
          style={{
            flex: 1,
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            PDF Document
          </div>
          {/* PDF lines mock */}
          {[180, 240, 140, 200, 160, 220, 100, 190].map((w, i) => (
            <div
              key={i}
              style={{
                width: w,
                height: 12,
                borderRadius: 3,
                background: `${COLORS.textDim}30`,
              }}
            />
          ))}
          <div style={{ marginTop: 12, fontSize: 48, textAlign: 'center' }}>
            {'\u{1F4C4}'}
          </div>
        </div>

        {/* Right: Data Panel Mock */}
        <div
          style={{
            flex: 1,
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
            background: COLORS.bgCard,
            borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Extracted Data
          </div>

          {/* Data rows */}
          {[
            { label: 'PO #', value: 'V24-1087' },
            { label: 'Vendor', value: 'Powerweld' },
            { label: 'Items', value: '8 line items' },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: `${COLORS.bgDark}80`,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 15, color: COLORS.textMuted }}>{row.label}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                {row.value}
              </span>
            </div>
          ))}

          {/* Correction highlight */}
          <div
            style={{
              opacity: highlightOpacity,
              padding: '10px 16px',
              background: `${COLORS.warning}15`,
              borderRadius: 8,
              border: `1px solid ${COLORS.warning}40`,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 15, color: COLORS.warning }}>Qty corrected</span>
            <span style={{ fontSize: 15, color: COLORS.warning, fontWeight: 600 }}>
              10 \u2192 12
            </span>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 'auto',
              opacity: btnOpacity,
              transform: `scale(${btnScale})`,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '14px 0',
                background: COLORS.success,
                borderRadius: 10,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.white,
              }}
            >
              Approve
            </div>
            <div
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'transparent',
                borderRadius: 10,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.danger,
                border: `2px solid ${COLORS.danger}`,
              }}
            >
              Reject
            </div>
          </div>
        </div>
      </div>
    </SceneContainer>
  );
};
