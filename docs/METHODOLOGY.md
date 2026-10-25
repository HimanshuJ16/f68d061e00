# Decision-time methodology

## What the pilot answers

Windshift reconstructs the latest Elexon wind forecast published by a chosen buying cutoff, then measures its error against Elexon outturn. It helps a buyer see forecast shape, publication age and the scale/direction of historical misses. It does not calculate a utility's residual demand, thermal purchases, hedge size, balancing cost or a trading recommendation: none of demand, portfolio allocation, prices or other generation is present in the permitted data.

The two permitted datasets are WINDFOR and FUELHH with `fuelType=WIND`. Documentation about market timing and data definitions is research, not an extra analytical dataset.

## January means decision dates

The brief says purchase decisions made in January 2026. The pilot therefore includes 31 decisions, 1–31 January inclusive, each for the following UK civil delivery day. Delivery runs from 2 January 00:00 to 2 February 00:00 exclusive, or 1,488 half-hours. A 1 January delivery would have been bought on 31 December and is excluded; 1 February delivery belongs to the 31 January decision and is included.

This is a documented civil-day product assumption. An exchange's exact auction delivery block can differ, including a 23:00 boundary; this app does not claim to reproduce an exchange order book or complete contract schedule. A production implementation would confirm the customer's exchange and product before changing the window.

All API timestamps are parsed as timezone-aware instants. Cutoffs and delivery dates use `Europe/London`; internal comparisons use UTC. January and 1 February 2026 are GMT, so London and UTC coincide. Browser timezone never changes the decision date. The app intentionally restricts dates to this pilot; general DST auction-day support is not claimed.

## The cutoff is a policy input

09:00 London is the default planning cutoff, not a universal UK market deadline. It leaves time before the N2EX morning auction's documented 09:50 UK gate closure. Users may replay other HH:mm cutoffs; later cutoffs are sensitivity scenarios and may be too late for a chosen auction. The customer must set the actual operational cutoff and any publication/ingestion buffer.

For target interval `t` and decision cutoff `c`, select the record with the largest `publishTime` satisfying `publishTime <= c`. Do this independently for every target; do not take a single latest row or assume the newest publication covers the entire day. A forecast published exactly at the cutoff is eligible. Actuals never participate in this selection.

The stream's publication timestamp is the availability proxy specified by the challenge. We cannot verify when a particular customer's system received a record, or reconstruct an unexposed historical correction to the same publication timestamp. This is an archival replay, not proof of tick-by-tick availability. The explicit snapshot retrieval time makes that distinction visible.

The WINDFOR stream filters by **publication** time, not target time. Requests are bounded daily and then filtered locally to relevant delivery targets. Fetching only forecasts published on the delivery date, or querying a retrospective “latest” endpoint, would introduce look-ahead bias. December records are fetched solely to support January decision cutoffs.

## Aligning hourly forecasts and half-hour actuals

The retrieved January WINDFOR records have hourly `startTime` values. FUELHH records are half-hour average power. The pilot uses an explicit step-hold convention: a forecast at H:00 applies unchanged to H:00–H:30 and H:30–H+1:00. It preserves the original publication timestamp and hourly source target. No linear interpolation, gap filling or use of actuals is involved.

This alignment gives buyers a common half-hour timeline. It is a modelling convention, not two independently published forecasts. Half-hour errors include within-hour outturn variation, and neighbouring errors are dependent. Do not interpret 1,488 intervals as 1,488 independent experiments. A useful next comparison would aggregate the two actual half-hours to hourly means and assess metric sensitivity.

## Data scope and revisions

Elexon's generation-by-fuel documentation describes average MW from operationally metered generation and warns that embedded/unmetered renewables are excluded. WINDFOR describes wind farms visible to the system operator with operational metering. This is a national aggregate within the Elexon reporting population, not all UK wind capacity or the utility's contracted wind. The brief prescribes these two datasets; a plant-by-plant population match is outside its data scope.

Outturn is the retrieved FUELHH view, used retrospectively. Error can reflect curtailment, operational effects, measurement/revisions and population differences as well as weather forecast quality. We do not label the residual a pure meteorological error or a supplier imbalance.

Identical duplicate records can be collapsed. Conflicting values for the same target/publication require an explicit unavailable result or a stated deterministic revision rule; they must not silently win because of API ordering. Malformed timestamps, non-finite values and wrong fuel types are rejected or excluded with diagnostics. Missing is `null`, never zero. The snapshot and its warnings preserve what the ingestion actually found.

## Metrics and interpretation

For each paired interval, `e = forecast MW - actual MW`:

- **Positive error**: less wind materialised than forecast; a wind shortfall versus expectation.
- **Negative error**: more wind materialised than forecast.
- **MAE**: mean of `abs(e)`, the average absolute miss in MW.
- **Bias**: mean of `e`, the systematic direction; opposing errors can cancel.
- **RMSE**: square root of mean `e²`, giving large misses more weight.
- **P90 absolute error**: the sample 90th percentile of `abs(e)`, using linear interpolation between ordered observations. It describes this historical sample, not 90% future coverage or a procurement reserve requirement.
- **Maximum overforecast**: largest positive `e` (zero if all observed errors are non-positive); an observed worst shortfall, not a forecast bound.

Metrics use paired records only and always report coverage. Monthly values are computed over the underlying paired half-hours, not an unweighted average of daily metrics. No percentage “accuracy”, MAPE or division by actual generation is used, avoiding instability near zero. No MWh/MW confusion: each half-hour's energy is average MW × 0.5 h; whole-day/month energy is shown only when that series is complete.

## Hindsight is deliberately separate

Decision replay initially hides actuals. The optional outcome overlay and January review use subsequently observed actuals and are explicitly retrospective. Whole-January error statistics were not available to a buyer early in January. They are suitable for evaluating this pilot after the month, not for claiming a historically implementable risk policy.

A future rolling risk model would need to filter both forecast and actual publication timestamps to each decision, specify a minimum training window, preserve revisions as known then and validate out of sample. It would also need more history than this January-only scope. This pilot does not fabricate a confidence band from future observations.

## Primary research references

- [FUELHH stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream) and [WINDFOR stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream): required datasets.
- [Elexon live OpenAPI specification](https://data.elexon.co.uk/swagger/v1/swagger.json): exact parameters and schemas, inspected 24 October 2026.
- [Elexon generation by fuel type](https://bmrs.elexon.co.uk/generation-by-fuel-type): average MW, operational metering and incomplete renewable coverage.
- [Elexon wind forecast documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/generation/wind/latest): forecast reporting population. This endpoint was researched but is not the app's retrieval source.
- [North Sea Link trading information](https://www.northsealink.com/en/trade-with-us/register): N2EX 09:50 UK gate closure. This supports the illustrative morning cutoff, not a claim that all auctions share it.

Documentation schedules can differ from observed records. Actual `publishTime` values, not a hard-coded daily publication schedule, determine eligibility. Sources were accessed after January; any market operation assumptions are labelled accordingly.
