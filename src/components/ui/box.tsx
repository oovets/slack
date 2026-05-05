"use client";

import { HTMLAttributes, CSSProperties, createContext, useContext } from "react";
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

/** Allows host pages to mark themselves as compact so every Box (and friends)
 *  collapses paddings, gaps and title sizing without removing any content. */
export const BoxCompactContext = createContext(false);
export const useBoxCompact = () => useContext(BoxCompactContext);

export function Box({ children, title, className, style, id, index = 0 }: BoxProps) {
  const compact = useBoxCompact();
  const padding = compact ? "px-[10px] py-[10px]" : "px-[28px] py-[40px]";

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
      className={cn("relative overflow-hidden", padding, className)}
      style={style}
    >
      {title ? (
        <div className={compact ? "mb-[8px]" : "mb-[34px]"}>
          <h3
            id={id ? `${id}-title` : undefined}
            className={cn(
              "eidra-sans font-bold tracking-tight",
              compact ? "text-[16px] leading-[16px]" : "text-[36px] leading-[14px]",
            )}
            style={{
              textRendering: "geometricPrecision",
              color: "#000000",
            }}
          >
            {title}
          </h3>
          <span
            aria-hidden
            className={cn(
              "block bg-black/80 rounded-full",
              compact ? "mt-[6px] h-[1.5px] w-[20px]" : "mt-[18px] h-[2px] w-[44px]",
            )}
          />
        </div>
      ) : null}

      {children}
    </motion.div>
  );
}
