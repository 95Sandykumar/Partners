// Brand Colors
export const COLORS = {
  bgDark: '#0F172A',
  bgSlate: '#1E293B',
  bgCard: '#334155',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  danger: '#EF4444',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  border: '#475569',
  white: '#FFFFFF',
} as const;

// Spring Configs
export const SPRINGS = {
  smooth: { damping: 200, mass: 1, stiffness: 100 },
  snappy: { damping: 20, stiffness: 200, mass: 0.5 },
  gentle: { damping: 30, stiffness: 80, mass: 1 },
  bouncy: { damping: 12, stiffness: 100, mass: 1 },
} as const;

// Timing
export const TIMING = {
  fps: 30,
  stagger: {
    items: 5,
    cards: 8,
    words: 4,
  },
  fadeTransition: 15,
} as const;

// Scene Durations (in frames)
export const SCENE_DURATIONS = {
  welcome: 120,
  pipeline: 150,
  upload: 150,
  extraction: 180,
  matching: 180,
  review: 150,
  dashboard: 150,
  faq: 150,
  outro: 90,
} as const;

// Video Dimensions
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;
