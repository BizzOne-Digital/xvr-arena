"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Thin neon progress bar at the top of the page while scrolling. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-cyan via-blue to-red shadow-[0_0_12px_#00dfff]"
    />
  );
}
