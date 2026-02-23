import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';
import { FeatureCard } from '../components/FeatureCard';

export const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Upload zone animation
  const zoneProgress = spring({ frame: frame - 15, fps, config: SPRINGS.smooth });
  const zoneOpacity = zoneProgress;
  const zoneScale = interpolate(zoneProgress, [0, 1], [0.9, 1]);

  // PDF icon drop
  const dropProgress = spring({ frame: frame - 35, fps, config: SPRINGS.bouncy });
  const pdfY = interpolate(dropProgress, [0, 1], [-60, 0]);
  const pdfOpacity = dropProgress;

  // Check mark
  const checkProgress = spring({ frame: frame - 55, fps, config: SPRINGS.snappy });
  const checkScale = interpolate(checkProgress, [0, 1], [0, 1]);

  return (
    <SceneContainer
      title="Upload Purchase Orders"
      subtitle="Drag and drop PDF files or batch upload multiple POs at once"
    >
      <div style={{ display: 'flex', gap: 40, flex: 1, alignItems: 'center' }}>
        {/* Upload Zone Mock */}
        <div
          style={{
            flex: 1,
            opacity: zoneOpacity,
            transform: `scale(${zoneScale})`,
          }}
        >
          <div
            style={{
              border: `3px dashed ${COLORS.border}`,
              borderRadius: 20,
              padding: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              background: `${COLORS.bgCard}40`,
              minHeight: 300,
            }}
          >
            {/* PDF icon dropping in */}
            <div
              style={{
                opacity: pdfOpacity,
                transform: `translateY(${pdfY}px)`,
                fontSize: 72,
              }}
            >
              {'\u{1F4C4}'}
            </div>
            <p style={{ fontSize: 22, color: COLORS.textMuted, margin: 0 }}>
              Drop PDF files here
            </p>
            <div
              style={{
                background: COLORS.primary,
                color: COLORS.white,
                padding: '12px 32px',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Browse Files
            </div>

            {/* Success check */}
            <div
              style={{
                transform: `scale(${checkScale})`,
                fontSize: 40,
                position: 'absolute',
                right: 100,
                bottom: 100,
              }}
            >
              {checkScale > 0.1 ? '\u2705' : ''}
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 380 }}>
          <FeatureCard
            icon={'\u{1F4E6}'}
            title="Batch Upload"
            description="Upload multiple POs simultaneously with progress tracking"
            delay={40}
            color={COLORS.primary}
          />
          <FeatureCard
            icon={'\u{1F4CF}'}
            title="10MB Max"
            description="Supports single and multi-page PDF purchase orders"
            delay={50}
            color={COLORS.success}
          />
          <FeatureCard
            icon={'\u26A1'}
            title="Auto-Process"
            description="Extraction starts immediately after upload"
            delay={60}
            color={COLORS.warning}
          />
        </div>
      </div>
    </SceneContainer>
  );
};
