import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { COLORS, SPRINGS } from '../constants';

const { fontFamily: interFamily } = loadInter('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

const { fontFamily: montserratFamily } = loadMontserrat('normal', {
  weights: ['600', '700', '800'],
  subsets: ['latin'],
});

export { interFamily, montserratFamily };

type SceneContainerProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  bgColor?: string;
};

export const SceneContainer: React.FC<SceneContainerProps> = ({
  title,
  subtitle,
  children,
  bgColor = COLORS.bgDark,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: SPRINGS.smooth });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [-30, 0]);

  const subtitleProgress = spring({ frame: frame - 8, fps, config: SPRINGS.smooth });
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${COLORS.bgSlate} 100%)`,
        fontFamily: interFamily,
        color: COLORS.text,
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: subtitle ? 8 : 40,
          }}
        >
          <h1
            style={{
              fontFamily: montserratFamily,
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        </div>
      )}
      {subtitle && (
        <div
          style={{
            opacity: subtitleOpacity,
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 24,
              color: COLORS.textMuted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
