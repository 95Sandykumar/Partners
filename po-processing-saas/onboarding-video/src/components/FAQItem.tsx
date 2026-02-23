import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRINGS } from '../constants';

type FAQItemProps = {
  question: string;
  answer: string;
  delay?: number;
};

export const FAQItem: React.FC<FAQItemProps> = ({ question, answer, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardProgress = spring({ frame: frame - delay, fps, config: SPRINGS.snappy });
  const cardOpacity = cardProgress;
  const cardTranslateY = interpolate(cardProgress, [0, 1], [20, 0]);

  const answerProgress = spring({ frame: frame - delay - 15, fps, config: SPRINGS.smooth });
  const answerOpacity = answerProgress;

  return (
    <div
      style={{
        opacity: cardOpacity,
        transform: `translateY(${cardTranslateY}px)`,
        background: COLORS.bgCard,
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: answerOpacity > 0 ? 12 : 0,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.primary,
            flexShrink: 0,
          }}
        >
          Q:
        </span>
        <span style={{ fontSize: 18, fontWeight: 600, color: COLORS.text }}>
          {question}
        </span>
      </div>
      {answerOpacity > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            opacity: answerOpacity,
            paddingLeft: 4,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.success,
              flexShrink: 0,
            }}
          >
            A:
          </span>
          <span style={{ fontSize: 16, color: COLORS.textMuted, lineHeight: 1.5 }}>
            {answer}
          </span>
        </div>
      )}
    </div>
  );
};
