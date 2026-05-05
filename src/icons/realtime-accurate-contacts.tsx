import { SVGProps } from "react";

export default function RealtimeAccurateContactsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={25}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.72 11.494c0 2.393-1.881 4.326-4.208 4.326s-4.208-1.933-4.208-4.326 1.88-4.326 4.208-4.326c2.327 0 4.207 1.933 4.207 4.326Z"
      />
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12.5 21.488c4.149 0 8.015-2.514 10.707-6.864 1.057-1.704 1.057-4.568 0-6.272C20.515 4.014 16.66 1.5 12.5 1.5c-4.149 0-8.004 2.514-10.707 6.864-1.057 1.704-1.057 4.568 0 6.272C4.485 18.986 8.351 21.5 12.5 21.5v-.012Z"
      />
    </svg>
  );
}
