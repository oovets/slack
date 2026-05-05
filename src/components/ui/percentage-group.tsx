import { SlidingNumber } from "../animate-ui/primitives/texts/sliding-number";
import { motion } from "motion/react";

export function PercentageGroup({
  title,
  groupAmount,
  visible,
  index = 0,
}: {
  title: string;
  groupAmount: number;
  visible: boolean;
  index?: number;
}) {
  if (!visible) return null;

  const stagger = 0.4 + index * 0.08;
  const isZero = groupAmount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.35, ease: "easeOut" }}
    >
      <div className="flex justify-between">
        <h4 className="eidra-sans font-bold text-black">{title}</h4>
        <h4
          className={`eidra-sans font-medium flex tabular-nums ${isZero ? "text-black/30" : "text-black"}`}
          style={{ textRendering: "geometricPrecision" }}
        >
          {isZero ? (
            <span>—</span>
          ) : (
            <>
              <SlidingNumber animateOnLoad={true} delay={stagger * 1000} number={groupAmount} />%
            </>
          )}
        </h4>
      </div>
      <div className="relative h-1">
        <div className="top-0 left-0 absolute w-full h-1 bg-[#ABABAB]/20 rounded-3xl border-transparent" />
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(groupAmount, 100)}%` }}
          transition={{ delay: stagger, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="top-0 left-0 absolute h-1 rounded-3xl bg-black"
        />
      </div>
    </motion.div>
  );
}
