"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export type SignaturePadHandle = { toDataURL: () => string | null; clear: () => void; isEmpty: () => boolean };

/** Smooth pointer-based signature capture (mouse, touch and pen). Exports a white-background PNG. */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void; label?: string }>(function SignaturePad(
  { onChange, label = "Signature" },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokes = useRef(0);
  const [empty, setEmpty] = useState(true);

  const setup = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = c.getBoundingClientRect();
    const prev = strokes.current > 0 ? c.toDataURL() : null;
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1a2a";
    ctx.lineWidth = 2.4;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = prev;
    }
  }, []);

  useEffect(() => {
    setup();
    const ro = new ResizeObserver(() => setup());
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [setup]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1a2a";
    ctx.fill();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = pos(e);
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    strokes.current += 1;
    if (empty) {
      setEmpty(false);
      onChange?.(false);
    }
  };

  const clear = useCallback(() => {
    strokes.current = 0;
    setEmpty(true);
    onChange?.(true);
    setup();
  }, [onChange, setup]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => (strokes.current > 0 ? canvasRef.current?.toDataURL("image/png") ?? null : null),
    clear,
    isEmpty: () => strokes.current === 0,
  }));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">
          {label} <span className="text-red">*</span>
        </span>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm text-cyan hover:text-ink">
          <Eraser className="size-4" aria-hidden="true" /> Clear / re-sign
        </button>
      </div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-cyan/50 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-44 w-full touch-none cursor-crosshair sm:h-48"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          role="img"
          aria-label="Signature drawing area. Draw your signature with a mouse, finger or stylus."
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-lg text-slate-400">
            Sign here
          </span>
        )}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-slate-300" aria-hidden="true" />
      </div>
    </div>
  );
});
