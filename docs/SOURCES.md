# Source evidence

Verified on 24 October 2026 against Elexon's public API and primary documentation. The application is an independent historical analysis of operationally metered GB wind, not an estimate of all UK wind generation.

## API contract

- [Elexon OpenAPI schema](https://data.elexon.co.uk/swagger/v1/swagger.json) is the authoritative parameter and response schema. The base URL is `https://data.elexon.co.uk/bmrs/api/v1`.
- [Developer portal](https://developer.data.elexon.co.uk/) confirms public access without an API key and that dataset endpoints retain superseded publications. Stream endpoints return JSON arrays. Their schemas declare no pagination parameters or continuation tokens.
- [WINDFOR dataset](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream) filters on `publishDateTimeFrom` and `publishDateTimeTo`, rather than delivery time. Omitting publication bounds retrieves the latest published forecast. Rows contain `dataset`, `publishTime`, `startTime`, and nullable `generation`; no revision ordinal is supplied.
- [FUELHH dataset](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream) permits either publication bounds or `settlementDateFrom`/`settlementDateTo`, but not both. Settlement dates use `yyyy-MM-dd`. `fuelType=WIND` restricts the series. Rows also carry settlement date and period. Its description defines generation as the average MW over each 30-minute interval.

## Live sample evidence

These requests returned HTTP 200 during implementation:

- [January 1 published forecast vintages](https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-01T00%3A00%3A00Z&publishDateTimeTo=2026-01-01T23%3A59%3A59Z): 584 rows, eight vintages, 73 hourly target points in each.
- [January 1 wind outturn](https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-01&fuelType=WIND): 48 half-hourly rows. The 00:00 target was published at 00:30, demonstrating that actual publication time and interval start differ.
- [One exact vintage](https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-01T02%3A30%3A00Z&publishDateTimeTo=2026-01-01T02%3A30%3A00Z): 73 rows, demonstrating inclusive equal bounds. De-duplicate inclusive chunk boundaries.

The January 1 vintages cover December 31 at 21:00 UTC through January 3 at 21:00 UTC. Publication timestamps are 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30 and 22:30 UTC. Arrays include target times before publication, so using all returned rows without an explicit historical cutoff would introduce lookahead. Select the latest publication at or before the decision cutoff independently for each target.

## Coverage and interpretation

[Elexon's wind page](https://bmrs.elexon.co.uk/wind-generation) describes hourly forecasts for wind farms visible to NESO with operational metering. [Generation by fuel type](https://bmrs.elexon.co.uk/generation-by-fuel-type) explains the operational metering scope. These are transmission-system observations; embedded and unmetered wind are outside the series. This is not final settlement metering.

The wind page describes up to eight daily updates and a day D to D+2 forecast window. The returned January sample contains a 72-hour target span and publication times one hour earlier than the prose schedule. The application therefore uses actual returned UTC timestamps rather than a hard-coded release schedule. Hourly forecast points and half-hourly outturn differ in resolution; the application's Method explains its alignment assumption. MW is power; half-hourly energy is MW multiplied by 0.5 hours. Missing values remain unavailable, never zero.

[Historic latest forecast](https://bmrs.elexon.co.uk/api-documentation/endpoint/forecast/generation/wind/latest/stream) uses `from`/`to` delivery-time filters, but may return publications later than the target. It is unsuitable for selecting the forecast available to an earlier decision.

## Reliability

No numeric request quota or endpoint-specific stream date limit was stated in the schema inspected. The schema does declare 429, 400 and 500 errors. The Elexon-owned [large stream request issue](https://github.com/elexon-data/insights-issues/issues/8) records timeout failures. Refresh should use bounded chunks, caching and backoff. An upstream error must not be represented as zero generation. Source attribution is retained in the application and snapshot provenance.
