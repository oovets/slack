import { SVGProps } from "react";

export default function ShareOfVoiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={23}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M1.5 8.5v-2c0-3 2-5 5-5h10c3 0 5 2 5 5v2m-20 6v2c0 3 2 5 5 5h10c3 0 5-2 5-5v-2m-20-3h20"
      />
    </svg>
  );
}
