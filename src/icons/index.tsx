import { lazy, LazyExoticComponent } from "react";

import { MetricItemIcon } from "@/lib/types";

const AggregatedAudienceIcon = lazy(() => import("./aggregated-audience"));
const RealtimeAccurateContactsIcon = lazy(
  () => import("./realtime-accurate-contacts"),
);
const ShareOfVoiceIcon = lazy(() => import("./share-of-voice"));
const UniqueContactsIcon = lazy(() => import("./unique-contacts"));
const ViewFrequencyIcon = lazy(() => import("./view-frequency"));
const ViewTimeIcon = lazy(() => import("./view-time"));
const VisitFrequencyIcon = lazy(() => import("./visit-frequency"));

export function Icon({ src, className, style }: { src: MetricItemIcon, className?: string, style?: React.CSSProperties }) {
  const mapper: Record<MetricItemIcon, LazyExoticComponent<React.ComponentType<React.SVGProps<SVGSVGElement>>>> = {
    "aggregated-audience": AggregatedAudienceIcon,
    "realtime-accurate-contacts": RealtimeAccurateContactsIcon,
    "share-of-voice": ShareOfVoiceIcon,
    "unique-contacts": UniqueContactsIcon,
    "view-frequency": ViewFrequencyIcon,
    "view-time": ViewTimeIcon,
    "visit-frequency": VisitFrequencyIcon,
  };

  const Component = mapper[src];

  return <Component className={className} style={style} />;
}
