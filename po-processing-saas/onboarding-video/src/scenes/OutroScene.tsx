import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Montserrat';
import { COLORS, SPRINGS } from '../constants';
import { interFamily } from '../components/SceneContainer';

const { fontFamily: montserratFamily } = loadFont('normal', {
  weights: ['700', '800'],
  subsets: ['latin'],
});

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // CTA animation
  const ctaProgress = spring({ frame, fps, config: SPRINGS.smooth });
  const ctaScale = interpolate(ctaProgress, [0, 1], [0.7, 1]);
  const ctaOpacity = ctaProgress;

  // Button animation
  const btnProgress = spring({ frame: frame - 20, fps, config: SPRINGS.snappy });
  const btnScale = interpolate(btnProgress, [0, 1], [0.8, 1]);
  const btnOpacity = btnProgress;

  // Tagline
  const tagProgress = spring({ frame: frame - 35, fps, config: SPRINGS.smooth });
  const tagOpacity = tagProgress;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${COLORS.bgSlate} 0%, ${COLORS.bgDark} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: interFamily,
        gap: 32,
      }}
    >
      <h1
        style={{
          fontFamily: montserratFamily,
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.text,
          margin: 0,
          textAlign: 'center',
          opacity: ctaOpacity,
          transform: `scale(${ctaScale})`,
        }}
      >
        Get Started Today
      </h1>

      <div
        style={{
          opacity: btnOpacity,
          transform: `scale(${btnScale})`,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
          padding: '18px 48px',
          borderRadius: 12,
          fontSize: 22,
          fontWeight: 600,
          color: COLORS.white,
        }}
      >
        Sign Up Free \u2192
      </div>

      <p
        style={{
          fontSize: 18,
          color: COLORS.textMuted,
          margin: 0,
          opacity: tagOpacity,
          textAlign: 'center',
        }}
      >
        Automate your purchase order processing in minutes.
      </p>
    </AbsoluteFill>
  );
};
