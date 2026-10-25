import type { Day, Interval } from "../types";
import { date, number, publication, signed, time } from "../types";
export function IntervalInspector({
  interval,
  actuals,
  day,
}: {
  interval: Interval | undefined;
  actuals: boolean;
  day: Day;
}) {
  const issueAge = interval?.publishTime
    ? (new Date(day.cutoffTime).getTime() -
        new Date(interval.publishTime).getTime()) /
      3600000
    : null;
  return (
    <aside
      className="interval-inspector"
      aria-label="Selected interval inspector"
    >
      <div className="inspector-heading">
        <span className="eyebrow">INTERVAL INSPECTOR</span>
        <span className="inspector-cross" aria-hidden="true">
          +
        </span>
      </div>
      {interval ? (
        <div className="inspector-body" aria-live="polite" aria-atomic="true">
          <div className="inspector-time">
            <span className="eyebrow">{date(day.deliveryDate)} / DELIVERY</span>
            <p>
              {time(interval.startTime)}
              <span>UK</span>
            </p>
            <span className="settlement-tag">
              SETTLEMENT PERIOD{" "}
              {String(interval.settlementPeriod).padStart(2, "0")}
            </span>
          </div>
          <div className="inspector-forecast">
            <span className="eyebrow">AS-OF FORECAST</span>
            <p>
              {number(interval.forecastMw)} <span>MW</span>
            </p>
          </div>
          <div className="publication-detail">
            <span className="eyebrow">SOURCE PUBLISHED</span>
            <strong>{publication(interval.publishTime)}</strong>
            <p>
              {interval.leadHours == null
                ? "Lead time unavailable"
                : `${number(interval.leadHours, 1)} h before delivery`}
            </p>
            {issueAge != null && Number.isFinite(issueAge) && (
              <p className="issue-age">
                {number(issueAge, 1)} h old at decision cutoff
              </p>
            )}
            {interval.sourceStartTime && (
              <p>
                Original forecast hour · {time(interval.sourceStartTime)} UK
              </p>
            )}
          </div>
          {actuals ? (
            <div className="inspector-hindsight">
              <span className="eyebrow orange">
                HINDSIGHT / OBSERVED OUTCOME
              </span>
              <dl>
                <div>
                  <dt>Actual generation</dt>
                  <dd>
                    {number(interval.actualMw)} <span>MW</span>
                  </dd>
                </div>
                <div>
                  <dt>Forecast − actual</dt>
                  <dd className={(interval.errorMw ?? 0) > 0 ? "orange" : ""}>
                    {signed(interval.errorMw)} <span>MW</span>
                  </dd>
                </div>
              </dl>
              <p>
                Positive error means wind shortfall versus expectation. Outcomes
                were unavailable at the decision cutoff.
              </p>
            </div>
          ) : (
            <div className="inspector-note">
              <span aria-hidden="true">↗</span>
              <p>
                A frozen information set.
                <br />
                Reveal actuals to compare the outcome.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="empty-inline">
          No delivery intervals are available for this date.
        </p>
      )}
    </aside>
  );
}
