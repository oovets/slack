import {
  ageGroupsData,
  colorPresetData,
  fontsData,
  logosListData,
  metricItemsData,
} from "./constants";

export type ContactsByGender = Record<
  "left" | "right",
  { title: string; number: number }
>;

type WithVisible<T> = T & { visible: boolean };

export type MetricItemIcon = (typeof metricItemsData)[number]["icon"];

export type MetricItem = {
  name: string;
  amount: number;
  icon: MetricItemIcon;
  decimalPlaces: number;
  postfix?: string;
  visible: boolean;
};

export type AgeGroupItem = WithVisible<(typeof ageGroupsData)[number]>;

export type FooterLogoItem = WithVisible<(typeof logosListData)[number]>;

export type FooterLogoSrc = (typeof logosListData)[number]["src"];

export type ColorPresetKey = keyof typeof colorPresetData;

export type FontKey = keyof typeof fontsData;
