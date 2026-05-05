import { HalfPieChartOverview } from "../ui/half-pie-chart/half-pie-chart-overview";
import { HalfPieChart } from "../ui/half-pie-chart/half-pie-chart";
import { ContactsByGender } from "@/lib/types";

type HalfPieChartProps = {
  contactsByGender: ContactsByGender;
  /** When true, omits the side Female/Male count column (e.g. landscape layout). */
  hideOverview?: boolean;
};

export function HalfPieChartSection({
  contactsByGender,
  hideOverview,
}: HalfPieChartProps) {
  return (
    <>
      {!hideOverview ? (
        <HalfPieChartOverview contactsByGender={contactsByGender} />
      ) : null}
      <HalfPieChart
        values={contactsByGender}
        layout={hideOverview ? "landscape" : "portrait"}
      />
    </>
  );
}
