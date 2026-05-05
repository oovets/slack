import { HTMLAttributes, CSSProperties } from "react";

import { cn } from "@/lib/utils";

type BoxProps = {
  children: React.ReactNode;
  className?: HTMLAttributes<HTMLDivElement>["className"];
  title?: string;
  style?: CSSProperties;
  id?: string;
};

export function Box({ children, title, className, style, id }: BoxProps) {
  const px = "px-[28px]";
  const py = "py-[40px]";

  return (
    <div
      id={id}
      className={cn(
        `relative overflow-hidden ${px} ${py}`,
        className,
      )}
      style={style}
    >
      {title ? (
        <h3 
          id={id ? `${id}-title` : undefined}
          className="eidra-sans font-bold text-[36px] leading-[14px] mb-[34px]"
          style={{
            textRendering: 'geometricPrecision',
            color: '#000000', // color: 'var(--primary)',
            // fontFamily: 'var(--font-family-heading)',
            // fontSize: 'var(--font-size-heading)',
            // fontWeight: 'var(--font-weight-bold)',
          }}
        >
          {title}
        </h3>
      ) : null}

      {children}
    </div>
  );
}
