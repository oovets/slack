import { SVGProps } from "react";

export default function UniqueContactsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={23}
      fill="none"
      {...props}
    >
      <path
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7.995 10.403a1.807 1.807 0 0 0-.339 0c-2.443-.085-4.383-2.152-4.383-4.696C3.273 3.163 5.306 1 7.841 1c2.535 0 4.557 2.11 4.557 4.707 0 2.544-1.95 4.611-4.393 4.696h-.01ZM2.863 14.315c-2.484 1.717-2.484 4.515 0 6.222 2.822 1.95 7.452 1.95 10.274 0 2.484-1.717 2.484-4.516 0-6.222-2.812-1.94-7.441-1.94-10.274 0Z"
      />
    </svg>
  );
}
