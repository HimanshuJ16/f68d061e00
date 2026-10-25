# Independent data audit

Audit UTC: 2026-10-25T06:59:06.805555+00:00

Reproduce from the project root:

```sh
python scripts/audit_snapshot.py --api-url https://windshift-january-2026.vercel.app
```

Omit `--api-url` for a fully offline audit. This script uses only Python's standard library and imports no backend code. Raw caches under `work/source-cache` are required. The January-specific cutoff uses GMT explicitly; this audit does not validate DST behavior.

## Results

PASS: snapshot forecast/actual key-value records exactly reconstruct from all 63 cached Elexon response arrays, provenance URLs/counts match cache metadata, and the provenance snapshot ID equals the canonical SHA256 of the normalized forecast/actual payload.

Raw rows: WINDFOR 18,688; FUELHH WIND 1,488. In delivery window: 17,864 unique forecast target/publication rows; 1,488 actual rows. Collapsed same-key raw duplicates in window: none.

PASS: 31 decision days (January 1–31), each with 48 delivery half-hours; 1,488 distinct consecutive intervals from January 2 00:00 UTC through February 1 23:30 UTC. Every interval has a forecast and actual. No nulls, invalid numbers, conflicting duplicates or missing expected intervals were found in this snapshot.

PASS: every selected forecast publication is at or before its decision's 09:00 UK cutoff, every delivery interval follows that cutoff, and the publication is the latest eligible raw vintage for its source hour. Actuals are hindsight and do not participate in forecast selection.

PASS: every selected value has raw hourly WINDFOR lineage. The explicit alignment is a step hold: the source hour's MW value and publication are reused unchanged at :00 and :30. There is no interpolation or invented source half-hour forecast.

PASS: independently derived month/day metrics and all 1,488 interval values, publications, leads and source-hour lineage equal the running API output.

## Default 09:00 metrics

| Metric | Independently recomputed value |
|---|---:|
| pairedIntervals | 1,488 |
| expectedIntervals | 1,488 |
| forecastIntervals | 1,488 |
| actualIntervals | 1,488 |
| maeMw | 2,041.958333333333 |
| biasMw | 1,747.887096774194 |
| rmseMw | 2,509.062854385690 |
| p90AbsoluteErrorMw | 4,140.099999999999 |
| maxOverforecastMw | 6,894 |
| forecastEnergyMwh | 9,695,395.000000000000 |
| actualEnergyMwh | 8,394,967.000000000000 |

Error = forecast − actual MW. Positive bias is an aggregate wind shortfall against the forecast. Energy is the sum of each MW value times 0.5 h. P90 uses linear interpolation of sorted absolute errors; it is a historical statistic.

## Boundary spot checks

| Decision | Delivery target UTC | Source hour UTC | Publication UTC | Forecast MW | Actual MW | Lead h |
|---|---|---|---|---:|---:|---:|
| 2026-01-01 | 2026-01-02T00:00:00Z | 2026-01-02T00:00:00Z | 2026-01-01T07:30:00Z | 18,781 | 15,228 | 16.5 |
| 2026-01-01 | 2026-01-02T00:30:00Z | 2026-01-02T00:00:00Z | 2026-01-01T07:30:00Z | 18,781 | 15,505 | 17.0 |
| 2026-01-01 | 2026-01-02T23:30:00Z | 2026-01-02T23:00:00Z | 2026-01-01T07:30:00Z | 18,313 | 14,202 | 40.0 |
| 2026-01-31 | 2026-02-01T00:00:00Z | 2026-02-01T00:00:00Z | 2026-01-31T07:30:00Z | 10,099 | 8,724 | 16.5 |
| 2026-01-31 | 2026-02-01T00:30:00Z | 2026-02-01T00:00:00Z | 2026-01-31T07:30:00Z | 10,099 | 8,462 | 17.0 |
| 2026-01-31 | 2026-02-01T23:30:00Z | 2026-02-01T23:00:00Z | 2026-01-31T07:30:00Z | 4,915 | 5,302 | 40.0 |

Snapshot provenance ID: `sha256:363777d3da41cf33909b63dfd23ca70a09681023b2a641c7ae80dde5f19f0c07`.
Snapshot file SHA256: `9dd78e43d50088656c7ec9746728c86b72e7e2937f93d5eb117691134d1f4ca1`.

Scope: this validates reproducibility and as-of selection against cached primary responses. It does not independently measure wind output, certify Elexon historical publication latency, or establish that operational metering is final settlement data.

Script execution: 0.793 seconds. Human/agent verification effort is recorded separately in EFFORT.md.
