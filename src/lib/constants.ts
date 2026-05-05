export const metricItemsData = [
  {
    name: "Unique Contacts",
    amount: 398,
    icon: "unique-contacts",
    decimalPlaces: 0,
  },
  {
    name: "Realtime Accurate Contacts",
    amount: 9687,
    icon: "realtime-accurate-contacts",
    decimalPlaces: 0,
  },
  {
    name: "Aggregated Audience",
    amount: 110,
    icon: "aggregated-audience",
    decimalPlaces: 0,
  },
  {
    name: "View Frequency. (avr.)",
    amount: 6.2,
    icon: "view-frequency",
    decimalPlaces: 1,
  },
  {
    name: "Visit Frequency. (avr.)",
    amount: 4.1,
    icon: "visit-frequency",
    decimalPlaces: 1,
  },
  {
    name: "View Time (avr.)",
    amount: 2.7,
    postfix: "s",
    icon: "view-time",
    decimalPlaces: 1,
  },
  {
    name: "View Time (Total)",
    amount: 42,
    postfix: "m",
    icon: "view-time",
    decimalPlaces: 0,
  },
  {
    name: "Share of Voice",
    amount: 10,
    postfix: "%",
    icon: "share-of-voice",
    decimalPlaces: 0,
  },
] as const;

export const contactsByGenderData = {
  left: {
    title: "Female",
    number: 0,
  },
  right: {
    title: "Male",
    number: 0,
  },
};

/** Default age distribution when fallback DB row has no `ageGroupsPercentage` (matches live API shape). */
export const DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE: Record<
  "18 - 24" | "25 - 34" | "35 - 44" | "45 - 54" | "55 - 64" | "65+",
  number
> = {
  "18 - 24": 3,
  "25 - 34": 2,
  "35 - 44": 66,
  "45 - 54": 24,
  "55 - 64": 4,
  "65+": 1,
};

const AGE_GROUP_ORDER = [
  "18 - 24",
  "25 - 34",
  "35 - 44",
  "45 - 54",
  "55 - 64",
  "65+",
] as const;

export const ageGroupsData = AGE_GROUP_ORDER.map((name) => ({
  name,
  amount: DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE[name],
}));

/**
 * If every standard bucket sums to 0% (no analytics ages, empty API, etc.), show default distribution.
 */
export function defaultAgeGroupsPercentageIfAllZero(
  ageGroupsPercentage: Record<string, number> | undefined | null,
): Record<string, number> {
  const merged = {
    ...DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
    ...ageGroupsPercentage,
  };
  const sum = AGE_GROUP_ORDER.reduce(
    (s, k) => s + (Number(merged[k]) || 0),
    0,
  );
  if (sum > 0) {
    return merged;
  }
  return { ...DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE };
}

export const logosListData = [
  {
    name: "7 eleven",
    src: "/7eleven-logo.png",
  },
  {
    name: "Wendy's",
    src: "/wendys-logo.png",
  },
] as const;

export const colorPresetData = {
  default: {
    "--primary": "#316a53",
    "--secondary": "#ff6c00",
  },
  alternative: {
    "--primary": "orangered",
    "--secondary": "cyan",
  },
} as const;

export const fontsData = {
  "7eleven": "sevenEleven, sevenEleven Fallback",
  geist: "Geist, Geist Fallback",
  geistMono: "Geist Mono, Geist Mono Fallback",
  eidraSans: "Eidra Sans, sans-serif",
} as const;
