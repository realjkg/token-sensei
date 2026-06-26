// Client-only Lottie renderer for the critical-mission alert loop. Imported via
// next/dynamic({ ssr: false }) from StatusPulse so lottie-web never evaluates on
// the server. When reduced motion is requested it renders a static first frame.
import Lottie from 'lottie-react';
import { criticalPulseAnimation } from './criticalPulseAnimation';

interface LottieAlertProps {
  size: number;
  reducedMotion: boolean;
}

export default function LottieAlert({ size, reducedMotion }: LottieAlertProps) {
  return (
    <Lottie
      animationData={criticalPulseAnimation}
      loop={!reducedMotion}
      autoplay={!reducedMotion}
      aria-hidden
      style={{ width: size, height: size }}
    />
  );
}

