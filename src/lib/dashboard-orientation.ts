import type { DashboardOrientation } from "@/lib/shared-styles-types";

export function parseDashboardOrientation(
  value: unknown,
): DashboardOrientation | null {
  if (typeof value !== "string") return null;

  const normalized = value.toLowerCase();
  if (normalized === "portrait" || normalized === "vertical") {
    return "portrait";
  }
  if (normalized === "landscape" || normalized === "horizontal") {
    return "landscape";
  }

  return null;
}

type CampaignOrientationSource = {
  orientation?: unknown;
  layout?: unknown;
  screenOrientation?: unknown;
  settings?: { orientation?: unknown };
  display?: { orientation?: unknown };
  displaySettings?: { orientation?: unknown };
  dashboard?: { orientation?: unknown };
};

export function getCampaignOrientation(
  campaign: unknown,
): DashboardOrientation | null {
  const source = campaign as CampaignOrientationSource;
  return (
    parseDashboardOrientation(source.orientation) ??
    parseDashboardOrientation(source.settings?.orientation) ??
    parseDashboardOrientation(source.display?.orientation) ??
    parseDashboardOrientation(source.displaySettings?.orientation) ??
    parseDashboardOrientation(source.dashboard?.orientation) ??
    parseDashboardOrientation(source.screenOrientation) ??
    parseDashboardOrientation(source.layout)
  );
}
