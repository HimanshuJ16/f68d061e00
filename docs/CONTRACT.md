# Windshift implementation contract

React/TypeScript + FastAPI product. The initial build was local-only; on 25 October the user explicitly authorized Vercel deployment, which is now complete. Repository publication, video/upload and submission remain manual.

`GET /api/analysis?cutoff=09:00` returns the shape below. Cutoff is any valid HH:mm in Europe/London, on each decision date January 1–31 2026. Delivery is the next UK calendar day (Jan 2–Feb 1); explicit civil-day pilot assumption, not a full exchange delivery schedule. Select greatest WINDFOR publishTime <= cutoff independently per target. Actuals are hindsight and never used to select forecasts. Error = forecast - actual; positive means wind shortfall versus expectation. MW throughout, energy MWh = sum(MW * 0.5). No MAPE.

```ts
type Metrics = {
  pairedIntervals: number; expectedIntervals: number; forecastIntervals: number; actualIntervals: number;
  maeMw: number|null; biasMw: number|null; rmseMw: number|null;
  p90AbsoluteErrorMw: number|null; maxOverforecastMw: number|null;
  forecastEnergyMwh: number|null; actualEnergyMwh: number|null;
};
type Interval = {
  startTime: string; settlementPeriod: number;
  forecastMw: number|null; actualMw: number|null; errorMw: number|null;
  publishTime: string|null; leadHours: number|null;
};
type Day = {
  decisionDate: string; deliveryDate: string; cutoffTime: string;
  intervals: Interval[]; metrics: Metrics;
};
type Analysis = {
  cutoff: string; timezone: 'Europe/London';
  days: Day[]; metrics: Metrics;
  provenance: {
    retrievedAt: string; sources: {dataset: string; url: string; records: number}[];
    snapshotId: string; warnings: string[];
  };
};
```

Energy values are null unless all expected intervals in the relevant series are present. Metrics use paired intervals only, display n and denominator. Null means unavailable, never zero. P90 uses linear interpolation; describe as observed historical absolute error, not a probability guarantee. `/api/health` returns basic health and whether data loaded. `/api/export?cutoff=HH:mm&decision_date=YYYY-MM-DD` returns selected daily CSV (date optional for all days). 422 invalid query, 503 missing/invalid snapshot.

Snapshot loader and refresh script are backend-owned. `data/snapshot.json` contains real normalized data plus provenance; no fake values. App runs offline from committed snapshot. Refresh is explicit CLI, never automatic per request. Static frontend build served by Python in production; Vite dev proxy `/api` -> 127.0.0.1:8000. All paths relative to project root.

UI: Windshift, restrained warm paper/ink/navy/teal operations console. Main navigation Decision replay / January review / Method. A left decision-date rail/calendar and main daily chart with forecast, optional hindsight actuals (off by default), interval selection/table. Cutoff select/input, clear decision vs delivery day, source publication time visible. Review has zero-safe retrospective errors, daily comparison, sign explanation, sample size and export. Month results are explicitly hindsight, not data available to earlier buyers. No invented demand/thermal procurement amount or claimed forecast confidence. User should be able to see latest eligible forecasts, inspect provenance, switch cutoff, reveal outcomes, compare errors, export.
