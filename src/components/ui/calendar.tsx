"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "eidra-sans text-sm font-bold tracking-tight",
        nav: "flex items-center gap-1 absolute right-1 top-1",
        button_previous: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-black/10 bg-[#F5F2ED] text-black hover:bg-black/5 transition",
        ),
        button_next: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-black/10 bg-[#F5F2ED] text-black hover:bg-black/5 transition",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-black/50 eidra-sans w-9 text-[11px] font-medium uppercase tracking-wide",
        week: "flex w-full mt-1",
        day: "relative h-9 w-9 p-0 text-center text-[13px] eidra-sans",
        day_button: cn(
          "h-9 w-9 inline-flex items-center justify-center rounded-md font-medium tracking-tight",
          "hover:bg-black/5 transition-colors",
        ),
        range_start:
          "[&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        range_end:
          "[&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        range_middle: "[&>button]:bg-black/10 [&>button]:text-black",
        selected:
          "[&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-black",
        today: "[&>button]:underline underline-offset-4",
        outside: "text-black/30",
        disabled: "text-black/20 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
