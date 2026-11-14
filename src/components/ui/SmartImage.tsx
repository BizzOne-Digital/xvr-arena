"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** next/image with a branded fallback when the source is missing or fails to load. */
export function SmartImage({ src, alt, className, ...props }: Omit<ImageProps, "src"> & { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("grid-bg flex items-center justify-center bg-gradient-to-br from-card via-bg-2 to-bg", props.fill && "absolute inset-0", className)}
      >
        <span className="font-orbitron text-3xl font-extrabold text-cyan/30">XVR</span>
      </div>
    );
  }
  const isRemoteUnsplash = src.startsWith("https://images.unsplash.com");
  return (
    <Image
      src={isRemoteUnsplash && !src.includes("?") ? `${src}?auto=format&fit=crop&q=80&w=1600` : src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
