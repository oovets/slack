"use client";

import { HTMLAttributes, CSSProperties } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type BoxProps = {
  children: React.ReactNode;
  className?: HTMLAttributes<HTMLDivElement>["className"];
  title?: string;
  style?: CSSProperties;
  id?: string;
  /** When provided, applies a staggered enter animation. */
  index?: number;
};

export function Box({ children, title, className, style, id, index = 0 }: BoxProps) {
  const px = "px-[28px]";
  const py = "py-[40px]";

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 + index * 0.07,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(`relative overflow-hidden ${px} ${py}`, className)}
      style={style}
    >
      {title ? (
        <div className="mb-[34px]">
          <h3
            id={id ? `${id}-title` : undefined}
            className="eidra-sans font-bold text-[36px] leading-[14px] tracking-tight"
            style={{
              textRendering: "geometricPrecision",
              color: "#000000",
            }}
          >
            {title}
          </h3>
          <span
            aria-hidden
            className="mt-[18px] block h-[2px] w-[44px] bg-black/80 rounded-full"
          />
        </div>
      ) : null}

      {children}
    </motion.div>
  );
}
