import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { SCENE_DURATIONS, TIMING } from './constants';
import { WelcomeScene } from './scenes/WelcomeScene';
import { PipelineScene } from './scenes/PipelineScene';
import { UploadScene } from './scenes/UploadScene';
import { ExtractionScene } from './scenes/ExtractionScene';
import { MatchingScene } from './scenes/MatchingScene';
import { ReviewScene } from './scenes/ReviewScene';
import { DashboardScene } from './scenes/DashboardScene';
import { FAQScene } from './scenes/FAQScene';
import { OutroScene } from './scenes/OutroScene';

const scenes = [
  { Component: WelcomeScene, duration: SCENE_DURATIONS.welcome },
  { Component: PipelineScene, duration: SCENE_DURATIONS.pipeline },
  { Component: UploadScene, duration: SCENE_DURATIONS.upload },
  { Component: ExtractionScene, duration: SCENE_DURATIONS.extraction },
  { Component: MatchingScene, duration: SCENE_DURATIONS.matching },
  { Component: ReviewScene, duration: SCENE_DURATIONS.review },
  { Component: DashboardScene, duration: SCENE_DURATIONS.dashboard },
  { Component: FAQScene, duration: SCENE_DURATIONS.faq },
  { Component: OutroScene, duration: SCENE_DURATIONS.outro },
];

const fadeTiming = linearTiming({ durationInFrames: TIMING.fadeTransition });

export const OnboardingVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {scenes.map(({ Component, duration }, index) => (
        <React.Fragment key={index}>
          <TransitionSeries.Sequence durationInFrames={duration}>
            <Component />
          </TransitionSeries.Sequence>
          {index < scenes.length - 1 && (
            <TransitionSeries.Transition
              presentation={fade()}
              timing={fadeTiming}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
};
