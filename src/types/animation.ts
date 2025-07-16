export interface AnimationState {
  isPlaying: boolean;
  currentTimeline: gsap.core.Timeline | null;
  ambientPanTween: gsap.core.Tween | null;
}

export interface SceneTransition {
  from: SceneType;
  to: SceneType;
  duration: number;
  ease?: string;
}

export type SceneType =
  | 'landing'
  | 'ticket'
  | 'zoom1'
  | 'zoom2'
  | 'your-choice'
  | 'winner-reveal'
  | 'lifetime'
  | 'report'
  | 'none'
  | 'star-demo';

export interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
}
