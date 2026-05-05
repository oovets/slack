import { SlidingNumber } from "../animate-ui/primitives/texts/sliding-number";
import { Icon } from "@/icons"

type MediaValueRacSectionProps = {
  racValue: number
}

const CPM = 150;

export function MediaValueRacSection({ racValue }: MediaValueRacSectionProps) {
  const cost = (racValue / 1000) * CPM;

  return (
    <div className="bg-[#FFFFFF] rounded-lg text-[45px] flex justify-center items-center">
      <h2 className="eidra-sans font-bold text-black">Media value RAC</h2>

      <div className="mx-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F2ED]">
        <Icon
          src="realtime-accurate-contacts"
          className="scale-75"
          style={{ "--primary": "#000000" } as React.CSSProperties}
        />
      </div>

      <h2 className="eidra-sans font-semibold text-black">
        <SlidingNumber
          animateOnLoad={false}
          number={cost}
          decimalPlaces={1}
          decimalSeparator=","
          thousandsSeparator=" "
          postfix=" SEK"
        />
      </h2>
    </div>
  );
}