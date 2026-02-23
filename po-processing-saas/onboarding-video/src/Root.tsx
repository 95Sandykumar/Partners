import { Composition } from 'remotion';
import { OnboardingVideo } from './OnboardingVideo';
import { SCENE_DURATIONS, VIDEO, TIMING } from './constants';

// Calculate total duration: sum of all scenes minus transition overlaps
const totalSceneDuration = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);
const totalTransitions = (Object.keys(SCENE_DURATIONS).length - 1) * TIMING.fadeTransition;
const totalDuration = totalSceneDuration - totalTransitions;

export const RemotionRoot = () => {
  return (
    <Composition
      id="OnboardingVideo"
      component={OnboardingVideo}
      durationInFrames={totalDuration}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
