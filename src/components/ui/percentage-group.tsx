import { SlidingNumber } from "../animate-ui/primitives/texts/sliding-number";
import { motion } from "motion/react";

export function PercentageGroup({
  title,
  groupAmount,
  visible,
}: {
  title: string;
  groupAmount: number;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div>
      <div className="flex justify-between">
        <h4 className="eidra-sans font-bold text-black">{title}</h4>
        <h4 className="eidra-sans font-medium flex text-black" style={{
          textRendering: 'geometricPrecision',
        }}>
          <SlidingNumber animateOnLoad={true} delay={3000} number={groupAmount} />%
        </h4>
      </div>
      <div className="relative h-1">
        <div className="top-0 left-0 absolute w-full h-1 bg-[#ABABAB]/20 rounded-3xl border-transparent" />
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(groupAmount, 100)}%` }}
          transition={{ delay: 3, duration: 0.8, ease: "easeOut" }}
          className="top-0 left-0 absolute h-1 rounded-3xl bg-black"
        />
      </div>
    </div>
  );
}
