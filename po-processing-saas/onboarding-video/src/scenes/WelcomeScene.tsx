import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Montserrat';
import { COLORS, SPRINGS } from '../constants';
import { interFamily } from '../components/SceneContainer';

const { fontFamily: montserratFamily } = loadFont('normal', {
  weights: ['700', '800'],
  subsets: ['latin'],
});

export const WelcomeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoProgress = spring({ frame, fps, config: SPRINGS.smooth });
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = logoProgress;

  // Headline typewriter
  const headline = 'Automate Your Purchase Orders';
  const charsToShow = Math.min(
    headline.length,
    Math.floor(interpolate(frame, [15, 60], [0, headline.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }))
  );
  const headlineText = headline.slice(0, charsToShow);

  // Tagline fade
  const taglineProgress = spring({ frame: frame - 65, fps, config: SPRINGS.smooth });
  const taglineOpacity = taglineProgress;
  const taglineY = interpolate(taglineProgress, [0, 1], [20, 0]);

  // Accent line
  const lineProgress = spring({ frame: frame - 10, fps, config: SPRINGS.smooth });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 120]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${COLORS.bgSlate} 0%, ${COLORS.bgDark} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: interFamily,
        gap: 32,
      }}
    >
      {/* Logo / Brand Mark */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            fontWeight: 800,
            color: COLORS.white,
            fontFamily: montserratFamily,
          }}
        >
          PO
        </div>
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.text,
            fontFamily: montserratFamily,
          }}
        >
          PO Processing
        </span>
      </div>

      {/* Accent Line */}
      <div
        style={{
          width: lineWidth,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
        }}
      />

      {/* Headline */}
      <h1
        style={{
          fontFamily: montserratFamily,
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.text,
          margin: 0,
          textAlign: 'center',
          minHeight: 80,
        }}
      >
        {headlineText}
        <span
          style={{
            opacity: frame % 30 < 20 ? 1 : 0,
            color: COLORS.primary,
          }}
        >
          |
        </span>
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: 26,
          color: COLORS.textMuted,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          margin: 0,
          textAlign: 'center',
          maxWidth: 700,
          lineHeight: 1.5,
        }}
      >
        AI-powered extraction, smart matching, and streamlined review
        for your welding supply purchase orders.
      </p>
    </AbsoluteFill>
  );
};
