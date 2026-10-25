import type { Analysis } from "../types";
import { date, number, signed } from "../types";
import { Metric, Coverage, Arrow } from "./Primitives";
import { useState } from "react";
import { ExportLink } from "./ExportLink";
export function Review({
  data,
  onDay,
  cutoffControl,
}: {
  data: Analysis;
  onDay: (d: string) => void;
  cutoffControl?: React.ReactNode;
}) {
  const m = data.metrics;
  const [comparisonMetric, setComparisonMetric] = useState<"bias" | "mae">(
    "bias",
  );
  const max = Math.max(
    1,
    ...data.days.map((day) =>
      Math.abs(
        (comparisonMetric === "bias"
          ? day.metrics.biasMw
          : day.metrics.maeMw) ?? 0,
      ),
    ),
  );
  return (
    <main id="main" className="review-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="section-index">02 /</span> JANUARY 2026 ·
            HISTORICAL PERFORMANCE
          </p>
          <h1>
            Expectation.
            <br />
            <span className="muted-title">Measured.</span>
          </h1>
          <p>
            How the {data.cutoff} decision-time forecasts compared with delivery
            outcomes.
          </p>
        </div>
        {cutoffControl}
      </div>
      <div className="review-actions">
        <span className="eyebrow">
          31 DECISION DAYS / 2 JAN — 1 FEB DELIVERY
        </span>
        <ExportLink
          className="text-button"
          href={`/api/export?cutoff=${encodeURIComponent(data.cutoff)}`}
          filename={`windshift-january-2026-${data.cutoff.replace(":", "")}.csv`}
        >
          ↓ Export month CSV
        </ExportLink>
      </div>
      <div className="hindsight-banner">
        <span className="hindsight-label">HINDSIGHT REVIEW</span>
        <p>
          These outcomes are known after delivery. Month-wide results were
          unavailable to January decision makers.
        </p>
        <Coverage metrics={m} />
      </div>
      <div className="review-metrics">
        <Metric
          label="MEAN ABSOLUTE ERROR"
          value={m.maeMw}
          detail="Average size of the observed miss"
          accent
        />
        <Metric
          label="MEAN BIAS"
          value={m.biasMw}
          detail="Forecast − actual; positive = shortfall"
        />
        <Metric
          label="P90 ABSOLUTE ERROR"
          value={m.p90AbsoluteErrorMw}
          detail="90th percentile of historical absolute error"
        />
      </div>
      <div className="secondary-metrics">
        <div>
          <span>Root mean square error</span>
          <strong>
            {number(m.rmseMw)} <small>MW</small>
          </strong>
        </div>
        <div>
          <span>Largest overforecast</span>
          <strong>
            {number(m.maxOverforecastMw)} <small>MW</small>
          </strong>
        </div>
        <div>
          <span>Forecast / actual coverage</span>
          <strong>
            {number(m.forecastIntervals)} / {number(m.actualIntervals)}{" "}
            <small>of {number(m.expectedIntervals)}</small>
          </strong>
        </div>
      </div>
      <div className="review-grid">
        <section className="daily-comparison">
          <div className="section-top">
            <div>
              <h2>Where the month shifted</h2>
              <p>
                {comparisonMetric === "bias"
                  ? "Mean daily error"
                  : "Mean daily absolute error"}{" "}
                · MW. Select a decision date to replay it.
              </p>
            </div>
            <div className="metric-toggle" aria-label="Daily comparison metric">
              <button
                aria-pressed={comparisonMetric === "bias"}
                onClick={() => setComparisonMetric("bias")}
              >
                Mean bias
              </button>
              <button
                aria-pressed={comparisonMetric === "mae"}
                onClick={() => setComparisonMetric("mae")}
              >
                MAE
              </button>
            </div>
          </div>
          <div className="comparison-guide">
            <span>
              {comparisonMetric === "bias"
                ? "← Wind surplus"
                : "0 / absolute error"}
            </span>
            <span>
              {comparisonMetric === "bias"
                ? "Wind shortfall →"
                : "Larger error →"}
            </span>
          </div>
          <div className="comparison-list">
            {data.days.map((d) => {
              const val =
                comparisonMetric === "bias"
                  ? d.metrics.biasMw
                  : d.metrics.maeMw;
              return (
                <button
                  className="comparison-row"
                  key={d.decisionDate}
                  onClick={() => onDay(d.decisionDate)}
                  aria-label={`Replay ${date(d.decisionDate)}. ${comparisonMetric === "bias" ? "Mean bias" : "MAE"} ${comparisonMetric === "bias" ? signed(val) : number(val)} megawatts. ${d.metrics.pairedIntervals} paired intervals.`}
                >
                  <span>
                    {date(d.decisionDate)}{" "}
                    <small>{date(d.decisionDate, { weekday: "short" })}</small>
                  </span>
                  <span
                    className={`comparison-track ${comparisonMetric === "mae" ? "absolute" : ""}`}
                  >
                    <span className="comparison-zero" />
                    {val != null && (
                      <span
                        className={`comparison-bar ${comparisonMetric === "mae" ? "absolute" : val > 0 ? "positive" : "negative"}`}
                        style={{
                          width: `${(Math.abs(val) / max) * (comparisonMetric === "mae" ? 96 : 47)}%`,
                          left:
                            comparisonMetric === "mae"
                              ? "0%"
                              : val >= 0
                                ? "50%"
                                : undefined,
                          right:
                            comparisonMetric === "bias" && val < 0
                              ? "50%"
                              : undefined,
                        }}
                      />
                    )}
                  </span>
                  <strong
                    className={
                      comparisonMetric === "bias" && (val ?? 0) > 0
                        ? "orange"
                        : ""
                    }
                  >
                    {comparisonMetric === "bias" ? signed(val) : number(val)}
                  </strong>
                  <span className="comparison-n">
                    {d.metrics.pairedIntervals}/{d.metrics.expectedIntervals}
                  </span>
                  <Arrow />
                </button>
              );
            })}
          </div>
        </section>
        <aside className="review-aside">
          <span className="eyebrow">READING THE ERROR</span>
          <h2>The sign tells the story.</h2>
          <p className="error-equation">Forecast − actual</p>
          <div className="interpretation">
            <span className="orange">+ Positive</span>
            <p>
              Less wind arrived than expected. This is a wind shortfall relative
              to the forecast.
            </p>
          </div>
          <div className="interpretation">
            <span className="teal">− Negative</span>
            <p>
              More wind arrived than expected. This is a wind surplus relative
              to the forecast.
            </p>
          </div>
          <p className="muted">
            These are wind deviations. Demand, contracted volumes and
            procurement decisions are outside this pilot.
          </p>
          <hr />
          <h3>Observed, not guaranteed</h3>
          <p>
            The P90 describes this historical sample using linear interpolation.
            It is not a future confidence bound.
          </p>
          <p>
            Metrics use paired half-hours only. Missing observations stay
            missing.
          </p>
        </aside>
      </div>
    </main>
  );
}
