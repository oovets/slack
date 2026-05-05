import { SVGProps } from "react";

export default function ViewFrequencyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12.833 4.58A9.645 9.645 0 0 0 10 4.15c-4.696 0-8.5 3.89-8.5 8.68 0 4.79 3.804 8.67 8.5 8.67s8.5-3.88 8.5-8.67c0-1.78-.53-3.44-1.431-4.82M11.226 1.5l2.833 3.32-3.314 2.46"
      />
    </svg>
  );
}
