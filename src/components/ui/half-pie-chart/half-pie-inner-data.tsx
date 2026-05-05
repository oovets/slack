import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

type HalfPieInnerDataProps = {
  leftValue: number;
  leftSubtitle: string;
  rightValue: number;
  rightSubtitle: string;
  layout?: "portrait" | "landscape";
};

export function HalfPieInnerData({
  leftValue,
  leftSubtitle,
  rightValue,
  rightSubtitle,
  layout = "portrait",
}: HalfPieInnerDataProps) {
  const wrapperClassName =
    layout === "portrait"
      ? "absolute top-0 right-0 flex w-1/2 translate-y-30 -translate-x-1/5 items-center gap-12"
      : "absolute top-0 right-0 flex w-1/2 translate-y-100 -translate-x-47.5 items-center gap-12";

  return (
    <div className={wrapperClassName}>
      <div className="flex flex-col flex-1 items-center">
        <h1 className="eidra-sans font-bold text-[90px] text-black tabular-nums" style={{
          textRendering: 'geometricPrecision',
        }}>
          <SlidingNumber animateOnLoad={true} delay={500} number={leftValue} />
        </h1>
        <h1 className="eidra-sans font-medium text-[20px] text-black/30 mt-3" style={{
          textRendering: 'geometricPrecision',
        }}>
          {leftSubtitle}
        </h1>
      </div>
      <div className="flex flex-col gap-[20px]">
        <span className="border border-black/30 -translate-x-1/2 border-s-transparent border-y-transparent h-[66px]" />
        <span className="eidra-sans text-[17px] leading-[15px] font-semibold text-black">%</span>
        <span className="border border-black/30 -translate-x-1/2 border-s-transparent border-y-transparent h-[66px]" />
      </div>
      <div className="flex flex-col flex-1 items-center">
        <h1 className="eidra-sans font-bold text-[90px] text-black tabular-nums" style={{
          textRendering: 'geometricPrecision',
        }}>
          <SlidingNumber animateOnLoad={true} delay={500} number={rightValue} />
        </h1>
        <h1 className="eidra-sans font-medium text-[20px] text-black/30 mt-3" style={{
          textRendering: 'geometricPrecision',
        }}>
          {rightSubtitle}
        </h1>
      </div>
    </div>
  );
}
