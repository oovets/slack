"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  Clock,
  Cpu,
  Database,
  HardDrive,
  LayoutGrid,
  Maximize2,
  Rows3,
  Pause,
  Play,
  Thermometer,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import { AgeGroupsSection } from "@/components/section/age-groups.section";
import { HalfPieChartSection } from "@/components/section/half-pie-chart.section";
import { MediaValueRacSection } from "@/components/section/media-value-rac.section";
import { MetricsSection } from "@/components/section/metrics.section";
import { Box, BoxCompactContext } from "@/components/ui/box";
import { Footer } from "@/components/ui/footer";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { ageGroupsData } from "@/lib/constants";
import type { AgeGroupItem, MetricItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ============================================================
 * Types — mirror aspace HostEventDashboard.tsx payloads
 * ============================================================ */
interface HostMetrics {
  ts?: number;
  cpu_avg?: number | null;
  gpu_pct?: number | null;
  ram_total_mb?: number;
  ram_used_mb?: number;
  swap_total_mb?: number;
  swap_used_mb?: number;
  disk_pct?: number | null;
  temps?: { cpu?: number; gpu?: number };
  power?: { VDD_IN?: { current_mw?: number } };
  services?: Record<string, string>;
  containers?: { name: string; status: string }[];
}
interface HostOverview {
  host: string;
  tailscale: { online: boolean; addresses: string[]; last_seen?: string };
  alarms: { active: { name: string; status: string; info: string }[]; count: number };
  metrics?: HostMetrics;
  sampled_at: number;
}
interface MongoStats {
  cluster: {
    writes_per_sec: number | null;
    inserts_per_sec: number | null;
    opcounters: Record<string, unknown>;
  };
  host_collections: {
    name: string;
    last_60s?: number;
    per_sec?: number;
    last_inserted?: string;
    error?: string;
  }[];
  analytics_global?: { last_60s?: number; per_sec?: number } | null;
  sampled_at: number;
}
interface AnalyticsDoc {
  _id: string;
  _inserted_at?: string;
  label?: string;
  event?: string;
  type?: string;
  camera_id?: string;
  confidence?: number;
  count?: number;
  detections?: unknown[];
  tracks?: unknown[];
  fps?: number;
  hostname?: string;
  host?: string;
  timestamp?: string;
  ts?: number;
  [key: string]: unknown;
}
interface AnalyticsRecent {
  docs: AnalyticsDoc[];
}
interface CamSummary {
  camera_id: string;
  total_detections?: number;
  unique_persons: number;
  rac?: number;
  total_visit_frequency?: number;
  males: number;
  females: number;
  unknown_gender: number;
  avg_age: number | null;
  min_age?: number | null;
  max_age?: number | null;
  looked_at_camera: number;
  looked_pct: number;
  first_seen?: string;
  last_seen?: string;
  age_groups?: AgeGroupSummary;
}
interface AgeGroupSummary {
  counts: Record<string, number>;
  percentages: Record<string, number>;
  total_with_age: number;
}
interface AnalyticsTrendPoint {
  ts: number;
  currentValue: number;
}
interface DualCameraSummary {
  camera_id: string;
  total_detections: number;
  unique_persons: number;
  rac: number;
  demographics_count: number;
  looked_pct: number;
}
interface DualCameraTimelinePoint {
  ts: number;
  active_cameras: number;
  rac: number;
  reach: number;
  confirmed_reach: number;
}
interface DualCameraInsight {
  available: boolean;
  reason: string | null;
  camera_count: number;
  deduped_audience?: number;
  raw_camera_unique_sum?: number;
  double_count_prevented?: number;
  confirmed_by_multiple_angles?: number;
  single_angle_only?: number;
  angle_agreement_pct?: number;
  detection_balance_pct?: number;
  rac_balance_pct?: number;
  confidence_score?: number;
  active_bucket_count?: number;
  synced_bucket_count?: number;
  synced_bucket_pct?: number;
  best_detection_camera?: DualCameraSummary | null;
  best_attention_camera?: DualCameraSummary | null;
  best_demographics_camera?: DualCameraSummary | null;
  cameras?: DualCameraSummary[];
  timeline?: DualCameraTimelinePoint[];
}
interface AnalyticsSummary {
  host: string;
  target?: {
    kind: "host" | "tag";
    id: string;
    label: string;
    hosts: string[];
    online_hosts?: string[];
    host_count?: number;
    online_count?: number;
  };
  totals?: {
    total_detections: number;
    unique_persons: number;
    male_count: number;
    female_count: number;
    total_with_gender: number;
    male_percentage: number;
    female_percentage: number;
    rac: number;
    total_visit_frequency: number;
    total_observation_time_sec: number;
    avg_observation_time_sec: number;
    total_observation_time_min: number;
    avg_view_frequency: number;
    avg_visit_frequency: number;
    looked_at_screen_pct?: number;
    looked_away_pct?: number;
    avg_spent_in_zone_sec?: number;
    not_reached?: number;
    age_groups?: AgeGroupSummary;
  };
  trends?: {
    rac_over_time?: AnalyticsTrendPoint[];
    reach_over_time?: AnalyticsTrendPoint[];
  };
  dual_camera?: DualCameraInsight;
  cameras: CamSummary[];
  sampled_at: number;
  cached_age_sec?: number;
}
/** Calendar-aware time range used by the analytics queries. */
type TimeRangeKey = "today" | "yesterday" | "7d" | "1h";
interface TimeRange {
  key: TimeRangeKey;
  label: string;
  /** Epoch seconds (UTC) — start inclusive. */
  start: number;
  /** Epoch seconds (UTC) — end exclusive. null = up to now (rolling). */
  end: number | null;
}

/** Build the four supported ranges anchored to Europe/Stockholm local time so
 *  that "today" / "yesterday" line up with the user's calendar — not UTC. */
function buildTimeRanges(): Record<TimeRangeKey, TimeRange> {
  const now = new Date();
  // Local midnight of "today" in the browser's timezone.
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
  const epoch = (d: Date) => Math.floor(d.getTime() / 1000);
  return {
    today: { key: "today", label: "Today", start: epoch(todayStart), end: null },
    yesterday: {
      key: "yesterday",
      label: "Yesterday",
      start: epoch(yesterdayStart),
      end: epoch(todayStart),
    },
    "7d": { key: "7d", label: "Last 7 days", start: epoch(sevenDaysAgo), end: null },
    "1h": { key: "1h", label: "Last hour", start: epoch(oneHourAgo), end: null },
  };
}

interface UptimeBucket {
  ts: number;
  online: number;
  total: number;
  pct: number | null;
}
interface UptimeResponse {
  host: string;
  window: UptimeWindow;
  sample_count: number;
  online_pct: number | null;
  first_sample_ts: number | null;
  last_sample_ts: number | null;
  buckets: UptimeBucket[];
  sampled_at: number;
}
type UptimeWindow = "24h" | "7d" | "30d";

interface NetworkPoint {
  ts: number;
  mbps: number;
}
interface NetworkResponse {
  host: string;
  rx_mbps: number | null;
  tx_mbps: number | null;
  rx_peak_30m: number | null;
  rx_avg_30m: number | null;
  tx_peak_30m: number | null;
  tx_avg_30m: number | null;
  rx_history: NetworkPoint[];
  tx_history: NetworkPoint[];
  window_sec: number;
  step_sec: number;
  source: string;
  sampled_at: number;
}
type DashboardTab = "vision" | "bleCsi";
interface CountShareItem {
  value: string;
  count: number;
  share: number | null;
}
interface BleCsiTopFingerprint {
  fingerprint: string;
  rawDocs: number;
  scanCountSum: number;
  activeDays: number;
  firstSeen?: string;
  latestSeen?: string;
}
interface BleCsiStaffCandidate {
  fingerprint: string;
  rawDocs: number;
  scanCountSum: number;
  activeDays: number;
  activeHours: number;
  latestSeen?: string;
}
interface BleCsiHistoryPoint {
  ts: number;
  totalMacs: number;
  macsCollapsed: number;
  uniqueDevices: number;
  nearbyPhones: number;
  transientVehicles: number;
}
interface BleCsiMotionPoint {
  hour: string;
  motionScore: number;
  count: number;
}
interface BleCsiResponse {
  host: string;
  window: TimeRangeKey;
  range: { start: number; end: number };
  collections: {
    device: string[];
    scanner: string[];
    fingerprint: string[];
    csi: string[];
  };
  ble: {
    rawDeviceDocs: number;
    rawScanCountSum: number;
    uniqueDeviceIds: number;
    uniquePayloadFingerprints: number;
    qualityFilteredFingerprints: number;
    estimatedAudience: number;
    sessionizedAudience: number;
    avgRssi: number | null;
    latestSeen: number | null;
    hourlyDistribution: Record<string, number>;
    weekdayHourHeatmap: Record<string, number>;
    rssiBuckets: Record<string, number>;
    scanCountBuckets: Record<string, number>;
    deviceClassCounts: Record<string, number>;
    topCompanies: CountShareItem[];
    topManufacturers: CountShareItem[];
    topModels: CountShareItem[];
    topFingerprints: BleCsiTopFingerprint[];
    repeatFingerprints: number;
    persistentFingerprints: number;
    staffOrFixtureCandidates: BleCsiStaffCandidate[];
  };
  scannerHealth: {
    latestSeen: number | null;
    totalMacs: number;
    macsCollapsed: number;
    uniqueDevices: number;
    nearbyPhones: number;
    transientVehicles: number;
    byClass: Record<string, number>;
    history: BleCsiHistoryPoint[];
  };
  csi: {
    available: boolean;
    docCount: number;
    hourlyMotion: BleCsiMotionPoint[];
    detailedHourly: BleCsiMotionPoint[];
    latestSeen: number | null;
  };
  sampled_at: number;
}
interface TailscaleAllDevicesResponse {
  success: boolean;
  hosts: {
    hostname: string;
    online: boolean;
    tags?: string[];
  }[];
  all_tags?: string[];
}

const HOSTS = Array.from({ length: 60 }, (_, i) => `aspace-prod-${i + 1}`);
const API = "/api/aspace";
const IGNORED_TARGET_TAGS = new Set([
  "tag:prod",
  "tag:dev",
  "tag:aws",
  "tag:cvat",
  "tag:facit",
  "tag:jetson",
  "tag:aicam",
  "tag:rpi",
]);

const boxStyles = {
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  borderWidth: 0,
  borderColor: "transparent",
  borderStyle: "solid" as const,
  boxShadow: "none",
};
/** Shared typography for the entire toolbar — change here to update every
 *  select / pill / tab / button at once. Pairs with `toolbarRowClass` (height +
 *  vertical alignment) so all controls share one baseline. */
const toolbarTextClass =
  "eidra-sans text-[13px] font-bold leading-none tracking-tight";
const toolbarRowClass = "inline-flex h-9 items-center";
const toolbarSurfaceClass =
  "rounded-md border border-black/10 bg-[#F5F2ED] text-black";
const toolbarControlClass = cn(
  toolbarRowClass,
  toolbarSurfaceClass,
  toolbarTextClass,
  "gap-1.5 px-3 transition hover:bg-black/5",
);
const toolbarSegmentClass = cn(
  toolbarRowClass,
  toolbarSurfaceClass,
  toolbarTextClass,
  "overflow-hidden",
);
const toolbarSegmentButtonClass = cn(
  "inline-flex h-full items-center px-3 transition",
  toolbarTextClass,
);
const toolbarPillClass = cn(
  toolbarRowClass,
  toolbarSurfaceClass,
  toolbarTextClass,
  "gap-1.5 px-3",
);

/** Compact mode shrinks paddings, fonts, and hides verbose details across
 *  every card without changing the underlying values. Read with `useCompact()`. */
const CompactContext = createContext(false);
const useCompact = () => useContext(CompactContext);

/* ============================================================
 * Layout
 * ============================================================ */
function Inner({ host }: { host: string }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("host-dashboard-compact") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("host-dashboard-compact", compact ? "1" : "0");
  }, [compact]);
  const [timeRangeKey, setTimeRangeKey] = useState<TimeRangeKey>("today");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("vision");
  const [uptimeWindow, setUptimeWindow] = useState<UptimeWindow>("24h");
  const containerRef = useRef<HTMLDivElement>(null);
  const isTagTarget = host.startsWith("tag:");
  const encodedTarget = encodeURIComponent(host);
  const targetLabel = isTagTarget ? formatTagLabel(host) : host;
  useEffect(() => {
    if (isTagTarget) setDashboardTab("vision");
  }, [isTagTarget]);

  // Recompute time-range bounds whenever the user picks a new range, but
  // also at most once a minute so "Today" rolls forward as time passes.
  const [rangeTick, setRangeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRangeTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const timeRanges = useMemo(
    () => buildTimeRanges(),
    // rangeTick intentionally drives recomputation so "Today" rolls forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeTick],
  );
  const timeRange = timeRanges[timeRangeKey];
  const heroTitle = useMemo(() => {
    if (timeRangeKey === "yesterday") return `Yesterday metrics from ${targetLabel}`;
    if (timeRangeKey === "7d") return `Last week metrics from ${targetLabel}`;
    if (timeRangeKey === "today") return `Today metrics from ${targetLabel}`;
    return `Live metrics from ${targetLabel}`;
  }, [timeRangeKey, targetLabel]);

  // MJPEG cache-bust tick
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, [paused]);

  const { data: overview } = useQuery<HostOverview>({
    queryKey: ["host-overview", host],
    queryFn: async () => {
      const r = await fetch(`${API}/host-overview/${encodedTarget}`);
      if (!r.ok) throw new Error("overview");
      return r.json();
    },
    enabled: !isTagTarget,
    refetchInterval: paused ? false : 5_000,
    placeholderData: keepPreviousData,
    staleTime: 4_000,
  });

  const { data: tailscaleDevices } = useQuery<TailscaleAllDevicesResponse>({
    queryKey: ["tailscale-all-devices"],
    queryFn: async () => {
      const r = await fetch(`${API}/tailscale/all-devices`);
      if (!r.ok) throw new Error("tailscale-all-devices");
      return r.json();
    },
    refetchInterval: paused ? false : 30_000,
    staleTime: 20_000,
  });

  const selectableHosts = useMemo(() => {
    const online = new Set(
      (tailscaleDevices?.hosts || [])
        .filter((h) => h.online)
        .map((h) => h.hostname),
    );
    let filtered = HOSTS.filter((h) => online.has(h));
    if (filtered.length === 0) filtered = [...HOSTS];
    if (!isTagTarget && !filtered.includes(host)) filtered = [host, ...filtered];
    return filtered;
  }, [tailscaleDevices, host, isTagTarget]);

  const selectableTags = useMemo(() => {
    const tags = new Map<string, { id: string; label: string; hostCount: number; onlineCount: number }>();
    for (const tag of tailscaleDevices?.all_tags || []) {
      const normalized = normalizeTagId(tag);
      if (!normalized || IGNORED_TARGET_TAGS.has(normalized)) continue;
      tags.set(normalized, {
        id: normalized,
        label: formatTagLabel(normalized),
        hostCount: 0,
        onlineCount: 0,
      });
    }
    for (const device of tailscaleDevices?.hosts || []) {
      for (const tag of device.tags || []) {
        const normalized = normalizeTagId(tag);
        const target = tags.get(normalized);
        if (!target) continue;
        target.hostCount += 1;
        if (device.online) target.onlineCount += 1;
      }
    }
    if (isTagTarget && !tags.has(host)) {
      tags.set(host, {
        id: host,
        label: formatTagLabel(host),
        hostCount: 0,
        onlineCount: 0,
      });
    }
    return [...tags.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [host, isTagTarget, tailscaleDevices]);

  const { data: mongo } = useQuery<MongoStats>({
    queryKey: ["host-mongo", host],
    queryFn: async () => {
      const r = await fetch(`${API}/host-overview/${encodedTarget}/mongo`);
      if (!r.ok) throw new Error("mongo");
      return r.json();
    },
    enabled: !isTagTarget,
    refetchInterval: paused ? false : 3_000,
    placeholderData: keepPreviousData,
    staleTime: 2_000,
  });

  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ["host-summary", host, timeRange.key, timeRange.start, timeRange.end],
    queryFn: async () => {
      const params = new URLSearchParams({
        window: timeRange.key,
        start: String(timeRange.start),
      });
      if (timeRange.end != null) params.set("end", String(timeRange.end));
      const r = await fetch(
        `${API}/host-overview/${encodedTarget}/analytics-summary?${params.toString()}`,
      );
      if (!r.ok) throw new Error("summary");
      return r.json();
    },
    refetchInterval: paused ? false : 12_000,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const { data: uptime } = useQuery<UptimeResponse>({
    queryKey: ["host-uptime", host, uptimeWindow],
    queryFn: async () => {
      const r = await fetch(
        `${API}/host-overview/${encodedTarget}/uptime?window=${uptimeWindow}`,
      );
      if (!r.ok) throw new Error("uptime");
      return r.json();
    },
    enabled: !isTagTarget,
    refetchInterval: paused ? false : 60_000,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const { data: network } = useQuery<NetworkResponse>({
    queryKey: ["host-network", host],
    queryFn: async () => {
      const r = await fetch(`${API}/host-overview/${encodedTarget}/network`);
      if (!r.ok) throw new Error("network");
      return r.json();
    },
    enabled: !isTagTarget,
    refetchInterval: paused ? false : 5_000,
    placeholderData: keepPreviousData,
    staleTime: 4_000,
  });

  const { data: analytics } = useQuery<AnalyticsRecent>({
    queryKey: ["host-analytics", host, timeRange.key, timeRange.start, timeRange.end],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
        start: String(timeRange.start),
      });
      if (timeRange.end != null) params.set("end", String(timeRange.end));
      const r = await fetch(`${API}/host-overview/${encodedTarget}/analytics-recent?${params.toString()}`);
      if (!r.ok) throw new Error("analytics");
      return r.json();
    },
    // Historical ranges (yesterday) are immutable — poll less aggressively.
    refetchInterval: paused ? false : timeRange.end != null ? 60_000 : 4_000,
    placeholderData: keepPreviousData,
    staleTime: timeRange.end != null ? 30_000 : 3_000,
  });

  const { data: bleCsi } = useQuery<BleCsiResponse>({
    queryKey: ["host-ble-csi", host, timeRange.key, timeRange.start, timeRange.end],
    queryFn: async () => {
      const params = new URLSearchParams({
        window: timeRange.key,
        start: String(timeRange.start),
      });
      if (timeRange.end != null) params.set("end", String(timeRange.end));
      const r = await fetch(`${API}/host-overview/${encodedTarget}/ble-csi?${params.toString()}`);
      if (!r.ok) throw new Error("ble-csi");
      return r.json();
    },
    enabled: !isTagTarget && dashboardTab === "bleCsi",
    refetchInterval: paused ? false : timeRange.end != null ? 60_000 : 15_000,
    placeholderData: keepPreviousData,
    staleTime: timeRange.end != null ? 60_000 : 12_000,
  });

  /**
   * Host-specific Mongo activity, summed across this host's collections.
   *  - hostInsertsPerSec: real-time insert rate for THIS host (sum of per_sec
   *    across host_collections, since cluster-level writes_per_sec covers
   *    the whole MongoDB cluster).
   *  - hostInsertsPerMin: docs inserted in the last 60 seconds for THIS host.
   */
  const hostInsertsPerSec = useMemo(() => {
    if (!mongo) return null;
    const cols = mongo.host_collections || [];
    if (cols.length === 0) return null;
    return cols.reduce((s, c) => s + (c.per_sec ?? 0), 0);
  }, [mongo]);

  const hostInsertsPerMin = useMemo(() => {
    if (!mongo) return null;
    const cols = mongo.host_collections || [];
    if (cols.length === 0) return null;
    return cols.reduce((s, c) => s + (c.last_60s ?? 0), 0);
  }, [mongo]);

  // Sparkline histories — both host-scoped, reset on host change.
  const [writesHistory, setWritesHistory] = useState<number[]>([]);
  const [analyticsRateHistory, setAnalyticsRateHistory] = useState<number[]>([]);
  useEffect(() => {
    setWritesHistory([]);
    setAnalyticsRateHistory([]);
  }, [host]);
  useEffect(() => {
    if (!mongo) return;
    if (hostInsertsPerSec != null) {
      setWritesHistory((prev) => {
        const next = [...prev, hostInsertsPerSec];
        return next.length > 60 ? next.slice(-60) : next;
      });
    }
    const analyticsLast60 = mongo.host_collections.find(
      (c) => c.name === "analytics",
    )?.last_60s;
    if (analyticsLast60 != null) {
      setAnalyticsRateHistory((prev) => {
        const next = [...prev, analyticsLast60];
        return next.length > 60 ? next.slice(-60) : next;
      });
    }
  }, [mongo, host, hostInsertsPerSec]);

  const isOnline = isTagTarget
    ? (summary?.target?.online_count ?? 0) > 0
    : overview?.tailscale.online ?? false;

  const sysMetrics = useMemo(() => {
    const raw: HostMetrics = overview?.metrics || {};
    const ramPct = raw.ram_total_mb && raw.ram_used_mb != null
      ? Math.round((raw.ram_used_mb / raw.ram_total_mb) * 100)
      : null;
    const swapPct = raw.swap_total_mb && raw.swap_used_mb != null
      ? Math.round((raw.swap_used_mb / raw.swap_total_mb) * 100)
      : null;
    return {
      cpu: raw.cpu_avg ?? null,
      gpu: raw.gpu_pct ?? null,
      ram: ramPct,
      disk: raw.disk_pct ?? null,
      tempCpu: raw.temps?.cpu != null ? Math.round(raw.temps.cpu) : null,
      tempGpu: raw.temps?.gpu != null ? Math.round(raw.temps.gpu) : null,
      power: raw.power?.VDD_IN?.current_mw != null
        ? Math.round(raw.power.VDD_IN.current_mw / 1000) : null,
      swapPct,
      ramUsedGb: raw.ram_used_mb != null ? +(raw.ram_used_mb / 1024).toFixed(1) : null,
      ramTotalGb: raw.ram_total_mb != null ? +(raw.ram_total_mb / 1024).toFixed(1) : null,
      services: raw.services || {},
      containers: raw.containers || [],
      ts: raw.ts,
    };
  }, [overview]);

  const overallHealth = useMemo(() => {
    const issues: string[] = [];
    if (isTagTarget) return issues;
    if (!isOnline) issues.push("Offline");
    if ((overview?.alarms.count ?? 0) > 0) issues.push(`${overview!.alarms.count} alarms`);
    if (sysMetrics.cpu != null && sysMetrics.cpu > 90) issues.push("CPU");
    if (sysMetrics.ram != null && sysMetrics.ram > 90) issues.push("RAM");
    if (sysMetrics.tempCpu != null && sysMetrics.tempCpu > 80) issues.push("Hot");
    return issues;
  }, [isOnline, isTagTarget, overview, sysMetrics]);

  /**
   * Per-camera analytics — render every camera the backend actually returned for
   * this host instead of hardcoding `cam_5000-<host>` / `cam_5001-<host>`.
   * Backend filter is `camera_id ~ /-<host>$/`, so naming varies by host
   * (some hosts have one camera named exactly `<host>`, others have
   * `cam_5000-<host>` and `cam_5001-<host>`).
   *
   * Sort so cameras whose id contains `:5000` come first, then `:5001`,
   * then alphabetical — keeps the order stable and predictable.
   */
  const cams = useMemo<CamSummary[]>(() => {
    let list = [...(summary?.cameras || [])];
    // Per-host hidden camera_id list. aspace-prod-53 still has legacy cam_1
    // and cam_2 documents in MongoDB that should not surface in the dashboard.
    const HIDDEN_BY_HOST: Record<string, string[]> = {
      "aspace-prod-53": [
        "cam_1-aspace-prod-53",
        "cam_2-aspace-prod-53",
      ],
    };
    const hidden = HIDDEN_BY_HOST[host];
    if (hidden && hidden.length > 0) {
      list = list.filter((c) => !hidden.includes(c.camera_id));
    }
    list.sort((a, b) => {
      const portOf = (id: string) => {
        const m = id.match(/cam_(\d+)/);
        return m ? Number(m[1]) : 9999;
      };
      const pa = portOf(a.camera_id);
      const pb = portOf(b.camera_id);
      if (pa !== pb) return pa - pb;
      return a.camera_id.localeCompare(b.camera_id);
    });
    return list;
  }, [summary, host]);

  const totals = useMemo(() => {
    const detections = cams.reduce(
      (s, c) => s + (c.total_detections ?? c.unique_persons ?? 0),
      0,
    );
    const unique = summary?.totals?.unique_persons
      ?? cams.reduce((s, c) => s + (c.unique_persons || 0), 0);
    const rac = summary?.totals?.rac
      ?? cams.reduce((s, c) => s + (c.rac ?? c.looked_at_camera ?? 0), 0);
    const males = summary?.totals?.male_count
      ?? cams.reduce((s, c) => s + (c.males || 0), 0);
    const females = summary?.totals?.female_count
      ?? cams.reduce((s, c) => s + (c.females || 0), 0);
    const totalDetections = summary?.totals?.total_detections ?? detections;
    const avgObservationTime = summary?.totals?.avg_observation_time_sec ?? 0;
    const totalObservationMinutes = summary?.totals?.total_observation_time_min ?? 0;
    const totalObservationSeconds = summary?.totals?.total_observation_time_sec ?? 0;
    const lookedAtScreenPct = summary?.totals?.looked_at_screen_pct
      ?? (totalDetections > 0 ? (unique / totalDetections) * 100 : 0);
    const lookedAwayPct = summary?.totals?.looked_away_pct
      ?? (totalDetections > 0 ? Math.max(0, 100 - lookedAtScreenPct) : 0);
    const avgSpentInZone = summary?.totals?.avg_spent_in_zone_sec
      ?? (unique > 0 ? totalObservationSeconds / unique : 0);
    const notReached = summary?.totals?.not_reached
      ?? Math.max(0, totalDetections - unique);
    return {
      detections: totalDetections,
      unique,
      rac,
      avgViewFrequency: summary?.totals?.avg_view_frequency ?? (unique > 0 ? rac / unique : 0),
      avgVisitFrequency: summary?.totals?.avg_visit_frequency ?? 0,
      avgObservationTime,
      totalObservationMinutes,
      totalObservationSeconds,
      lookedAtScreenPct,
      lookedAwayPct,
      avgSpentInZone,
      notReached,
      males,
      females,
      contactsByGender: {
        left: { title: "Female", number: females },
        right: { title: "Male", number: males },
      },
    };
  }, [cams, summary]);

  const nextmViewTimeTotal = useMemo(() => {
    const minutes = totals.totalObservationMinutes;
    if (minutes >= 60) {
      return { amount: minutes / 60, postfix: "h", decimalPlaces: 2 };
    }
    return { amount: minutes, postfix: "m", decimalPlaces: 1 };
  }, [totals.totalObservationMinutes]);

  const nextmMetrics = useMemo<MetricItem[]>(() => [
    {
      name: "Unique Contacts",
      amount: totals.unique,
      icon: "unique-contacts",
      decimalPlaces: 0,
      visible: true,
    },
    {
      name: "Realtime Accurate Contacts",
      amount: totals.rac,
      icon: "realtime-accurate-contacts",
      decimalPlaces: 0,
      visible: true,
    },
    {
      name: "Aggregated Audience",
      amount: totals.detections,
      icon: "aggregated-audience",
      decimalPlaces: 0,
      visible: true,
    },
    {
      name: "View Frequency (avr.)",
      amount: totals.avgViewFrequency,
      icon: "view-frequency",
      decimalPlaces: 1,
      visible: true,
    },
    {
      name: "Visit Frequency (avr.)",
      amount: totals.avgVisitFrequency,
      icon: "visit-frequency",
      decimalPlaces: 1,
      visible: true,
    },
    {
      name: "View Time (avr.)",
      amount: totals.avgObservationTime,
      postfix: "s",
      icon: "view-time",
      decimalPlaces: 1,
      visible: true,
    },
    {
      name: "View Time (Total)",
      amount: nextmViewTimeTotal.amount,
      postfix: nextmViewTimeTotal.postfix,
      icon: "view-time",
      decimalPlaces: nextmViewTimeTotal.decimalPlaces,
      visible: true,
    },
    {
      name: "Share of Voice",
      amount: 100,
      postfix: "%",
      icon: "share-of-voice",
      decimalPlaces: 0,
      visible: true,
    },
  ], [totals, nextmViewTimeTotal]);

  const racTrend = summary?.trends?.rac_over_time ?? [];
  const reachTrend = summary?.trends?.reach_over_time ?? [];
  const dualCamera = summary?.dual_camera;
  const showDualCamera =
    !isTagTarget && ((dualCamera?.available ?? false) || (dualCamera?.camera_count ?? cams.length) > 1);

  const visibilityMetrics = useMemo(() => {
    const totalHumans = totals.detections || 0;
    const pctOf = (n: number) =>
      totalHumans > 0 ? Math.max(0, Math.min(100, (n / totalHumans) * 100)) : 0;
    return [
      {
        title: "Looked at screen",
        number: totals.lookedAtScreenPct,
        postfix: "%",
        decimals: 1,
        detail: "Unique contacts / aggregated audience",
        progress: totals.lookedAtScreenPct,
        tone: "positive" as const,
      },
      {
        title: "Looked away",
        number: totals.lookedAwayPct,
        postfix: "%",
        decimals: 1,
        detail: "Audience not converted into contacts",
        progress: totals.lookedAwayPct,
        tone: "warn" as const,
      },
      {
        title: "Avg spent in zone",
        number: totals.avgSpentInZone,
        postfix: "s",
        decimals: 1,
        detail: "Total observation time / unique contacts",
        tone: "neutral" as const,
      },
      {
        title: "Total observation time",
        number: totals.totalObservationMinutes,
        postfix: "m",
        decimals: 1,
        detail: "All looking-at-screen observations",
        tone: "accent" as const,
      },
      {
        title: "Total unique contacts",
        number: totals.unique,
        caption: totalHumans ? `/ ${formatMetricNumber(totalHumans)}` : undefined,
        detail: "Deduped people with camera attention",
        progress: pctOf(totals.unique),
        tone: "positive" as const,
      },
      {
        title: "Total humans",
        number: totals.detections,
        detail: "All analytics records in the window",
        tone: "neutral" as const,
      },
      {
        title: "Not reached",
        number: totals.notReached,
        caption: totalHumans ? `/ ${formatMetricNumber(totalHumans)}` : undefined,
        detail: "Total humans minus unique contacts",
        progress: pctOf(totals.notReached),
        tone: "bad" as const,
      },
    ];
  }, [totals]);

  const ageGroups = useMemo<AgeGroupItem[]>(() => {
    const percentages = summary?.totals?.age_groups?.percentages ?? {};
    return ageGroupsData.map((d) => ({
      name: d.name,
      amount: Math.round(percentages[d.name] ?? 0),
      visible: true,
    }));
  }, [summary]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <CompactContext.Provider value={compact}>
    <BoxCompactContext.Provider value={compact}>
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 w-full overflow-y-auto bg-[#fbfbf9]"
    >
      <div className={cn(
        "mx-auto flex w-full max-w-[1400px] flex-col",
        compact ? "gap-1 px-2 py-2" : "gap-5 px-10 py-10",
      )}>
        {/* TOOLBAR — sticky so it remains reachable while scrolling long dashboards */}
        <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-2 rounded-xl border border-black/5 bg-[#fbfbf9]/85 px-4 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-[#fbfbf9]/70">
          <div className="relative">
            <select
              value={host}
              onChange={(e) => router.push(`/host/${encodeURIComponent(e.target.value)}`)}
              className={cn(toolbarControlClass, "appearance-none pr-8 font-mono")}
            >
              <optgroup label="Online hosts">
                {selectableHosts.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </optgroup>
              {selectableTags.length > 0 ? (
                <optgroup label="Tailscale tags">
                  {selectableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.label} ({tag.onlineCount}/{tag.hostCount})
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/50"
            />
          </div>

          {isTagTarget ? (
            <Pill
              tone={isOnline ? "good" : "warn"}
              icon={<Wifi className="h-3.5 w-3.5" />}
              label={`${summary?.target?.online_count ?? 0}/${summary?.target?.host_count ?? 0} online`}
            />
          ) : (
            <Pill
              tone={isOnline ? "good" : "bad"}
              icon={isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              label={isOnline ? "Online" : "Offline"}
            />
          )}
          {overallHealth.length === 0 ? (
            <Pill tone="good" icon={<Activity className="h-3.5 w-3.5" />} label="Healthy" />
          ) : (
            <Pill
              tone="bad"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label={overallHealth.join(" · ")}
            />
          )}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <DashboardTabs
              active={dashboardTab}
              onChange={setDashboardTab}
              showBleCsi={!isTagTarget}
            />
            <TimeRangePicker
              ranges={timeRanges}
              activeKey={timeRangeKey}
              onChange={setTimeRangeKey}
            />
            <span
              className={cn(toolbarPillClass, "tabular-nums text-black/60")}
              aria-live="polite"
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  paused
                    ? "bg-amber-500"
                    : "bg-emerald-500 [animation:pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]",
                )}
                aria-hidden
              />
              {overview ? new Date(overview.sampled_at * 1000).toLocaleTimeString("en-GB") : "—"}
            </span>
            <button
              onClick={() => setCompact((c) => !c)}
              className={cn(toolbarControlClass, compact && "bg-black text-white hover:bg-black")}
              title={compact ? "Switch to comfortable layout" : "Switch to compact overview"}
              aria-pressed={compact}
            >
              {compact ? <LayoutGrid className="h-3.5 w-3.5" /> : <Rows3 className="h-3.5 w-3.5" />}
              {compact ? "Comfort" : "Compact"}
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className={toolbarControlClass}
              title={paused ? "Resume live updates" : "Pause live updates"}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={toggleFullscreen}
              className={toolbarControlClass}
              title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Maximize2 className="h-3.5 w-3.5" /> {fullscreen ? "Exit" : "Fullscreen"}
            </button>
          </div>
        </div>

        {dashboardTab === "vision" ? (
          <>
        {/* LIVE CAMERAS — collapsed by default, sits at the very top */}
        {!isTagTarget ? (
          <CollapsibleBox
            id="block-cameras"
            title="Cameras"
            style={boxStyles}
            defaultOpen={false}
          >
            <CamerasGrid host={host} tick={tick} paused={paused} />
          </CollapsibleBox>
        ) : (
          <Box id="block-tag-scope" title="Tailscale tag scope" style={boxStyles}>
            <TagScopePanel target={summary?.target} />
          </Box>
        )}

        {/* HERO TITLE — typographic contrast: "Live metrics from" muted, target bold */}
        {!compact ? (
          <h1
            id="dashboard-hero-title"
            className="eidra-sans mt-2 text-center font-bold tracking-tight text-black text-[60px] leading-[60px]"
            style={{ textRendering: "geometricPrecision" }}
          >
            {heroTitle.replace(targetLabel, "").trim()} {targetLabel}
          </h1>
        ) : null}

        <Box id="block-nextm-metrics" style={boxStyles}>
          <MetricsSection metricItems={nextmMetrics} columns={4} />
        </Box>

        {/* MEDIA VALUE RAC — derived from real Looked-at-camera count */}
        <Box id="block-media-value-rac" style={boxStyles} className="py-6">
          <MediaValueRacSection racValue={totals.rac} />
        </Box>

        {/* NEXTM ANALYTICS — remaining calculations.ts-derived values */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Box id="block-rac-over-time" title="RAC over time" style={boxStyles}>
            <AnalyticsTrendPanel
              points={racTrend}
              stroke="#DA7C60"
              emptyLabel="No RAC observations in this window."
              valueLabel="RAC"
            />
          </Box>
          <Box id="block-reach-over-time" title="Reach over time" style={boxStyles}>
            <AnalyticsTrendPanel
              points={reachTrend}
              stroke="#63A8A5"
              emptyLabel="No reach data in this window."
              valueLabel="Reach"
            />
          </Box>
        </div>

        {showDualCamera ? (
          <Box id="block-dual-camera" title="Dual-camera intelligence" style={boxStyles}>
            <DualCameraInsightPanel insight={dualCamera} />
          </Box>
        ) : null}

        <Box id="block-visibility-metrics" title="Visibility" style={boxStyles}>
          <div
            className={cn(
              "grid",
              compact
                ? "grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7"
                : "grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 xl:grid-cols-4",
            )}
          >
            {visibilityMetrics.map((metric) => (
              <VisualStatCard
                key={metric.title}
                title={metric.title}
                number={metric.number}
                postfix={metric.postfix}
                decimals={metric.decimals}
                detail={metric.detail}
                caption={metric.caption}
              />
            ))}
          </div>
        </Box>

        {/* AGGREGATE GENDER + AGE — NextM-style pair */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Box id="block-gender" title="Contacts by gender" style={boxStyles}>
            <HalfPieChartSection contactsByGender={totals.contactsByGender} />
          </Box>
          <Box id="block-age" title="Age groups" style={boxStyles}>
            <AgeGroupsSection ageGroups={ageGroups} />
          </Box>
        </div>

        {!isTagTarget ? (
          <>
        {/* SYSTEM KPI TILES */}
        <Box id="block-system" title="System" style={boxStyles}>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3 lg:grid-cols-4">
            <KpiTile icon={<Cpu className="h-9 w-9 text-white" />} label="CPU" value={sysMetrics.cpu} postfix="%" thresholds={[70, 90]} />
            <KpiTile icon={<Cpu className="h-9 w-9 text-white" />} label="GPU" value={sysMetrics.gpu} postfix="%" thresholds={[70, 90]} />
            <KpiTile icon={<HardDrive className="h-9 w-9 text-white" />} label="RAM" value={sysMetrics.ram} postfix="%" thresholds={[75, 90]} />
            <KpiTile icon={<HardDrive className="h-9 w-9 text-white" />} label="Disk" value={sysMetrics.disk} postfix="%" thresholds={[80, 95]} />
            <KpiTile icon={<Thermometer className="h-9 w-9 text-white" />} label="CPU temp" value={sysMetrics.tempCpu} postfix="°C" thresholds={[70, 85]} />
            <KpiTile icon={<Thermometer className="h-9 w-9 text-white" />} label="GPU temp" value={sysMetrics.tempGpu} postfix="°C" thresholds={[70, 85]} />
            <KpiTile icon={<Zap className="h-9 w-9 text-white" />} label="Power" value={sysMetrics.power} postfix=" W" />
          </div>
        </Box>

        {/* UPTIME — heartbeat history per host */}
        <Box id="block-uptime" title="Uptime" style={boxStyles}>
          <div className="mb-3 flex items-center gap-2">
            <div role="group" aria-label="Uptime window" className={toolbarSegmentClass}>
              {(["24h", "7d", "30d"] as UptimeWindow[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setUptimeWindow(w)}
                  className={cn(
                    toolbarSegmentButtonClass,
                    uptimeWindow === w
                      ? "bg-black text-white"
                      : "text-black/70 hover:bg-black/5",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="ml-auto text-[12px] text-black/50">
              {uptime?.sample_count != null
                ? `${uptime.sample_count.toLocaleString()} scrapes · victoriametrics`
                : "—"}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto,1fr]">
            <KpiTile
              icon={<Clock className="h-9 w-9 text-white" />}
              label="Online"
              value={uptime?.online_pct ?? null}
              postfix="%"
              decimals={1}
            />
            <UptimeHeatmap buckets={uptime?.buckets || []} window={uptimeWindow} />
          </div>
        </Box>

        {/* NETWORK — current rx/tx + 30 min sparkline */}
        <Box id="block-network" title="Network" style={boxStyles}>
          <div className="grid grid-cols-1 gap-x-2 gap-y-3 lg:grid-cols-[auto,auto,1fr]">
            <KpiTile
              icon={<ArrowDown className="h-9 w-9 text-white" />}
              label="RX Mbps"
              value={network?.rx_mbps ?? null}
              decimals={2}
            />
            <KpiTile
              icon={<ArrowUp className="h-9 w-9 text-white" />}
              label="TX Mbps"
              value={network?.tx_mbps ?? null}
              decimals={2}
            />
            <NetworkSparklines network={network} />
          </div>
        </Box>

        {/* ACTIVE ALARMS — between System and Cameras */}
        <Box id="block-alarms" title="Active alarms" style={boxStyles}>
          {(overview?.alarms.active || []).length === 0 ? (
            <div className="rounded-md border border-black/5 bg-white py-10 text-center">
              <p className="pp-neue-montreal text-base font-medium text-black/50">
                No active alarms.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(overview?.alarms.active || []).map((a) => {
                const isCritical = a.status === "CRITICAL";
                const accent = isCritical ? "#cc2d2d" : "#cc8a2d";
                return (
                  <li
                    key={a.name}
                    className="flex gap-3 rounded-md border border-black/5 bg-white px-4 py-3"
                  >
                    <div
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="pp-neue-montreal text-sm font-bold text-black">
                          {a.name}
                        </span>
                        <span
                          className="pp-neue-montreal rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ background: accent }}
                        >
                          {a.status}
                        </span>
                      </div>
                      {a.info && (
                        <p className="pp-neue-montreal mt-1 line-clamp-2 text-xs font-medium text-black/60">
                          {a.info}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Box>

        {/* PER-CAMERA ANALYTICS */}
        <Box id="block-cam-analytics" title="Camera analytics" style={boxStyles}>
          <div className="mb-5 flex items-center gap-2">
            <span className="text-sm text-black/60">
              Window: <span className="font-medium text-black">{timeRange.label}</span>
            </span>
            <span className="text-xs text-black/40">{describeRange(timeRange)}</span>
          </div>
          {cams.length === 0 ? (
            <div className="rounded-md border border-black/5 bg-white py-10 text-center">
              <p className="pp-neue-montreal text-base font-medium text-black/50">
                No analytics in this window for any camera on this target.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                cams.length > 1 && "md:grid-cols-2",
              )}
            >
              {cams.map((c) => (
                <CamCard key={c.camera_id} cam={c} />
              ))}
            </div>
          )}
        </Box>

        {/* MONGODB WRITES — host-scoped */}
        <Box id="block-mongo" title="MongoDB writes" style={boxStyles}>
          <div className="grid grid-cols-1 gap-x-2 gap-y-3 md:grid-cols-2">
            <KpiTile
              icon={<Database className="h-9 w-9 text-white" />}
              label="Inserts / sec"
              value={hostInsertsPerSec}
              decimals={2}
            />
            <KpiTile
              icon={<Database className="h-9 w-9 text-white" />}
              label="Inserts / min"
              value={hostInsertsPerMin}
              decimals={0}
            />
          </div>
          {writesHistory.length >= 2 && (
            <div className="mt-4 rounded-md border border-black/5 bg-white px-3 py-3">
              <Sparkline data={writesHistory} stroke="#316a53" />
            </div>
          )}
          <div className="mt-6">
            <h4
              className="eidra-sans mb-3 text-[18px] font-bold leading-[18px] text-black"
              style={{ textRendering: "geometricPrecision" }}
            >
              Per collection
              <span className="pp-neue-montreal ml-2 text-xs font-medium text-black/50">
                this host · last minute
              </span>
            </h4>
            {(mongo?.host_collections || []).length === 0 ? (
              <p className="text-sm text-black/60">No matching collections.</p>
            ) : (
              <ul className="divide-y divide-black/5 rounded-md border border-black/5 bg-white">
                {(mongo?.host_collections || []).map((c) => {
                  const idle = (c.last_60s ?? 0) === 0;
                  const ageLabel = formatRelativeAge(c.last_inserted);
                  return (
                    <li
                      key={c.name}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="pp-neue-montreal text-[15px] font-medium text-black">
                          {c.name}
                        </span>
                        {ageLabel && (
                          <span
                            className={`pp-neue-montreal text-[11px] ${
                              idle ? "text-orange-600" : "text-black/50"
                            }`}
                          >
                            last write {ageLabel}
                          </span>
                        )}
                      </div>
                      {c.error ? (
                        <span className="max-w-[200px] truncate text-xs text-red-600">{c.error}</span>
                      ) : (
                        <span className="pp-neue-montreal flex items-baseline gap-1 text-black">
                          <span className="text-[22px] font-bold leading-none tabular-nums">
                            {c.last_60s ?? 0}
                          </span>
                          <span className="text-xs font-medium text-black/50">/ min</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Box>
          </>
        ) : null}

        {/* LATEST ANALYTICS */}
        <Box id="block-latest-analytics" title="Latest analytics" style={boxStyles}>
          <div className="grid grid-cols-1 gap-x-2 gap-y-3 md:grid-cols-2">
            <KpiTile
              icon={<Activity className="h-9 w-9 text-white" />}
              label="Last minute"
              value={
                mongo?.host_collections.find((c) => c.name === "analytics")?.last_60s ?? null
              }
              postfix=" /min"
            />
            <KpiTile
              icon={<Activity className="h-9 w-9 text-white" />}
              label="History average"
              value={
                analyticsRateHistory.length
                  ? analyticsRateHistory.reduce((a, b) => a + b, 0) / analyticsRateHistory.length
                  : null
              }
              decimals={1}
              postfix=" /min"
            />
          </div>
          {analyticsRateHistory.length >= 2 && (
            <div className="mt-4 rounded-md border border-black/5 bg-white px-3 py-3">
              <Sparkline data={analyticsRateHistory} stroke="#316a53" />
            </div>
          )}
          <div className="mt-6">
            <h4
              className="eidra-sans mb-3 text-[18px] font-bold leading-[18px] text-black"
              style={{ textRendering: "geometricPrecision" }}
            >
              Latest documents
              <span className="pp-neue-montreal ml-2 text-xs font-medium text-black/50">
                last 20
              </span>
            </h4>
            {(analytics?.docs || []).length === 0 ? (
              <p className="text-sm text-black/60">No analytics for this host.</p>
            ) : (
              <ul className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
                {(analytics?.docs || []).map((d) => (
                  <li
                    key={d._id}
                    className="rounded-md border border-black/5 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="pp-neue-montreal max-w-[60%] truncate text-sm font-bold text-black">
                        {d.label || d.event || d.type || d.camera_id || "doc"}
                      </span>
                      <span className="pp-neue-montreal text-[11px] font-medium text-black/50">
                        {d._inserted_at
                          ? new Date(d._inserted_at).toLocaleTimeString("en-GB")
                          : ""}
                      </span>
                    </div>
                    <div className="pp-neue-montreal mt-0.5 truncate text-xs text-black/60">
                      {summarizeDoc(d)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Box>

        {/* SERVICES + CONTAINERS + OTHER */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Box id="block-services" title="Services" style={boxStyles}>
            <ServicesList services={sysMetrics.services} />
          </Box>
          <Box id="block-containers" title="Containers" style={boxStyles}>
            <ContainersList containers={sysMetrics.containers} />
          </Box>
          <Box id="block-other" title="Other" style={boxStyles}>
            <dl className="grid grid-cols-1 gap-3">
              <InfoRow label="Tailscale IP" value={overview?.tailscale.addresses?.[0] || "—"} />
              <InfoRow
                label="Swap"
                value={sysMetrics.swapPct != null ? `${sysMetrics.swapPct}%` : "—"}
              />
              <InfoRow
                label="RAM"
                value={
                  sysMetrics.ramUsedGb != null
                    ? `${sysMetrics.ramUsedGb} / ${sysMetrics.ramTotalGb} GB`
                    : "—"
                }
              />
              <InfoRow
                label="Device ts"
                value={sysMetrics.ts ? new Date(sysMetrics.ts).toLocaleTimeString("en-GB") : "—"}
              />
            </dl>
          </Box>
        </div>

          </>
        ) : (
          <BleCsiTab data={bleCsi} timeRange={timeRange} />
        )}

        <Footer src="/eidra-logo.svg" />
      </div>
    </div>
    </BoxCompactContext.Provider>
    </CompactContext.Provider>
  );
}

export default function HostDashboardClient({ host }: { host: string }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Inner host={host} />
    </QueryClientProvider>
  );
}

/* ============================================================
 * SUB-COMPONENTS — design-spark visual language
 * ============================================================ */

/**
 * Collapsible variant of Box that visually matches the regular Box (same
 * padding, same eidra-sans 36px title) but renders the title as a button
 * with a chevron, and persists the open/closed state per host+id in
 * localStorage so a hidden Cameras block stays hidden across reloads.
 */
function CollapsibleBox({
  id,
  title,
  defaultOpen = false,
  children,
  style,
  className,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const storageKey = `hostDashboard.collapsed.${id}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);
  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "open") setOpen(true);
      else if (v === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "open" : "closed");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div
      id={id}
      className={cn("relative overflow-hidden px-[28px] py-[40px]", className)}
      style={style}
    >
      <button
        type="button"
        onClick={toggle}
        className="group flex w-full items-center justify-between text-left"
        aria-expanded={open}
        aria-controls={`${id}-content`}
      >
        <div>
          <h3
            id={`${id}-title`}
            className="eidra-sans text-[36px] font-bold leading-[14px] tracking-tight text-black"
            style={{ textRendering: "geometricPrecision" }}
          >
            {title}
          </h3>
          <span
            aria-hidden
            className={cn(
              "mt-[18px] block h-[2px] rounded-full bg-black/80 transition-all duration-300",
              open ? "w-[44px]" : "w-[20px] bg-black/40 group-hover:w-[44px] group-hover:bg-black/80",
            )}
          />
        </div>
        <span className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-black transition-colors hover:bg-black/5">
          <ChevronDown
            className={cn("h-5 w-5 transition-transform duration-300", open && "rotate-180")}
          />
        </span>
      </button>
      <div
        id={`${id}-content`}
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
          open ? "mt-[34px] grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function Pill({
  tone,
  icon,
  label,
}: {
  tone: "good" | "bad" | "warn";
  icon: React.ReactNode;
  label: string;
}) {
  const dotColor = {
    good: "#10b981",
    bad: "#ef4444",
    warn: "#f59e0b",
  }[tone];
  return (
    <span
      className={toolbarPillClass}
      title={label}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColor }}
      />
      {icon}
      {label}
    </span>
  );
}

function DashboardTabs({
  active,
  onChange,
  showBleCsi = true,
}: {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  showBleCsi?: boolean;
}) {
  const tabs: { key: DashboardTab; label: string }[] = showBleCsi
    ? [
        { key: "vision", label: "Vision" },
        { key: "bleCsi", label: "BLE / CSI" },
      ]
    : [{ key: "vision", label: "Vision" }];
  return (
    <div
      role="tablist"
      aria-label="Dashboard section"
      className={toolbarSegmentClass}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            toolbarSegmentButtonClass,
            active === tab.key ? "bg-black text-white" : "text-black/70 hover:bg-black/5",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function BleCsiTab({
  data,
  timeRange,
}: {
  data: BleCsiResponse | undefined;
  timeRange: TimeRange;
}) {
  const compact = useCompact();
  const ble = data?.ble;
  const scanner = data?.scannerHealth;
  const reachQuality =
    ble && ble.uniquePayloadFingerprints > 0
      ? (100 * ble.qualityFilteredFingerprints) / ble.uniquePayloadFingerprints
      : null;
  const rotationResolved =
    scanner && scanner.totalMacs > 0
      ? (100 * scanner.macsCollapsed) / scanner.totalMacs
      : null;

  return (
    <>
      {!compact ? (
        <h1
          id="dashboard-ble-csi-title"
          className="eidra-sans mt-2 text-center font-bold tracking-tight text-black text-[60px] leading-[60px]"
          style={{ textRendering: "geometricPrecision" }}
        >
          BLE / CSI from {data?.host ?? "host"}
        </h1>
      ) : null}

      <Box id="block-ble-csi-kpis" style={boxStyles}>
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-black/60">
          <span>
            Window: <span className="font-medium text-black">{timeRange.label}</span>
          </span>
          <span className="text-xs text-black/40">{describeRange(timeRange)}</span>
          {data && (
            <span className="ml-auto text-xs text-black/40">
              device shards {data.collections.device.join(", ") || "none"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-x-2 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
          <KpiTile icon={<Activity className="h-9 w-9 text-white" />} label="Estimated audience" value={ble?.estimatedAudience ?? null} decimals={1} />
          <KpiTile icon={<Wifi className="h-9 w-9 text-white" />} label="Unique BLE devices" value={ble?.uniqueDeviceIds ?? null} />
          <KpiTile icon={<Database className="h-9 w-9 text-white" />} label="Quality fingerprints" value={ble?.qualityFilteredFingerprints ?? null} />
          <KpiTile icon={<Wifi className="h-9 w-9 text-white" />} label="Nearby phones" value={scanner?.nearbyPhones ?? null} />
          <KpiTile icon={<Activity className="h-9 w-9 text-white" />} label="Transient vehicles" value={scanner?.transientVehicles ?? null} />
          <KpiTile icon={<Wifi className="h-9 w-9 text-white" />} label="Avg RSSI" value={ble?.avgRssi ?? null} postfix=" dBm" decimals={1} />
        </div>
      </Box>

      <Box id="block-ble-csi-ooh" title="OOH quality" style={boxStyles}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title="Reach quality"
            value={reachQuality == null ? "—" : `${reachQuality.toFixed(0)}%`}
            detail={`${ble?.qualityFilteredFingerprints ?? 0} quality of ${ble?.uniquePayloadFingerprints ?? 0} fingerprints`}
          />
          <InsightCard
            title="MAC rotation resolved"
            value={rotationResolved == null ? "—" : `${rotationResolved.toFixed(0)}%`}
            detail={`${scanner?.macsCollapsed ?? 0} collapsed of ${scanner?.totalMacs ?? 0} raw MACs`}
          />
          <InsightCard
            title="Repeat / persistent"
            value={`${ble?.repeatFingerprints ?? 0} / ${ble?.persistentFingerprints ?? 0}`}
            detail="repeat observations / multi-day fingerprints"
          />
          <InsightCard
            title="Staff / fixture candidates"
            value={`${ble?.staffOrFixtureCandidates.length ?? 0}`}
            detail="suppressed from audience estimate"
          />
        </div>
      </Box>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Box id="block-ble-hourly" title="Hour activity" style={boxStyles}>
          <HourlyBars values={ble?.hourlyDistribution} />
        </Box>
        <Box id="block-ble-weekday" title="Weekday / hour heatmap" style={boxStyles}>
          <WeekdayHourHeatmap values={ble?.weekdayHourHeatmap} />
        </Box>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Box id="block-ble-rssi" title="RSSI distribution" style={boxStyles}>
          <DistributionBars values={ble?.rssiBuckets} />
        </Box>
        <Box id="block-ble-class" title="Device classes" style={boxStyles}>
          <DistributionBars values={ble?.deviceClassCounts} />
        </Box>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Box id="block-ble-companies" title="Top companies" style={boxStyles}>
          <TopList items={ble?.topCompanies || []} />
        </Box>
        <Box id="block-ble-manufacturers" title="Top manufacturers" style={boxStyles}>
          <TopList items={ble?.topManufacturers || []} />
        </Box>
        <Box id="block-ble-models" title="Top models" style={boxStyles}>
          <TopList
            items={ble?.topModels || []}
            emptyLabel="No model_name data in this window."
          />
        </Box>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Box id="block-ble-fingerprints" title="Top fingerprints" style={boxStyles}>
          <FingerprintList items={ble?.topFingerprints || []} />
        </Box>
        <Box id="block-ble-scanner-health" title="Scanner health" style={boxStyles}>
          <ScannerHealthPanel scanner={scanner} />
        </Box>
      </div>

      <Box id="block-csi" title="CSI" style={boxStyles}>
        <CsiPanel csi={data?.csi} />
      </Box>
    </>
  );
}

function InsightCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-black/5 bg-white px-5 py-5">
      <p className="pp-neue-montreal text-[13px] font-medium text-black/55">{title}</p>
      <p
        className="pp-neue-montreal mt-2 text-[42px] font-bold leading-[44px] text-black"
        style={{ textRendering: "geometricPrecision" }}
      >
        {value}
      </p>
      <p className="pp-neue-montreal mt-2 text-xs font-medium text-black/45">{detail}</p>
    </div>
  );
}

/**
 * VisualStatCard — number-forward card with a coloured accent bar and an
 * optional progress fill. Used by Visibility and Dual-camera grids so values
 * read at a glance without parsing rows of text.
 */
/**
 * VisualStatCard — matches the dashboard's MetricItem typography (eidra-sans
 * medium label + huge bold number) so Visibility / Dual-camera grids look
 * native to the rest of the dashboard. No borders, no accent strips, no
 * uppercase tracking — just the same type system every other Box uses.
 */
function VisualStatCard({
  title,
  number,
  postfix,
  decimals = 0,
  detail,
  caption,
}: {
  title: string;
  number: number | null | undefined;
  postfix?: string;
  decimals?: number;
  detail?: string;
  /** Optional secondary number displayed inline (e.g. peer total). */
  caption?: string;
  /** Kept for API compatibility — ignored visually. */
  progress?: number;
  tone?: "neutral" | "positive" | "warn" | "bad" | "accent";
  icon?: React.ReactNode;
}) {
  const displayValue =
    number != null && !isNaN(number) ? Number(number.toFixed(decimals)) : null;
  const compact = useCompact();
  return (
    <div className={cn("flex flex-col", compact ? "p-2" : "p-2")}>
      <h2
        className={cn(
          "eidra-sans whitespace-nowrap font-medium text-black",
          compact ? "text-[12px]" : "text-[15px]",
        )}
        style={{ textRendering: "geometricPrecision" }}
      >
        {title}
      </h2>
      <h1
        className={cn(
          "eidra-sans -ml-[2px] flex items-baseline font-bold tabular-nums text-black",
          compact ? "text-[22px] leading-[24px]" : "text-[57px] leading-[60px]",
        )}
        style={{ textRendering: "geometricPrecision" }}
      >
        {displayValue == null ? (
          <span className="text-black/30">—</span>
        ) : (
          <SlidingNumber
            animateOnLoad={false}
            decimalPlaces={decimals}
            number={displayValue}
            decimalSeparator=","
            postfix={postfix}
          />
        )}
        {caption ? (
          <span
            className={cn(
              "eidra-sans ml-1.5 font-medium text-black/35",
              compact ? "text-[10px]" : "text-[14px]",
            )}
          >
            {caption}
          </span>
        ) : null}
      </h1>
      {detail && !compact ? (
        <p className="pp-neue-montreal mt-1 text-[12px] font-medium text-black/50">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function TagScopePanel({
  target,
}: {
  target?: AnalyticsSummary["target"];
}) {
  if (!target || target.kind !== "tag") {
    return <EmptyPanel label="Waiting for Tailscale tag metadata." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto,auto]">
      <div className="rounded-md border border-black/5 bg-white px-5 py-5">
        <p className="pp-neue-montreal text-[13px] font-medium text-black/55">
          Aggregating analytics for
        </p>
        <p
          className="pp-neue-montreal mt-2 text-[42px] font-bold leading-[44px] text-black"
          style={{ textRendering: "geometricPrecision" }}
        >
          {target.label}
        </p>
        <p className="pp-neue-montreal mt-2 text-xs font-medium text-black/45">
          Tailscale tag target · host-specific cameras, uptime and network panels are hidden.
        </p>
      </div>
      <InsightCard
        title="Hosts"
        value={formatMetricNumber(target.host_count ?? target.hosts.length)}
        detail={target.hosts.slice(0, 4).join(", ") || "No hosts resolved"}
      />
      <InsightCard
        title="Online hosts"
        value={formatMetricNumber(target.online_count ?? target.online_hosts?.length ?? 0)}
        detail="Current Tailscale status"
      />
    </div>
  );
}

function AnalyticsTrendPanel({
  points,
  stroke,
  emptyLabel,
  valueLabel,
}: {
  points: AnalyticsTrendPoint[];
  stroke: string;
  emptyLabel: string;
  valueLabel: string;
}) {
  if (points.length < 2) return <EmptyPanel label={emptyLabel} />;

  const values = points.map((point) => point.currentValue ?? 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...values, 0);
  const latest = values[values.length - 1] ?? 0;

  return (
    <div className="rounded-md border border-black/5 bg-white px-5 py-5">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <MiniStat label={`Latest ${valueLabel}`} value={formatMetricNumber(latest)} />
        <MiniStat label="Total" value={formatMetricNumber(total)} />
        <MiniStat label="Peak" value={formatMetricNumber(peak)} />
      </div>
      <Sparkline data={values} stroke={stroke} />
      <div className="mt-2 flex justify-between text-[11px] font-medium text-black/35">
        <span>{formatTrendTime(points[0]?.ts)}</span>
        <span>{formatTrendTime(points[points.length - 1]?.ts)}</span>
      </div>
    </div>
  );
}

function DualCameraInsightPanel({ insight }: { insight?: DualCameraInsight }) {
  if (!insight) {
    return <EmptyPanel label="Dual-camera insight is not available for this window." />;
  }
  if (!insight.available) {
    return <EmptyPanel label={insight.reason ?? "Need at least two camera angles with contacts."} />;
  }

  const timeline = insight.timeline ?? [];
  const confirmedReach = timeline.map((point) => point.confirmed_reach ?? 0);
  const cameras = [...(insight.cameras ?? [])].sort(
    (a, b) => b.total_detections - a.total_detections,
  );

  const confidence = insight.confidence_score ?? 0;
  const confidenceTone: "positive" | "warn" | "bad" =
    confidence >= 75 ? "positive" : confidence >= 45 ? "warn" : "bad";
  const angleAgreement = insight.angle_agreement_pct ?? 0;
  const synced = insight.synced_bucket_pct ?? 0;
  const rawSum = insight.raw_camera_unique_sum ?? 0;
  const dedupePct = rawSum > 0 ? ((insight.double_count_prevented ?? 0) / rawSum) * 100 : 0;
  const maxCamDetections = Math.max(1, ...cameras.map((c) => c.total_detections));
  const maxCamRac = Math.max(1, ...cameras.map((c) => c.rac));
  const maxCamUnique = Math.max(1, ...cameras.map((c) => c.unique_persons));

  const compact = useCompact();
  return (
    <div className={compact ? "space-y-3" : "space-y-8"}>
      {/* Headline KPIs — same MetricItem-style typography as the rest of the
          dashboard. No borders, no colored strips. */}
      <div
        className={cn(
          "grid",
          compact
            ? "grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4"
            : "grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        <VisualStatCard
          title="Audience confidence"
          number={confidence}
          postfix="%"
          decimals={1}
          detail="Overlap, detection balance, RAC balance"
        />
        <VisualStatCard
          title="Angle agreement"
          number={angleAgreement}
          postfix="%"
          decimals={1}
          detail={`${formatMetricNumber(insight.confirmed_by_multiple_angles ?? 0)} confirmed by multiple angles`}
        />
        <VisualStatCard
          title="Double-count prevented"
          number={insight.double_count_prevented ?? 0}
          caption={rawSum ? `/ ${formatMetricNumber(rawSum)}` : undefined}
          detail="Raw camera contacts deduplicated"
        />
        <VisualStatCard
          title="Synced activity"
          number={synced}
          postfix="%"
          decimals={1}
          detail={`${formatMetricNumber(insight.synced_bucket_count ?? 0)} / ${formatMetricNumber(insight.active_bucket_count ?? 0)} active buckets`}
        />
      </div>

      {/* Per-camera breakdown */}
      <div>
        <SubSectionHeader
          title="Per-camera"
          meta={`${formatMetricNumber(insight.camera_count)} cams · deduped ${formatMetricNumber(insight.deduped_audience ?? 0)} · single-angle ${formatMetricNumber(insight.single_angle_only ?? 0)}`}
          compact={compact}
        />
        <div className={compact ? "mt-2 space-y-2" : "mt-4 space-y-4"}>
          {cameras.map((camera) => (
            <div
              key={camera.camera_id}
              className={cn("border-t border-black/[0.06] pt-2", compact ? "pt-2" : "pt-4")}
            >
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "eidra-sans font-bold tracking-tight text-black",
                    compact ? "text-[13px]" : "text-[18px]",
                  )}
                  style={{ textRendering: "geometricPrecision" }}
                >
                  {camera.camera_id}
                </span>
                <span className="pp-neue-montreal text-[12px] font-medium tabular-nums text-black/50">
                  {formatMetricNumber(camera.looked_pct, 1)}% looked at screen
                </span>
              </div>
              <div className={cn("grid grid-cols-3", compact ? "gap-3" : "gap-6")}>
                <CameraBar label="Detections" value={camera.total_detections} max={maxCamDetections} color="#316a53" />
                <CameraBar label="RAC" value={camera.rac} max={maxCamRac} color="#DA7C60" />
                <CameraBar label="Unique" value={camera.unique_persons} max={maxCamUnique} color="#63A8A5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best angles */}
      <div>
        <SubSectionHeader title="Best angles" compact={compact} />
        <div
          className={cn(
            "grid",
            compact ? "mt-2 grid-cols-3 gap-x-4" : "mt-4 grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-3",
          )}
        >
          <AngleAward label="Detection" camera={insight.best_detection_camera} metric="total_detections" />
          <AngleAward label="Attention" camera={insight.best_attention_camera} metric="rac" />
          <AngleAward label="Demographics" camera={insight.best_demographics_camera} metric="demographics_count" />
        </div>
        {confirmedReach.length >= 2 ? (
          <div className={compact ? "mt-3" : "mt-6"}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="pp-neue-montreal text-[12px] font-medium text-black/50">
                Confirmed reach over time
              </span>
              <span className="pp-neue-montreal text-[12px] font-medium tabular-nums text-black/50">
                peak {formatMetricNumber(Math.max(...confirmedReach, 0))}
              </span>
            </div>
            <Sparkline data={confirmedReach} stroke="#316a53" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Inline subsection header inside a Box — uses the same eidra-sans bold
 *  family as the box title, just smaller, with an underline accent that
 *  mirrors the Box title underline so subsections feel native. */
function SubSectionHeader({
  title,
  meta,
  compact,
}: {
  title: string;
  meta?: string;
  compact: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h4
          className={cn(
            "eidra-sans font-bold tracking-tight text-black",
            compact ? "text-[14px] leading-[14px]" : "text-[20px] leading-[20px]",
          )}
          style={{ textRendering: "geometricPrecision" }}
        >
          {title}
        </h4>
        <span
          aria-hidden
          className={cn(
            "mt-2 block h-[2px] rounded-full bg-black/80",
            compact ? "w-[24px]" : "w-[32px]",
          )}
        />
      </div>
      {meta ? (
        <span className="pp-neue-montreal text-[12px] font-medium tabular-nums text-black/50">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

function CameraBar({
  label,
  value,
  max,
  color = "#316a53",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const compact = useCompact();
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "eidra-sans font-medium text-black",
            compact ? "text-[11px]" : "text-[13px]",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "eidra-sans font-bold tabular-nums tracking-tight",
            compact ? "text-[15px]" : "text-[22px]",
          )}
          style={{ textRendering: "geometricPrecision", color }}
        >
          <SlidingNumber animateOnLoad={false} number={value} decimalSeparator="," />
        </span>
      </div>
      <div className={cn("mt-1 w-full overflow-hidden rounded-full bg-black/[0.06]", compact ? "h-1" : "h-1.5")}>
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function AngleAward({
  label,
  camera,
  metric,
}: {
  label: string;
  camera?: DualCameraSummary | null;
  metric: keyof Pick<DualCameraSummary, "total_detections" | "rac" | "demographics_count">;
}) {
  const compact = useCompact();
  return (
    <div className="flex flex-col p-2">
      <h2
        className={cn(
          "eidra-sans whitespace-nowrap font-medium text-black",
          compact ? "text-[12px]" : "text-[15px]",
        )}
        style={{ textRendering: "geometricPrecision" }}
      >
        Best {label}
      </h2>
      <h1
        className={cn(
          "eidra-sans -ml-[2px] flex items-baseline font-bold tabular-nums text-black",
          compact ? "text-[22px] leading-[24px]" : "text-[57px] leading-[60px]",
        )}
        style={{ textRendering: "geometricPrecision" }}
      >
        <SlidingNumber animateOnLoad={false} number={camera?.[metric] ?? 0} decimalSeparator="," />
      </h1>
      {!compact ? (
        <p className="pp-neue-montreal mt-1 truncate text-[12px] font-medium text-black/50">
          {camera?.camera_id ?? "—"}
        </p>
      ) : null}
    </div>
  );
}

function DualCameraKpiCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-black/5 bg-white px-5 py-5">
      <p className="pp-neue-montreal text-[13px] font-medium text-black/55">{title}</p>
      <p
        className="pp-neue-montreal mt-2 text-[42px] font-bold leading-[44px] text-black"
        style={{ textRendering: "geometricPrecision" }}
      >
        {value}
      </p>
      <p className="pp-neue-montreal mt-2 truncate font-mono text-xs font-medium text-black/45">
        {detail}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="pp-neue-montreal text-[11px] font-medium uppercase tracking-[0.12em] text-black/35">
        {label}
      </p>
      <p className="pp-neue-montreal mt-1 text-xl font-bold text-black">{value}</p>
    </div>
  );
}

function formatMetricNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
  });
}

function formatTrendTime(ts: number | undefined) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTagId(tag: string) {
  const value = tag.trim().toLowerCase();
  if (!value) return "";
  return value.startsWith("tag:") ? value : `tag:${value}`;
}

function formatTagLabel(tag: string) {
  return normalizeTagId(tag)
    .replace(/^tag:/, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function HourlyBars({ values }: { values: Record<string, number> | undefined }) {
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}`);
  const max = Math.max(...hours.map((h) => values?.[h] ?? 0), 1);
  if (!values) return <EmptyPanel label="No BLE data loaded for this window." />;
  return (
    <div className="flex h-[180px] items-end gap-1 rounded-md border border-black/5 bg-white px-3 py-3">
      {hours.map((hour) => {
        const count = values[hour] ?? 0;
        return (
          <div key={hour} className="flex flex-1 flex-col items-center gap-1">
            <div
              title={`${hour}:00 · ${count.toLocaleString()} docs`}
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(2, (count / max) * 130)}px`,
                background: "linear-gradient(180deg, #63A8A5 0%, #DA7C60 100%)",
                opacity: count > 0 ? 1 : 0.18,
              }}
            />
            <span className="text-[9px] text-black/35">{Number(hour) % 6 === 0 ? hour : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function WeekdayHourHeatmap({ values }: { values: Record<string, number> | undefined }) {
  if (!values) return <EmptyPanel label="No BLE data loaded for this window." />;
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...Object.values(values), 1);
  return (
    <div className="rounded-md border border-black/5 bg-white p-3">
      <div className="grid grid-cols-[42px,1fr] gap-2">
        {weekdays.map((day, dayIndex) => (
          <div key={day} className="contents">
            <span className="text-[11px] font-medium text-black/45">{day}</span>
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]">
              {Array.from({ length: 24 }, (_, hour) => {
                const key = `${dayIndex}-${hour.toString().padStart(2, "0")}`;
                const count = values[key] ?? 0;
                const opacity = count > 0 ? 0.15 + 0.85 * (count / max) : 0.08;
                return (
                  <div
                    key={key}
                    title={`${day} ${hour.toString().padStart(2, "0")}:00 · ${count.toLocaleString()} docs`}
                    className="h-4 rounded-[2px]"
                    style={{ background: "#316a53", opacity }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between pl-[50px] text-[10px] text-black/35">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

function DistributionBars({ values }: { values: Record<string, number> | undefined }) {
  const entries = Object.entries(values || {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return <EmptyPanel label="No distribution data in this window." />;
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return (
    <div className="space-y-2 rounded-md border border-black/5 bg-white p-4">
      {entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => {
          const pct = total > 0 ? (100 * count) / total : 0;
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-black">{label}</span>
                <span className="font-medium text-black/45">{count.toLocaleString()} · {pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-[#316a53]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function TopList({
  items,
  emptyLabel = "No values in this window.",
}: {
  items: CountShareItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) return <EmptyPanel label={emptyLabel} />;
  return (
    <ul className="divide-y divide-black/5 rounded-md border border-black/5 bg-white">
      {items.slice(0, 8).map((item) => (
        <li key={item.value} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="truncate text-sm font-medium text-black">{item.value}</span>
          <span className="text-sm font-bold text-black tabular-nums">{item.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function FingerprintList({ items }: { items: BleCsiTopFingerprint[] }) {
  if (items.length === 0) return <EmptyPanel label="No fingerprints in this window." />;
  return (
    <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
      {items.map((item) => (
        <li key={item.fingerprint} className="rounded-md border border-black/5 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-xs font-bold text-black">{item.fingerprint}</span>
            <span className="text-sm font-bold text-black tabular-nums">{item.rawDocs}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-black/45">
            <span>scan sum {item.scanCountSum.toLocaleString()} · {item.activeDays} active days</span>
            <span>{item.latestSeen ? new Date(item.latestSeen).toLocaleString("en-GB") : "—"}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ScannerHealthPanel({ scanner }: { scanner: BleCsiResponse["scannerHealth"] | undefined }) {
  const history = scanner?.history || [];
  const uniqueHistory = history.map((p) => p.uniqueDevices);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <CamKpi label="Unique devices" value={scanner?.uniqueDevices ?? null} />
        <CamKpi label="Total MACs" value={scanner?.totalMacs ?? null} />
        <CamKpi label="MACs collapsed" value={scanner?.macsCollapsed ?? null} />
        <CamKpi label="Nearby phones" value={scanner?.nearbyPhones ?? null} />
      </div>
      {uniqueHistory.length >= 2 ? (
        <div className="rounded-md border border-black/5 bg-white px-3 py-3">
          <Sparkline data={uniqueHistory} stroke="#316a53" />
          <div className="mt-1 text-xs text-black/45">scanner snapshots · unique devices</div>
        </div>
      ) : (
        <EmptyPanel label="No scanner history snapshots in this window." />
      )}
      <InfoRow
        label="Latest heartbeat"
        value={scanner?.latestSeen ? new Date(scanner.latestSeen * 1000).toLocaleString("en-GB") : "—"}
      />
    </div>
  );
}

function CsiPanel({ csi }: { csi: BleCsiResponse["csi"] | undefined }) {
  if (!csi?.available) {
    return <EmptyPanel label="No CSI data for this host in this window." />;
  }
  const motion = csi.hourlyMotion.map((p) => p.motionScore);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto,1fr]">
      <div className="grid grid-cols-1 gap-3">
        <CamKpi label="CSI docs" value={csi.docCount} />
        <InfoRow
          label="Latest CSI"
          value={csi.latestSeen ? new Date(csi.latestSeen * 1000).toLocaleString("en-GB") : "—"}
        />
      </div>
      <div className="rounded-md border border-black/5 bg-white px-4 py-4">
        {motion.length >= 2 ? (
          <>
            <Sparkline data={motion} stroke="#DA7C60" />
            <div className="mt-2 text-xs text-black/45">hourly motion score</div>
          </>
        ) : (
          <EmptyPanel label="CSI data exists, but not enough hourly points for a sparkline." />
        )}
      </div>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-[92px] items-center justify-center rounded-md border border-black/5 bg-white px-4 py-6 text-center text-[13px] font-medium text-black/45">
      {label}
    </div>
  );
}

function UptimeHeatmap({
  buckets,
  window,
}: {
  buckets: UptimeBucket[];
  window: UptimeWindow;
}) {
  if (buckets.length === 0) {
    return (
      <div className="flex h-[90px] items-center justify-center rounded-md border border-black/5 bg-white text-[13px] text-black/40">
        No metrics in VictoriaMetrics for this host.
      </div>
    );
  }
  const colorFor = (b: UptimeBucket) => {
    if (b.total === 0 || b.pct == null) return "#E8E5DF";
    if (b.pct >= 99) return "#1f8a4a";
    if (b.pct >= 90) return "#3aa269";
    if (b.pct >= 75) return "#cc8a2d";
    if (b.pct >= 25) return "#cc4f2d";
    return "#cc2d2d";
  };
  const fmtLabel = (ts: number) => {
    const d = new Date(ts * 1000);
    if (window === "24h") {
      return `${d.getHours().toString().padStart(2, "0")}:00`;
    }
    if (window === "7d") {
      return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${d.getHours().toString().padStart(2, "0")}h`;
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex h-[64px] items-stretch gap-[2px]">
        {buckets.map((b, i) => (
          <div
            key={i}
            title={`${fmtLabel(b.ts)} — ${b.pct == null ? "no data" : `${b.pct}% (${b.online}/${b.total})`}`}
            className="flex-1 rounded-[3px] transition-opacity hover:opacity-80"
            style={{ background: colorFor(b) }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-black/40">
        <span>{buckets[0] ? fmtLabel(buckets[0].ts) : ""}</span>
        <span>{buckets[buckets.length - 1] ? fmtLabel(buckets[buckets.length - 1].ts) : ""}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-black/50">
        <LegendDot color="#1f8a4a" label="≥99%" />
        <LegendDot color="#3aa269" label="≥90%" />
        <LegendDot color="#cc8a2d" label="≥75%" />
        <LegendDot color="#cc4f2d" label="≥25%" />
        <LegendDot color="#cc2d2d" label="<25%" />
        <LegendDot color="#E8E5DF" label="no data" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

function NetworkSparklines({ network }: { network: NetworkResponse | undefined }) {
  const rx = network?.rx_history ?? [];
  const tx = network?.tx_history ?? [];
  const empty = rx.length === 0 && tx.length === 0;
  if (empty) {
    return (
      <div className="flex items-center justify-center rounded-md border border-black/5 bg-white p-4 text-[13px] text-black/40">
        No network data yet.
      </div>
    );
  }
  const rxVals = rx.map((p) => p.mbps);
  const txVals = tx.map((p) => p.mbps);
  return (
    <div className="flex flex-col gap-3 rounded-md border border-black/5 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="pp-neue-montreal text-[13px] font-medium text-black">
          Last 30 minutes
        </span>
        <span className="pp-neue-montreal text-[11px] text-black/45">
          {network?.source === "victoriametrics" ? "victoriametrics · 30s step" : ""}
        </span>
      </div>
      <NetworkSparklineRow
        label="RX"
        color="#316a53"
        values={rxVals}
        peak={network?.rx_peak_30m}
        avg={network?.rx_avg_30m}
      />
      <NetworkSparklineRow
        label="TX"
        color="#DA7C60"
        values={txVals}
        peak={network?.tx_peak_30m}
        avg={network?.tx_avg_30m}
      />
    </div>
  );
}

function NetworkSparklineRow({
  label,
  color,
  values,
  peak,
  avg,
}: {
  label: string;
  color: string;
  values: number[];
  peak: number | null | undefined;
  avg: number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="pp-neue-montreal w-7 text-[12px] font-semibold uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <Sparkline data={values.length ? values : [0, 0]} stroke={color} />
      </div>
      <span className="pp-neue-montreal whitespace-nowrap text-[11px] text-black/55 tabular-nums">
        avg {avg != null ? avg.toFixed(2) : "—"} · peak {peak != null ? peak.toFixed(2) : "—"} Mbps
      </span>
    </div>
  );
}

/** Mirrors MetricItem visual: gradient circle + label + big number. */
function KpiTile({
  icon,
  label,
  value,
  postfix,
  decimals = 0,
  thresholds,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  postfix?: string;
  decimals?: number;
  thresholds?: [warn: number, crit: number];
}) {
  let color = "#000000";
  let tileBg = "linear-gradient(135deg, #63A8A5 0%, #DA7C60 100%)";
  if (thresholds && value != null) {
    if (value >= thresholds[1]) {
      color = "#b91c1c";
      tileBg = "linear-gradient(135deg, #DA7C60 0%, #b91c1c 100%)";
    } else if (value >= thresholds[0]) {
      color = "#b45309";
      tileBg = "linear-gradient(135deg, #DA7C60 0%, #b45309 100%)";
    }
  }
  const displayValue =
    value != null && !isNaN(value)
      ? Number(value.toFixed(decimals))
      : null;
  return (
    <div className="flex flex-row p-2">
      <div
        className="flex h-[90px] w-[90px] flex-shrink-0 items-center justify-center rounded-md transition-colors"
        style={{ background: tileBg }}
      >
        {icon}
      </div>
      <div className="pl-3 text-black">
        <h2 className="eidra-sans whitespace-nowrap text-[15px] font-medium text-black" style={{ textRendering: "geometricPrecision" }}>{label}</h2>
        <h1
          className="eidra-sans -ml-[2px] flex items-baseline text-[57px] font-bold leading-[60px] tabular-nums"
          style={{ textRendering: "geometricPrecision", color }}
        >
          {displayValue == null ? (
            <span className="text-black/30">—</span>
          ) : (
            <SlidingNumber
              animateOnLoad={false}
              decimalPlaces={decimals}
              number={displayValue}
              decimalSeparator=","
              postfix={postfix}
            />
          )}
        </h1>
      </div>
    </div>
  );
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const w = 600;
  const h = 60;
  if (data.length < 2) return null;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const dx = w / (data.length - 1);
  const norm = (v: number) => h - ((v - min) / (max - min || 1)) * h;
  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"} ${i * dx} ${norm(v)}`).join(" ");
  const fillPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[60px] w-full">
      <path d={fillPath} fill={stroke} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

/**
 * Renders one MJPEG tile per supported camera port (5000, 5001).
 * Each tile reports its load/error state via `onStatusChange`. When BOTH
 * tiles fail (single-camera hosts also typically have one of the two), the
 * other still renders its broken state — but layout collapses to a single
 * column when only one tile actually loads, so single-cam hosts don't waste
 * half the row on a dead box.
 */
function CamerasGrid({
  host,
  tick,
  paused,
}: {
  host: string;
  tick: number;
  paused: boolean;
}) {
  const [status, setStatus] = useState<Record<number, "loading" | "ok" | "down">>(
    { 5000: "loading", 5001: "loading" },
  );

  useEffect(() => {
    setStatus({ 5000: "loading", 5001: "loading" });
  }, [host]);

  const updateStatus = (port: number, s: "ok" | "down") =>
    setStatus((prev) => (prev[port] === s ? prev : { ...prev, [port]: s }));

  const ports = [5000, 5001];
  const visiblePorts = ports.filter((p) => status[p] !== "down");
  const allDown = ports.every((p) => status[p] === "down");

  if (allDown) {
    return (
      <div className="rounded-md border border-black/5 bg-white py-10 text-center">
        <p className="pp-neue-montreal text-base font-medium text-black/50">
          No camera streams available for this host.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        visiblePorts.length > 1 && "md:grid-cols-2",
      )}
    >
      {visiblePorts.map((port) => (
        <CameraTile
          key={port}
          host={host}
          port={port}
          tick={tick}
          paused={paused}
          onStatusChange={(s) => updateStatus(port, s)}
        />
      ))}
    </div>
  );
}

/** Live MJPEG with KB / bitrate / timestamp overlay — same look idea, white-card framing. */
function CameraTile({
  host,
  port,
  tick,
  paused,
  onStatusChange,
}: {
  host: string;
  port: number;
  tick: number;
  paused: boolean;
  onStatusChange?: (status: "ok" | "down") => void;
}) {
  const [size, setSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [bitrateKbps, setBitrateKbps] = useState<number | null>(null);
  const lastSize = useRef<{ ts: number; size: number } | null>(null);
  const src = `${API}/host-overview/${host}/cam-live?port=${port}&_=${tick}`;

  return (
    <div className="overflow-hidden rounded-md border border-black/5">
      <div className="relative aspect-video bg-black">
        {!paused ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Camera ${port}`}
            className="h-full w-full object-cover"
            onLoad={async () => {
              setError(null);
              setUpdatedAt(Date.now());
              onStatusChange?.("ok");
              try {
                const head = await fetch(src).catch(() => null);
                const sz = head?.headers.get("X-Size-KB") || head?.headers.get("x-size-kb");
                if (sz) {
                  const kb = Number(sz);
                  setSize(kb);
                  const now = Date.now();
                  if (lastSize.current) {
                    const dt = (now - lastSize.current.ts) / 1000;
                    if (dt > 0.3 && dt < 10) setBitrateKbps(Math.round((kb * 8) / dt));
                  }
                  lastSize.current = { ts: now, size: kb };
                }
              } catch {
                /* ignore */
              }
            }}
            onError={() => {
              setError("stream down");
              onStatusChange?.("down");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <Pause className="h-8 w-8" />
          </div>
        )}
        <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-white">
          cam{port - 5000} · :{port}
        </div>
        {error ? (
          <div className="absolute right-2 top-2 rounded bg-red-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            stream down
          </div>
        ) : (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-emerald-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-2 font-mono text-[11px] text-white">
          <Camera className="h-3.5 w-3.5" />
          {size != null && <span>{size} KB</span>}
          {bitrateKbps != null && <span>~{(bitrateKbps / 1000).toFixed(1)} Mb/s</span>}
          <span className="ml-auto">
            {updatedAt ? new Date(updatedAt).toLocaleTimeString("en-GB") : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract a short display label from a camera_id.
 * Examples:
 *   "cam_5000-aspace-prod-53" → "cam_5000"
 *   "aspace-prod-6"           → "aspace-prod-6"
 *   "cam_5001"                → "cam_5001"
 */
function TimeRangePicker({
  ranges,
  activeKey,
  onChange,
}: {
  ranges: Record<TimeRangeKey, TimeRange>;
  activeKey: TimeRangeKey;
  onChange: (key: TimeRangeKey) => void;
}) {
  const order: TimeRangeKey[] = ["1h", "today", "yesterday", "7d"];
  const activeRange = ranges[activeKey];
  return (
    <div
      role="group"
      aria-label="Time range"
      title={describeRange(activeRange)}
      className={toolbarSegmentClass}
    >
      {order.map((k) => {
        const r = ranges[k];
        const active = k === activeKey;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            title={describeRange(r)}
            className={cn(
              toolbarSegmentButtonClass,
              active
                ? "bg-black text-white"
                : "text-black/70 hover:bg-black/5",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/** Human-readable date span for the active range (used in tooltips + meta). */
function describeRange(r: TimeRange): string {
  const fmt = (epoch: number) =>
    new Date(epoch * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const startStr = fmt(r.start);
  const endStr = r.end != null ? fmt(r.end) : "now";
  return `${startStr} → ${endStr}`;
}

function camLabel(cameraId: string): string {
  const m = cameraId.match(/^(cam_\d+)/);
  return m ? m[1] : cameraId;
}

/** Compact "X ago" label. Returns null for missing/invalid input. */
function formatRelativeAge(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
}

function CamCard({ cam }: { cam: CamSummary }) {
  const label = camLabel(cam.camera_id);
  const malePct = cam.unique_persons
    ? Math.round((100 * cam.males) / cam.unique_persons)
    : 0;
  const femalePct = cam.unique_persons
    ? Math.round((100 * cam.females) / cam.unique_persons)
    : 0;

  return (
    <div className="rounded-md border border-black/5 bg-white px-6 py-7">
      <div className="mb-5 flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, #63A8A5 0%, #DA7C60 100%)" }}
        >
          <Camera className="h-5 w-5 text-white" />
        </div>
        <span
          className="eidra-sans text-[20px] font-bold text-black"
          style={{ textRendering: "geometricPrecision" }}
        >
          {label}
        </span>
        <span className="pp-neue-montreal ml-auto truncate text-xs font-medium text-black/50">
          {cam.camera_id}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-x-2 gap-y-3 md:grid-cols-3">
        <CamKpi
          label="Unique people"
          value={cam.unique_persons}
          decimals={0}
        />
        <CamKpi
          label="Avg age"
          value={cam.avg_age}
          decimals={1}
        />
        <CamKpi
          label="Looked at cam"
          value={cam.looked_pct}
          postfix="%"
          decimals={0}
        />
      </div>

      <div className="space-y-2">
        <div className="pp-neue-montreal flex items-center justify-between text-sm font-medium">
          <span style={{ color: "#316a53" }}>
            Male {cam.males} ({malePct}%)
          </span>
          <span style={{ color: "#DA7C60" }}>
            Female {cam.females} ({femalePct}%)
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-black/5">
          <div style={{ width: `${malePct}%`, background: "#316a53" }} />
          <div style={{ width: `${femalePct}%`, background: "#DA7C60" }} />
          {cam.unknown_gender > 0 && (
            <div
              style={{
                width: `${100 - malePct - femalePct}%`,
                background: "#00000020",
              }}
            />
          )}
        </div>
        {cam.unknown_gender > 0 && (
          <div className="pp-neue-montreal text-xs font-medium text-black/50">
            Unknown: {cam.unknown_gender}
          </div>
        )}
      </div>

      {(cam.min_age != null || cam.max_age != null || cam.last_seen) && (
        <div className="pp-neue-montreal mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-xs font-medium text-black/50">
          <span>
            Age range: {cam.min_age?.toFixed(0) ?? "—"} – {cam.max_age?.toFixed(0) ?? "—"}
          </span>
          {cam.last_seen && (
            <span>Latest: {new Date(cam.last_seen).toLocaleTimeString("en-GB")}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact NextM-style KPI used inside a beige cam card. White surface + big number. */
function CamKpi({
  label,
  value,
  postfix,
  decimals = 0,
}: {
  label: string;
  value: number | null | undefined;
  postfix?: string;
  decimals?: number;
}) {
  const display =
    value != null && !isNaN(value) ? Number(value.toFixed(decimals)) : null;
  return (
    <div className="rounded-md border border-black/5 px-4 py-3">
      <h3 className="pp-neue-montreal text-[13px] font-medium text-black">{label}</h3>
      <div
        className="pp-neue-montreal mt-1 text-[40px] font-bold leading-[42px] tabular-nums text-black"
        style={{ textRendering: "geometricPrecision" }}
      >
        {display == null ? (
          "—"
        ) : (
          <SlidingNumber
            animateOnLoad={false}
            decimalPlaces={decimals}
            number={display}
            decimalSeparator=","
            postfix={postfix}
          />
        )}
      </div>
    </div>
  );
}

function ServicesList({ services }: { services: Record<string, string> }) {
  const entries = Object.entries(services);
  if (entries.length === 0) return <p className="text-sm text-black/60">No data.</p>;
  return (
    <ul className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
      {entries.map(([name, status]) => {
        const tone =
          status === "active"
            ? { bg: "#316a53", color: "#FFFFFF" }
            : status === "inactive"
              ? { bg: "#00000010", color: "#00000080" }
              : { bg: "#cc2d2d", color: "#FFFFFF" };
        return (
          <li
            key={name}
            className="flex items-center justify-between rounded-md border border-black/5 bg-white px-3 py-2"
          >
            <span className="pp-neue-montreal truncate text-sm font-medium text-black">
              {name}
            </span>
            <span
              className="pp-neue-montreal rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: tone.bg, color: tone.color }}
            >
              {status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ContainersList({
  containers,
}: {
  containers: { name: string; status: string }[];
}) {
  if (containers.length === 0) return <p className="text-sm text-black/60">No containers.</p>;
  return (
    <ul className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
      {containers.map((c) => {
        const healthy = /healthy|Up/.test(c.status) && !/unhealthy|Exited/.test(c.status);
        return (
          <li key={c.name} className="rounded-md border border-black/5 bg-white px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="pp-neue-montreal truncate text-sm font-bold text-black">
                {c.name}
              </span>
              <span
                className="pp-neue-montreal rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: healthy ? "#316a53" : "#cc2d2d",
                  color: "#FFFFFF",
                }}
              >
                {healthy ? "OK" : "Bad"}
              </span>
            </div>
            <div className="pp-neue-montreal mt-0.5 truncate text-xs font-medium text-black/50">
              {c.status}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2.5">
      <dt className="pp-neue-montreal text-[13px] font-medium text-black/60">{label}</dt>
      <dd className="pp-neue-montreal text-sm font-bold text-black">{value}</dd>
    </div>
  );
}

function summarizeDoc(d: AnalyticsDoc): string {
  const parts: string[] = [];
  if (d.camera_id && !d.label?.includes(d.camera_id)) parts.push(d.camera_id);
  if (d.confidence != null) parts.push(`conf=${Number(d.confidence).toFixed(2)}`);
  if (d.count != null) parts.push(`n=${d.count}`);
  if (Array.isArray(d.detections)) parts.push(`${d.detections.length} dets`);
  if (Array.isArray(d.tracks)) parts.push(`${d.tracks.length} tracks`);
  if (d.fps != null) parts.push(`${d.fps} fps`);
  if (parts.length === 0) {
    const keys = Object.keys(d).filter(
      (k) => !["_id", "_inserted_at", "hostname", "host", "camera_id", "timestamp", "ts"].includes(k),
    );
    return keys.slice(0, 3).join(", ");
  }
  return parts.join(" · ");
}

