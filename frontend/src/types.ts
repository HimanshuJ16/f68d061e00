export type Metrics = {
  pairedIntervals: number;
  expectedIntervals: number;
  forecastIntervals: number;
  actualIntervals: number;
  maeMw: number | null;
  biasMw: number | null;
  rmseMw: number | null;
  p90AbsoluteErrorMw: number | null;
  maxOverforecastMw: number | null;
  forecastEnergyMwh: number | null;
  actualEnergyMwh: number | null;
};
export type Interval = {
  startTime: string;
  settlementPeriod: number;
  forecastMw: number | null;
  actualMw: number | null;
  errorMw: number | null;
  publishTime: string | null;
  leadHours: number | null;
  sourceStartTime?: string | null;
};
export type Day = {
  decisionDate: string;
  deliveryDate: string;
  cutoffTime: string;
  intervals: Interval[];
  metrics: Metrics;
};
export type Analysis = {
  cutoff: string;
  timezone: "Europe/London";
  days: Day[];
  metrics: Metrics;
  provenance: {
    retrievedAt: string;
    sources: { dataset: string; url: string; records: number }[];
    snapshotId: string;
    warnings: string[];
  };
};
export const number = (n: number | null | undefined, digits = 0) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(n);
export const signed = (n: number | null | undefined) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${number(n)}`;
export const date = (
  d: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("en-GB", {
    ...opts,
    timeZone: "Europe/London",
  });
export const time = (d: string | null) =>
  d
    ? new Date(d).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      })
    : "—";
export const publication = (d: string | null) =>
  d ? `${date(d)} ${time(d)} UK` : "No eligible publication";
export type IntervalFilter = "all" | "shortfall" | "surplus" | "missing";
export function filterIntervals(intervals: Interval[], filter: IntervalFilter) {
  return intervals.filter(
    (i) =>
      filter === "all" ||
      (filter === "shortfall" && (i.errorMw ?? 0) > 0) ||
      (filter === "surplus" && (i.errorMw ?? 0) < 0) ||
      (filter === "missing" && (i.forecastMw == null || i.actualMw == null)),
  );
}
