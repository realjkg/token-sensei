// Mission status pulse (Ratio v2 Workstream 1). A status indicator keyed to
// mission status, using the durable semantic tokens — nominal pulses slow green,
// caution pulses amber (faster), critical renders the Lottie alert loop. All
// motion honors prefers-reduced-motion: reduced -> a static, non-animated dot.
import { motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TOKEN_HEX } from '@/lib/scales';
import type { MissionStatus } from './missionModel';

// Lottie is client-only — keep lottie-web off the SSR path.
const LottieAlert = dynamic(() => import('./LottieAlert'), { ssr: false });

const STATUS_COLOR: Record<MissionStatus, string> = {
  nominal: TOKEN_HEX.value,
  caution: TOKEN_HEX.shape,
  critical: TOKEN_HEX.cost,
};

const STATUS_LABEL: Record<MissionStatus, string> = {
  nominal: 'Nominal',
  caution: 'Caution',
  critical: 'Critical',
};

// Caution pulses faster than nominal; both are gentle.
const PULSE_DURATION: Record<Exclude<MissionStatus, 'critical'>, number> = {
  nominal: 2.4,
  caution: 1.4,
};

interface StatusPulseProps {
  status: MissionStatus;
  size?: number;
}

export function StatusPulse({ status, size = 28 }: StatusPulseProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const color = STATUS_COLOR[status];

  if (status === 'critical') {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${STATUS_LABEL[status]} mission status`}
      >
        <LottieAlert size={size} reducedMotion={reducedMotion} />
      </span>
    );
  }

  const dot = Math.round(size * 0.36);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${STATUS_LABEL[status]} mission status`}
    >
      {!reducedMotion && (
        <motion.span
          className="absolute rounded-full"
          style={{ width: dot, height: dot, backgroundColor: color }}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.4 }}
          transition={{
            duration: PULSE_DURATION[status],
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
      <span
        className="relative rounded-full"
        style={{ width: dot, height: dot, backgroundColor: color }}
      />
    </span>
  );
}

