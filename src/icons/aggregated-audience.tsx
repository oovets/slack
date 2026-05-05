import { SVGProps } from "react";

export default function AggregatedAudienceIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M15.466 3.65a3.473 3.473 0 0 1 3.475 3.476 3.454 3.454 0 0 1-3.346 3.475c-.08-.01-.169-.01-.258 0m2.055 8.937c.715-.149 1.39-.437 1.946-.864 1.55-1.162 1.55-3.078 0-4.24-.546-.417-1.211-.695-1.916-.854m-9.155-3.108a1.81 1.81 0 0 0-.328 0A4.389 4.389 0 0 1 3.7 6.074c0-2.384 1.966-4.41 4.419-4.41a4.399 4.399 0 0 1 4.409 4.41 4.397 4.397 0 0 1-4.25 4.398h-.01Zm-4.965 3.664c-2.403 1.609-2.403 4.23 0 5.829 2.73 1.827 7.209 1.827 9.94 0 2.402-1.609 2.402-4.23 0-5.829-2.721-1.817-7.2-1.817-9.94 0Z"
      />
    </svg>
  );
}
