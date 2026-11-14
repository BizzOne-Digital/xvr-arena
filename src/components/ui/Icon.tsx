import {
  Flag,
  Footprints,
  Gamepad2,
  Glasses,
  PartyPopper,
  Rotate3d,
  Sparkles,
  Trophy,
  Users,
  type LucideProps,
} from "lucide-react";

const ICONS = { Flag, Footprints, Gamepad2, Glasses, PartyPopper, Rotate3d, Sparkles, Trophy, Users };

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = ICONS[name as keyof typeof ICONS] ?? Sparkles;
  return <C aria-hidden="true" {...props} />;
}
