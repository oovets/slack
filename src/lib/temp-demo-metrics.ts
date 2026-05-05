import type { MetricCardType } from '@/lib/calculations';

/**
 * Flip to false to use real calculated metrics again.
 */
export const USE_TEMP_DEMO_METRICS = false;

const UNIQUE = 48;
const RAC = 100;
const AGGREGATED = 62;
const VIEW_FREQ = 2.1;
const VISIT_FREQ = 1.0;
const VIEW_TIME_AVG = 1.2;
/** Minutes — consistent with unique × view freq × avg view time / 60 */
const VIEW_TIME_TOTAL_MIN = (UNIQUE * VIEW_FREQ * VIEW_TIME_AVG) / 60;
const SHARE_OF_VOICE = 100;

const MALE_PCT = 72;
const FEMALE_PCT = 28;

/** Counts so the half-pie matches ~72% male (unique base) */
const MALE_COUNT = Math.round((UNIQUE * MALE_PCT) / 100);
const FEMALE_COUNT = Math.max(0, UNIQUE - MALE_COUNT);

const DEMO_METRICS: MetricCardType[] = [
  {
    label: 'Unique Contacts',
    value: UNIQUE,
    format: 'number',
    tooltip:
      'The total number of unique individuals who looked at the camera. Each person is counted only once.',
  },
  {
    label: 'RAC',
    value: RAC,
    format: 'number',
    tooltip:
      'Realtime Accurate Contacts. The total number of times people looked at the camera.',
  },
  {
    label: 'Aggregated audience',
    value: AGGREGATED,
    format: 'number',
    tooltip:
      'The total number of people who were tracked by the camera during the period.',
  },
  {
    label: 'View freq. (avr.)',
    value: VIEW_FREQ,
    format: 'number',
    tooltip:
      'The average number of times each unique person looked at the camera.',
  },
  {
    label: 'Visit freq. (avr.)',
    value: VISIT_FREQ,
    format: 'number',
    tooltip:
      'The average number of times each person was tracked passing by.',
  },
  {
    label: 'View Time (avr.)',
    value: VIEW_TIME_AVG,
    format: 'time',
    tooltip: 'The average time each observation lasted.',
  },
  {
    label: 'View Time (Total)',
    value: VIEW_TIME_TOTAL_MIN,
    format: 'time',
    roundTo: 'minutes',
    tooltip: 'The total combined time people looked at the camera.',
  },
  {
    label: 'Share of voice',
    value: SHARE_OF_VOICE,
    format: 'percentage',
    tooltip: 'The share of total screen time your campaign had on the location.',
  },
];

const DEMO_BY_LABEL = new Map(DEMO_METRICS.map((m) => [m.label, m]));

/** API metrics rows before/after JSON (format may be inferred as string). */
type MetricLike = {
  label: string;
  value: number;
  format?: string;
  tooltip?: string;
  roundTo?: string;
};

function mergeMetrics(metrics: MetricLike[]): MetricCardType[] {
  if (!metrics?.length) {
    return DEMO_METRICS.map((m) => ({ ...m }));
  }
  return metrics.map((m) => {
    const demo = DEMO_BY_LABEL.get(m.label);
    if (!demo) {
      return m as MetricCardType;
    }
    return {
      ...m,
      value: demo.value,
      format: demo.format,
      roundTo: demo.roundTo ?? (m.roundTo as MetricCardType['roundTo']),
    } as MetricCardType;
  });
}

type Payload = {
  metrics: MetricLike[];
  genderDistribution: {
    malePercentage: number;
    femalePercentage: number;
    maleCount?: number;
    femaleCount?: number;
    totalWithGender?: number;
  };
  visibility?: {
    total_unique_contacts: number;
    total_humans: number;
    total_observation_time: number;
    looked_at_screen: number;
    looked_left: number;
    looked_right: number;
    looked_away: number;
    avarage_spent_in_zone: number;
  };
};

/**
 * Replaces metric numbers and gender with fixed demo values while keeping response shape.
 */
export function applyTempDemoMetricsToPayload<T extends Payload>(payload: T): T {
  if (!USE_TEMP_DEMO_METRICS) return payload;

  const merged = mergeMetrics(payload.metrics);

  const out = {
    ...payload,
    metrics: merged,
    genderDistribution: {
      ...payload.genderDistribution,
      malePercentage: MALE_PCT,
      femalePercentage: FEMALE_PCT,
      maleCount: MALE_COUNT,
      femaleCount: FEMALE_COUNT,
      totalWithGender: UNIQUE,
    },
    visibility:
      payload.visibility &&
      typeof payload.visibility === 'object' &&
      !Array.isArray(payload.visibility)
        ? {
            ...(payload.visibility as NonNullable<Payload['visibility']>),
            total_unique_contacts: UNIQUE,
            total_humans: AGGREGATED,
            avarage_spent_in_zone: VIEW_TIME_AVG,
          }
        : payload.visibility,
  };

  return out as T;
}
