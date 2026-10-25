import { useEffect, useRef, useState } from "react";
import type { Analysis } from "./types";
import { date, number, publication } from "./types";
import { Mark, Arrow } from "./components/Primitives";
import { WindChart } from "./components/WindChart";
import { IntervalTable } from "./components/IntervalTable";
import { IntervalInspector } from "./components/IntervalInspector";
import { Review } from "./components/Review";
import { Method } from "./components/Method";

type View = "replay" | "review" | "method";
export default function App() {
  const [view, setView] = useState<View>("replay");
  const [draftCutoff, setDraftCutoff] = useState("09:00");
  const [cutoff, setCutoff] = useState("09:00");
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-01-01");
  const [actuals, setActuals] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const datesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/analysis?cutoff=${encodeURIComponent(cutoff)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let detail = "";
          try {
            const body = await response.json();
            detail = typeof body.detail === "string" ? body.detail : "";
          } catch {
            /* HTTP status remains useful when no detail is supplied. */
          }
          throw new Error(
            detail ||
              `The analysis could not be loaded (HTTP ${response.status}).`,
          );
        }
        return response.json();
      })
      .then((result: Analysis) => {
        if (
          !Array.isArray(result.days) ||
          !result.metrics ||
          !result.provenance
        )
          throw new Error("The analysis response is incomplete.");
        if (!disposed && !controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (disposed) return;
        if (timedOut)
          setError(
            "The analysis took longer than 15 seconds. The local service may be busy; please retry.",
          );
        else if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "The analysis could not be loaded.",
          );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cutoff, retry]);
  const day =
    data?.days.find((d) => d.decisionDate === selectedDate) ?? data?.days[0];
  const dayIndex =
    data?.days.findIndex((d) => d.decisionDate === day?.decisionDate) ?? 0;
  const interval =
    day?.intervals.find((i) => i.settlementPeriod === selectedPeriod) ??
    day?.intervals[0];
  useEffect(() => {
    datesRef.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [day?.decisionDate, view]);
  const chooseDay = (d: string) => {
    setSelectedDate(d);
    setSelectedPeriod(1);
  };
  const showDay = (d: string) => {
    chooseDay(d);
    setView("replay");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cutoffControl = (
    <form
      className="cutoff-module"
      onSubmit={(e) => {
        e.preventDefault();
        if (draftCutoff !== cutoff) setCutoff(draftCutoff);
      }}
    >
      <label className="eyebrow" htmlFor="cutoff">
        DECISION CUTOFF <span>EUROPE / LONDON</span>
      </label>
      <div className="cutoff-controls">
        <input
          id="cutoff"
          type="time"
          aria-label="Decision cutoff time"
          aria-describedby="cutoff-help"
          value={draftCutoff}
          onChange={(e) => setDraftCutoff(e.target.value)}
          required
        />
        <button
          className="button apply-button"
          type="submit"
          disabled={loading || draftCutoff === cutoff}
        >
          {loading
            ? "Applying…"
            : draftCutoff === cutoff && data
              ? "Applied ✓"
              : "Apply cutoff"}
          {draftCutoff !== cutoff && <Arrow />}
        </button>
      </div>
      <p id="cutoff-help" role="status">
        {draftCutoff !== cutoff ? (
          <>
            <span className="pending-dot" />
            Showing {cutoff} UK · apply {draftCutoff} to update
          </>
        ) : (
          <>
            Showing forecasts available by {cutoff} UK. Edit the time to
            compare.
          </>
        )}
      </p>
      <details className="cutoff-explanation">
        <summary>How does this work?</summary>
        <p>
          The cutoff is the time on the selected decision date when the buyer
          makes their decision. Windshift uses the latest forecast published by
          that time for the next delivery day.
        </p>
        <p>
          For 1 January, 09:00 uses the 07:30 issue; 10:00 includes the 09:30
          issue. Forecasts are published periodically, so changing the cutoff
          may leave the curve unchanged if no newer issue is available.
        </p>
      </details>
    </form>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to analysis
      </a>
      <header className="masthead">
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setView("replay");
          }}
        >
          <span className="brand-mark">
            <Mark />
          </span>
          windshift<span className="brand-register">/01</span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["replay", "Decision replay"],
              ["review", "January review"],
              ["method", "Method & sources"],
            ] as [View, string][]
          ).map(([key, label], index) => (
            <button
              className={`nav-tab ${view === key ? "active" : ""}`}
              aria-current={view === key ? "page" : undefined}
              key={key}
              onClick={() => setView(key)}
            >
              <span className="nav-index" aria-hidden="true">
                0{index + 1}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <div className="workspace-id">
          <span className="status-dot" />
          <div>
            GREAT BRITAIN
            <br />
            <span>HISTORICAL · JAN 2026</span>
          </div>
        </div>
      </header>
      {loading || error || !data || !day ? (
        <>
          <div className="state-utility">
            <p className="eyebrow">PUBLIC WIND DATA / HISTORICAL REPLAY</p>
            {cutoffControl}
          </div>
          <main
            id="main"
            className="state-panel"
            aria-live="polite"
            role={error ? "alert" : undefined}
          >
            <span className="state-index">
              {loading
                ? "REPLAY / LOADING"
                : error
                  ? "SERVICE / UNAVAILABLE"
                  : "SNAPSHOT / EMPTY"}
            </span>
            {loading && <div className="loader" />}
            <h1>
              {loading
                ? "Rebuilding the\ndecision view."
                : error
                  ? "Analysis unavailable."
                  : "No decision dates found."}
            </h1>
            <p>
              {loading
                ? `Finding the latest forecast published by ${cutoff} UK time for every delivery interval.`
                : error ||
                  "The loaded snapshot has no January decisions. Load a valid snapshot, then retry."}
            </p>
            {!loading && (
              <>
                <button
                  className="button"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Retry analysis <Arrow />
                </button>
                <details className="recovery-guide">
                  <summary>Method & recovery guidance</summary>
                  <p>
                    Each January decision buys the next UK civil day. The latest
                    forecast published at or before the applied cutoff is
                    selected independently for each target hour. Hourly values
                    are held across two half-hours; actuals are retrospective
                    outcomes.
                  </p>
                  <p>
                    Check that the local Python service is running and its
                    snapshot is loaded. A missing or invalid snapshot requires
                    the explicit refresh command and a server restart. Your
                    selected decision date and cutoff are retained when you
                    retry.
                  </p>
                </details>
              </>
            )}
            <div className="state-rules" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </main>
        </>
      ) : (
        <>
          {view === "replay" ? (
            <main id="main" className="replay-page">
              <div className="replay-heading">
                <div className="decision-title">
                  <p className="eyebrow">
                    <span className="section-index">01 /</span> DAY-AHEAD WIND ·
                    DECISION REPLAY
                  </p>
                  <h1>
                    <span className="sr-only">
                      {date(day.decisionDate, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span aria-hidden="true" className="display-date">
                      {date(day.decisionDate, { day: "2-digit" })}
                      <span className="display-month">JAN</span>
                      <span className="display-year">2026</span>
                    </span>
                  </h1>
                  <div className="decision-timeline">
                    <div>
                      <span className="timeline-dot" />
                      <span className="eyebrow">DECISION</span>
                      <strong>
                        {date(day.decisionDate)} · {cutoff} <small>UK</small>
                      </strong>
                    </div>
                    <span className="timeline-rule">
                      <Arrow />
                    </span>
                    <div>
                      <span className="eyebrow">DELIVERY</span>
                      <strong>
                        {date(day.deliveryDate)} <small>00:00–24:00 UK</small>
                      </strong>
                    </div>
                  </div>
                </div>
                {cutoffControl}
              </div>
              <section
                className="date-navigation"
                aria-label="Decision date selector"
              >
                <div className="date-navigation-label">
                  <span className="eyebrow">JANUARY / 31 DECISIONS</span>
                  <div className="date-navigation-help">
                    <span>Each date opens the following delivery day</span>
                    <div className="day-controls">
                      <button
                        className="icon-button"
                        aria-label="Previous decision date"
                        disabled={dayIndex <= 0}
                        onClick={() =>
                          chooseDay(data.days[dayIndex - 1].decisionDate)
                        }
                      >
                        <Arrow back />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Next decision date"
                        disabled={dayIndex >= data.days.length - 1}
                        onClick={() =>
                          chooseDay(data.days[dayIndex + 1].decisionDate)
                        }
                      >
                        <Arrow />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="date-list" ref={datesRef}>
                  {data.days.map((d) => {
                    const missing = Math.max(
                      0,
                      d.metrics.expectedIntervals - d.metrics.forecastIntervals,
                    );
                    return (
                      <button
                        key={d.decisionDate}
                        className={`date-button ${d.decisionDate === day.decisionDate ? "selected" : ""} ${missing ? "incomplete" : ""}`}
                        aria-pressed={d.decisionDate === day.decisionDate}
                        aria-label={`${date(d.decisionDate, { day: "numeric", month: "long", year: "numeric" })}. ${d.metrics.forecastIntervals} of ${d.metrics.expectedIntervals} forecasts available, ${missing} missing.`}
                        title={`${d.metrics.forecastIntervals}/${d.metrics.expectedIntervals} forecast half-hours · ${missing} missing`}
                        onClick={() => chooseDay(d.decisionDate)}
                      >
                        <span className="date-weekday">
                          {date(d.decisionDate, { weekday: "short" }).slice(
                            0,
                            1,
                          )}
                        </span>
                        <span className="date-number">
                          {date(d.decisionDate, { day: "2-digit" })}
                        </span>
                        <span className="date-coverage" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="instrument" aria-labelledby="curve-heading">
                <div className="instrument-main">
                  <div className="instrument-top">
                    <div>
                      <p className="eyebrow">
                        <span className="section-index">02 /</span> DELIVERY
                        EXPECTATION
                      </p>
                      <h2 id="curve-heading">
                        The delivery curve
                        <span className="live-mark" aria-hidden="true">
                          ↗
                        </span>
                      </h2>
                    </div>
                    <label
                      className={`toggle-label ${actuals ? "revealed" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={actuals}
                        onChange={(e) => setActuals(e.target.checked)}
                      />
                      <span className="switch" />
                      <span>
                        Reveal actuals<small>HINDSIGHT</small>
                      </span>
                    </label>
                  </div>
                  <div className="energy-heading">
                    <p className="energy-value">
                      {number(day.metrics.forecastEnergyMwh)}
                      <span>MWh</span>
                    </p>
                    <div>
                      <p>Expected wind energy</p>
                      <span className="mono">
                        {day.metrics.forecastIntervals} /{" "}
                        {day.metrics.expectedIntervals} forecast half-hours
                      </span>
                    </div>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-line forecast" />
                      As-of forecast
                    </span>
                    {actuals && (
                      <span>
                        <i className="legend-line actual" />
                        Actual · hindsight
                      </span>
                    )}
                    <span className="chart-unit">GENERATION / MW</span>
                  </div>
                  <WindChart
                    intervals={day.intervals}
                    actuals={actuals}
                    selected={interval?.settlementPeriod ?? 1}
                    onSelect={setSelectedPeriod}
                  />
                  <div className="instrument-caption">
                    <p>Hourly forecast held across two half-hours</p>
                    <span>
                      Move across the curve to inspect <Arrow />
                    </span>
                  </div>
                </div>
                <IntervalInspector
                  interval={interval}
                  actuals={actuals}
                  day={day}
                />
              </section>
              {actuals && (
                <div className="daily-hindsight">
                  <span className="eyebrow orange">
                    HINDSIGHT / DAILY ERROR
                  </span>
                  <p>
                    <span>
                      MAE <strong>{number(day.metrics.maeMw)} MW</strong>
                    </span>
                    <span>
                      RMSE <strong>{number(day.metrics.rmseMw)} MW</strong>
                    </span>
                    <span>
                      Bias <strong>{number(day.metrics.biasMw)} MW</strong>
                    </span>
                  </p>
                  <span>
                    {day.metrics.pairedIntervals}/
                    {day.metrics.expectedIntervals} paired half-hours
                  </span>
                </div>
              )}
              <IntervalTable
                day={day}
                actuals={actuals}
                selected={interval?.settlementPeriod ?? 1}
                onSelect={setSelectedPeriod}
                cutoff={cutoff}
              />
              {data.provenance.warnings.length > 0 && (
                <details className="snapshot-notes">
                  <summary>
                    Snapshot notes{" "}
                    <span>{data.provenance.warnings.length}</span>
                    <Arrow />
                  </summary>
                  <ul>
                    {data.provenance.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}
            </main>
          ) : view === "review" ? (
            <Review data={data} onDay={showDay} cutoffControl={cutoffControl} />
          ) : (
            <Method data={data} cutoffControl={cutoffControl} />
          )}
          <footer className="footer">
            <div className="footer-brand">
              windshift<span>PUBLIC DATA. PRECISE CONTEXT.</span>
            </div>
            <div className="footer-snapshot">
              <span className="status-dot" />
              STORED SNAPSHOT{" "}
              <code title={data.provenance.snapshotId}>
                {data.provenance.snapshotId.slice(0, 16)}
              </code>
            </div>
            <span>
              Retrieved {publication(data.provenance.retrievedAt)}{" "}
              <span className="divider">/</span> Europe/London
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
