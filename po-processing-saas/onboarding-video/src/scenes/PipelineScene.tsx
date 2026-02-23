import React from 'react';
import { COLORS } from '../constants';
import { SceneContainer } from '../components/SceneContainer';
import { StepIndicator } from '../components/StepIndicator';
import { FlowArrow } from '../components/FlowArrow';

const steps = [
  { icon: '\u{1F4C4}', label: 'Upload', color: COLORS.primary },
  { icon: '\u{1F916}', label: 'Extract', color: COLORS.success },
  { icon: '\u{1F517}', label: 'Match', color: COLORS.warning },
  { icon: '\u2705', label: 'Review', color: COLORS.primaryLight },
];

export const PipelineScene: React.FC = () => {
  return (
    <SceneContainer
      title="How It Works"
      subtitle="Four simple steps from PDF to processed order"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 0,
        }}
      >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <StepIndicator
              number={index + 1}
              label={step.label}
              icon={step.icon}
              color={step.color}
              delay={index * 20}
              isActive
            />
            {index < steps.length - 1 && (
              <FlowArrow delay={index * 20 + 15} width={100} />
            )}
          </React.Fragment>
        ))}
      </div>
    </SceneContainer>
  );
};
