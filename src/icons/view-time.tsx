import { SVGProps } from "react";

export default function ViewTimeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={22}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m14.71 14.68-3.1-1.85c-.54-.32-.98-1.09-.98-1.72v-4.1M21 11.5c0 5.52-4.48 10-10 10s-10-4.48-10-10 4.48-10 10-10 10 4.48 10 10Z"
      />
    </svg>
  );
}
