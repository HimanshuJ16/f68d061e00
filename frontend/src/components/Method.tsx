import type { Analysis } from "../types";
import { number, publication } from "../types";
import { Sources } from "./Sources";
export function Method({
  data,
  cutoffControl,
}: {
  data: Analysis;
  cutoffControl?: React.ReactNode;
}) {
  return (
    <main id="main" className="method-main">
      <div className="page-heading journal-heading">
        <div>
          <p className="eyebrow">
            <span className="section-index">03 /</span> METHOD & SOURCES
          </p>
          <h1>
            Every number.
            <br />
            In context.
          </h1>
          <p>
            A transparent replay of public wind data, with hindsight kept
            visible.
          </p>
        </div>
        {cutoffControl}
      </div>
      <div className="method-layout">
        <section className="method-steps">
          <article>
            <span className="step-number">01</span>
            <div>
              <h2>Freeze the decision clock</h2>
              <p>
                For each January 1–31, 2026 decision date, apply a {data.cutoff}{" "}
                cutoff in Europe/London. The default 09:00 is an illustrative
                planning cutoff, not a universal market deadline.
              </p>
            </div>
          </article>
          <article>
            <span className="step-number">02</span>
            <div>
              <h2>Take the latest eligible forecast</h2>
              <p>
                For every target hour in the next UK civil day, select the
                WINDFOR publication with the greatest publication time at or
                before the decision cutoff. Actuals never influence this
                selection.
              </p>
              <p className="method-callout">
                Hourly forecast held across two half-hours: the same hourly MW
                value is compared with both corresponding FUELHH half-hours.
                This includes within-hour actual variation in the errors.
              </p>
            </div>
          </article>
          <article>
            <span className="step-number">03</span>
            <div>
              <h2>Compare with observed delivery</h2>
              <p>
                Use FUELHH wind generation as the hindsight reference. This
                public generation series is the defined benchmark; it is not a
                claim to capture every wind generator in Great Britain.
              </p>
              <p>
                Decision dates map to January 2–February 1 delivery. This is a
                next-civil-day pilot assumption, not a full exchange delivery
                schedule.
              </p>
            </div>
          </article>
          <article>
            <span className="step-number">04</span>
            <div>
              <h2>Keep the arithmetic inspectable</h2>
              <p>
                Error = forecast − actual. MAE, mean bias, RMSE, P90 absolute
                error and maximum overforecast use paired half-hours only. P90
                uses linear interpolation. No percentage error metric is used.
              </p>
              <p>
                Energy in MWh = Σ(MW × 0.5 hours). Energy totals are available
                only when all expected intervals for that series are present.
                Nulls display as — and never become zero.
              </p>
            </div>
          </article>
        </section>
        <aside className="source-panel">
          <span className="eyebrow">DATA PROVENANCE</span>
          <h2>Public data. Traceable issues.</h2>
          <Sources sources={data.provenance.sources} />
          <dl>
            <dt>Snapshot ID</dt>
            <dd>
              <code>{data.provenance.snapshotId}</code>
            </dd>
            <dt>Retrieved</dt>
            <dd>{publication(data.provenance.retrievedAt)}</dd>
            <dt>Timezone</dt>
            <dd>Europe/London</dd>
            <dt>Paired coverage</dt>
            <dd>
              {number(data.metrics.pairedIntervals)} /{" "}
              {number(data.metrics.expectedIntervals)} half-hours
            </dd>
          </dl>
          <p className="muted">
            The app uses a stored snapshot. Source refreshes are explicit;
            changing the cutoff replays the loaded data.
          </p>
          {data.provenance.warnings.length > 0 && (
            <div className="source-warnings">
              <h3>Snapshot notes</h3>
              <ul>
                {data.provenance.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
