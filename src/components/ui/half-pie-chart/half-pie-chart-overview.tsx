import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { ContactsByGender } from "@/lib/types";

type HalfPieChartOverviewProps = {
  contactsByGender: ContactsByGender;
};

export function HalfPieChartOverview({
  contactsByGender,
}: HalfPieChartOverviewProps) {
  return (
    <div className="absolute z-2 flex flex-col gap-[42px] -translate-y-1/2 top-[50%] left-[32px]">
      <div>
        <h2 className="eidra-sans font-medium text-[20px] text-[#6BABA4]" style={{
          textRendering: 'geometricPrecision',
        }}>
          {contactsByGender.left.title}
        </h2>
        <h3 className="eidra-sans font-bold text-[45px] text-black" style={{
          textRendering: 'geometricPrecision',
        }}>
          <SlidingNumber
            animateOnLoad={false}
            delay={3000}
            number={contactsByGender.left.number}
          />
        </h3>
      </div>
      <div>
        <h2 className="eidra-sans font-medium text-[20px] text-[#DF754F]" style={{
          textRendering: 'geometricPrecision',
        }}>
          {contactsByGender.right.title}
        </h2>
        <h3 className="eidra-sans font-bold text-[45px] text-black" style={{
          textRendering: 'geometricPrecision',
        }}>
          <SlidingNumber
            animateOnLoad={false}
            delay={3000}
            number={contactsByGender.right.number}
          />
        </h3>
      </div>
    </div>
  );
}
