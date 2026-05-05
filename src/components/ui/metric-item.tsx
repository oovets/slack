import { SlidingNumber } from "../animate-ui/primitives/texts/sliding-number";

import { Icon } from "@/icons";
import { MetricItemIcon } from "@/lib/types";

type MetricItemProps = {
  name: string;
  amount: number;
  postfix?: string;
  icon: MetricItemIcon;
  visible?: boolean;
  decimalPlaces?: number;
  layout?: "portrait" | "landscape";
};

export function MetricItem({
  name,
  amount,
  postfix,
  icon,
  visible,
  decimalPlaces,
  layout = "portrait",
}: MetricItemProps) {
  if (!visible) return null;

  if (name === 'View Time (Total)' && postfix === 'm' && amount > 60) {
    amount = Number((amount / 60).toFixed(2));
    decimalPlaces = 2;
    postfix = 'h';
  }

  // Auto-shrink number font size based on formatted length to prevent overflow
  const formatted = Math.abs(Number(amount)).toFixed(decimalPlaces ?? 0);
  const intDigits = formatted.split('.')[0].length;
  const thousandsSeps = Math.max(0, Math.floor((intDigits - 1) / 3));
  const visibleLen =
    formatted.length +
    thousandsSeps +
    (postfix ? postfix.length : 0);

  let numberSizeClass = 'text-[57px] leading-[60px]';
  if (visibleLen >= 11) numberSizeClass = 'text-[32px] leading-[36px]';
  else if (visibleLen >= 9) numberSizeClass = 'text-[40px] leading-[44px]';
  else if (visibleLen >= 7) numberSizeClass = 'text-[48px] leading-[52px]';

  return (
    <div className="p-[8px] flex flex-1 flex-row" id={`metric-${icon}`}>
      <div 
        className="w-[90px] h-[90px] flex-shrink-0 flex rounded-md justify-center items-center border-0"
        style={{
          borderColor: "var(--border-color)",
          background:
            layout === "portrait"
              ? "linear-gradient(135deg, #63A8A5 0%, #DA7C60 100%)"
              : "#F5F2ED",
        }}
      >
        <Icon
          src={icon}
          className=""
          style={
            {
              "--primary": layout === "portrait" ? "#FFFFFF" : "#000000",
            } as React.CSSProperties
          }
        />
      </div>
      <div className="pl-[12px] text-black">
        <h2 
          className={`whitespace-nowrap font-medium text-[15px] ${
            layout === "portrait" ? "pp-neue-montreal" : "eidra-sans"
          }`}
          style={{
            textRendering: 'geometricPrecision',
          }}
          // style={{ 
          //   color: 'var(--text-color)',
          //   fontSize: 'var(--font-size-base)',
          //   fontWeight: 'var(--font-weight-medium)',
          // }}
        >
          {name}
        </h2>
        <h1 
          className={`flex items-baseline font-bold ${numberSizeClass} ml-[-4px] ${
            layout === "portrait" ? "pp-neue-montreal" : "eidra-sans"
          }`}
          // style={{ 
          //   color: 'var(--text-color)',
          //   fontWeight: 'var(--font-weight-bold)',
          // }}
          style={{
            textRendering: 'geometricPrecision',
          }}
        >
          <SlidingNumber
            animateOnLoad={false}
            decimalPlaces={decimalPlaces}
            number={amount}
            decimalSeparator=","
            postfix={postfix}
          />
        </h1>
      </div>
    </div>
  );
}
