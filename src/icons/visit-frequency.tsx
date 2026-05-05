import { SVGProps } from "react";

export default function VisitFrequencyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={19}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeWidth={1.5}
        d="M9.5 12.933c1.699 0 3.076-1.397 3.076-3.12 0-1.724-1.377-3.122-3.076-3.122S6.424 8.09 6.424 9.812c0 1.724 1.377 3.12 3.076 3.12Z"
      />
      <path
        stroke="var(--primary)"
        strokeWidth={1.5}
        d="M1.24 7.992c1.941-8.663 14.589-8.653 16.52.01 1.134 5.08-1.98 9.382-4.711 12.043a5.066 5.066 0 0 1-7.108 0C3.221 17.384.106 13.073 1.24 7.992Z"
      />
    </svg>
  );
}
