"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { CalendarDays, Gamepad2 } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";

type HeroProps = {
  eyebrow: string;
  headlineTop: string;
  headlineAccent: string;
  headlineBottom: string;
  description: string;
  heroImage: string;
};

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53) % 100,
  size: 2 + ((i * 7) % 3),
  delay: (i * 1.3) % 12,
  duration: 12 + ((i * 5) % 10),
  red: i % 5 === 0,
}));

export function Hero(props: HeroProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const imgX = useTransform(sx, (v) => v * -14);
  const imgY = useTransform(sy, (v) => v * -10);
  const glowX = useTransform(sx, (v) => v * 24);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [reduce, mx, my]);

  const item = {
    hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] as const } },
  };

  return (
    <section ref={ref} className="relative isolate min-h-[640px] overflow-hidden pt-[72px] lg:pt-[84px]" aria-labelledby="hero-title">
      {/* Background image (right side), fades into the dark left side */}
      <motion.div className="absolute inset-0 -z-30 lg:left-[30%]" style={reduce ? undefined : { x: imgX, y: imgY, scale: 1.06 }}>
        <SmartImage
          src={props.heroImage}
          alt="Player wearing a wireless VR headset and holding controllers in a neon-lit arena"
          fill
          priority
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="object-cover object-[60%_30%] opacity-60 lg:opacity-90"
        />
      </motion.div>
      {/* Colour grading overlays */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,#03070D_0%,#03070D_28%,rgba(3,7,13,0.85)_45%,rgba(3,7,13,0.15)_75%,rgba(3,7,13,0.35)_100%)]" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-t from-bg via-transparent to-bg/50" />
      <div className="absolute inset-0 -z-20 mix-blend-color bg-[radial-gradient(ellipse_at_70%_40%,rgba(0,141,255,0.35),transparent_60%)]" />
      <div className="grid-bg absolute inset-0 -z-20 opacity-30 [mask-image:radial-gradient(ellipse_at_30%_50%,black,transparent_70%)]" />

      {/* Neon light streaks */}
      <motion.div aria-hidden="true" style={reduce ? undefined : { x: glowX }} className="pointer-events-none absolute inset-0 -z-10">
        <span className="animate-pulse-glow absolute right-[8%] top-[16%] h-[3px] w-[38%] -rotate-[14deg] rounded-full bg-cyan shadow-[0_0_24px_6px_rgba(0,223,255,0.55)]" />
        <span className="animate-pulse-glow absolute right-[30%] top-[10%] h-[3px] w-[22%] -rotate-[14deg] rounded-full bg-red shadow-[0_0_24px_6px_rgba(255,37,74,0.55)] [animation-delay:1.5s]" />
        <span className="animate-pulse-glow absolute bottom-[22%] right-[2%] h-[2px] w-[30%] rotate-[8deg] rounded-full bg-blue shadow-[0_0_20px_4px_rgba(0,141,255,0.5)] [animation-delay:0.8s]" />
        <span className="absolute left-0 top-[38%] hidden h-24 w-[3px] rounded-full bg-red shadow-[0_0_18px_4px_rgba(255,37,74,0.6)] lg:block" />
      </motion.div>

      {/* Ambient particles (desktop only) */}
      {!reduce && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden md:block">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="animate-float absolute bottom-[-10px] rounded-full"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.red ? "#FF254A" : "#79F3FF",
                boxShadow: `0 0 8px ${p.red ? "#FF254A" : "#00DFFF"}`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="container-x flex min-h-[560px] items-center py-16 lg:min-h-[min(calc(100svh-84px),720px)] lg:py-14">
        <motion.div
          className="max-w-[640px] lg:max-w-[52%]"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
        >
          <motion.p variants={item} className="eyebrow mb-4 text-base sm:text-xl">
            {props.eyebrow}
          </motion.p>
          <h1 id="hero-title" className="font-display font-bold italic uppercase leading-[0.92] tracking-tight">
            <motion.span variants={item} className="block text-[2.3rem] sm:text-6xl lg:text-[3.6rem] xl:text-[4.1rem]">
              {props.headlineTop}
            </motion.span>
            <motion.span
              variants={item}
              className="text-glow-cyan block bg-gradient-to-r from-soft via-cyan to-blue bg-clip-text text-[2.9rem] text-transparent sm:text-7xl lg:text-[4.8rem] xl:text-[5.4rem]"
            >
              {props.headlineAccent}
            </motion.span>
            <motion.span variants={item} className="block whitespace-nowrap text-[1.85rem] sm:text-[3.3rem] lg:text-[3.6rem] xl:text-[4.1rem]">
              {props.headlineBottom}
            </motion.span>
          </h1>
          <motion.p variants={item} className="mt-6 max-w-xl text-base leading-relaxed text-ink/85 sm:text-lg">
            {props.description}
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/booking" className="btn btn-red px-7 text-lg">
              <CalendarDays className="size-5" aria-hidden="true" /> Book an Adventure
            </Link>
            <Link href="/games" className="btn btn-cyan px-7 text-lg">
              <Gamepad2 className="size-5" aria-hidden="true" /> Explore Our Games
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
