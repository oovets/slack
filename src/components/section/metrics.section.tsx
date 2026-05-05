import { MetricItem } from "../ui/metric-item";
import { cn } from "@/lib/utils";
import type { MetricItemIcon } from "@/lib/types";

export type MetricsSectionLayout = "portrait" | "landscape";

type MetricsProps = {
  metricItems: {
    name: string;
    amount: number;
    icon: MetricItemIcon;
    postfix?: string;
    decimalPlaces?: number;
    visible?: boolean;
  }[];
  layout?: MetricsSectionLayout;
  columns?: 3 | 4;
};

export function MetricsSection({
  metricItems,
  layout = "portrait",
  columns = 3,
}: MetricsProps) {
  return (
    <div
      className={cn(
        "grid rounded-lg bg-[#FFFFFF]",
        layout === "landscape"
          ? "h-full min-h-0 flex-1 grid-cols-3 content-stretch gap-x-2 gap-y-2.5"
          : columns === 4
            ? "grid-cols-2 xl:grid-cols-4"
            : "grid-cols-3",
      )}
    >
      {metricItems.map((metricItem, idx) => (
        <MetricItem key={idx} {...metricItem} layout={layout} />
      ))}
    </div>
  );
}
