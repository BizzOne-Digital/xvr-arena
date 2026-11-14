import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official XVR logo (public/brand/xvr-logo.webp). A logo uploaded in
 * Admin → Settings → Branding overrides it.
 */
const DEFAULT_LOGO = "/brand/xvr-logo.webp";

export function Logo({ logoUrl, className, compact = false }: { logoUrl?: string; className?: string; compact?: boolean }) {
  return (
    <Image
      src={logoUrl || DEFAULT_LOGO}
      alt="XVR – Free-Roaming VR Arena"
      width={900}
      height={333}
      priority
      className={cn(compact ? "h-9" : "h-11 sm:h-14", "w-auto object-contain drop-shadow-[0_0_10px_rgba(0,223,255,0.35)]", className)}
    />
  );
}
