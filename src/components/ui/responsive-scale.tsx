"use client";

import { useEffect, useRef, useState } from "react";

type ResponsiveScaleProps = {
  width: number;
  height: number;
  children: React.ReactNode;
  /** Max scale factor (1 = never upscale beyond native size). */
  maxScale?: number;
  /** Background behind letterboxing. */
  background?: string;
};

/**
 * Centers and scales a fixed-size dashboard (e.g. 1920×1080 / 1080×1920) to
 * fit any viewport while preserving aspect ratio. Used to make the screen
 * dashboards readable on mobile/tablet without redoing the layout.
 */
export function ResponsiveScale({
  width,
  height,
  children,
  maxScale = 1,
  background = "#000",
}: ResponsiveScaleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / width, rect.height / height, maxScale);
      setScale(Math.max(0.05, s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("orientationchange", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", update);
    };
  }, [width, height, maxScale]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center"
      style={{ background }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
