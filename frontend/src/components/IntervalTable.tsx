import { useMemo, useState } from "react";
import type { Day, IntervalFilter } from "../types";
import { filterIntervals, number, publication, signed, time } from "../types";
import { ExportLink } from "./ExportLink";
export function IntervalTable({
  day,
  actuals,
  selected,
  onSelect,
  cutoff,
}: {
  day: Day;
  actuals: boolean;
  selected: number;
  onSelect: (n: number) => void;
  cutoff: string;
}) {
  const [filter, setFilter] = useState<IntervalFilter>("all");
  const [sort, setSort] = useState<{
    key: "settlementPeriod" | "forecastMw" | "actualMw" | "errorMw";
    desc: boolean;
  }>({ key: "settlementPeriod", desc: false });
  const visibleFilter = actuals ? filter : "all";
  const visibleSort =
    !actuals && (sort.key === "actualMw" || sort.key === "errorMw")
      ? { key: "settlementPeriod" as const, desc: false }
      : sort;
  const rows = useMemo(
    () =>
      filterIntervals(day.intervals, visibleFilter).sort((a, b) => {
        const av = a[visibleSort.key],
          bv = b[visibleSort.key];
        if (av == null) return bv == null ? 0 : 1;
        if (bv == null) return -1;
        return (av - bv) * (visibleSort.desc ? -1 : 1);
      }),
    [day.intervals, visibleFilter, visibleSort.key, visibleSort.desc],
  );
  const sortBy = (key: typeof sort.key) =>
    setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }));
  const heading = (label: string, key: typeof sort.key) => (
    <th
      scope="col"
      aria-sort={
        visibleSort.key === key
          ? visibleSort.desc
            ? "descending"
            : "ascending"
          : "none"
      }
    >
      <button className="sort-button" onClick={() => sortBy(key)}>
        {label}{" "}
        <span aria-hidden="true">
          {visibleSort.key === key ? (visibleSort.desc ? "↓" : "↑") : "↕"}
        </span>
      </button>
    </th>
  );
  return (
    <section className="table-section" aria-labelledby="interval-heading">
      <div className="section-top">
        <div>
          <p className="eyebrow">
            <span className="section-index">03 /</span> THE INFORMATION TRAIL
          </p>
          <h2 id="interval-heading">
            Interval ledger <span className="count-pill">{rows.length}</span>
          </h2>
          <p>Trace each forecast back to the information available.</p>
        </div>
        <div className="table-tools">
          {actuals && (
            <>
              <label className="sr-only" htmlFor="interval-filter">
                Filter intervals
              </label>
              <select
                id="interval-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as IntervalFilter)}
              >
                <option value="all">All intervals</option>
                <option value="shortfall">Wind shortfall (+)</option>
                <option value="surplus">Wind surplus (−)</option>
                <option value="missing">Missing data</option>
              </select>
            </>
          )}
          <ExportLink
            className="text-button"
            href={`/api/export?cutoff=${encodeURIComponent(cutoff)}&decision_date=${day.decisionDate}`}
            filename={`windshift-${day.decisionDate}-${cutoff.replace(":", "")}.csv`}
          >
            ↓ Export CSV
          </ExportLink>
        </div>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Half-hour interval data"
      >
        <table>
          <caption className="sr-only">
            Delivery {day.deliveryDate}; forecast available by {cutoff} on{" "}
            {day.decisionDate}. Actuals and errors are hindsight.
          </caption>
          <thead>
            <tr>
              {heading("Delivery · UK", "settlementPeriod")}
              {heading("Forecast · MW", "forecastMw")}
              {actuals && (
                <>
                  {heading("Actual · MW", "actualMw")}
                  {heading("Error · MW", "errorMw")}
                </>
              )}
              <th scope="col">Source published · UK</th>
              <th scope="col">Lead time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr
                key={i.settlementPeriod}
                className={
                  selected === i.settlementPeriod ? "selected-row" : ""
                }
              >
                <th scope="row">
                  <button
                    className="interval-select"
                    onClick={() => onSelect(i.settlementPeriod)}
                    aria-pressed={selected === i.settlementPeriod}
                  >
                    {time(i.startTime)}{" "}
                    <span>
                      SP {String(i.settlementPeriod).padStart(2, "0")}
                    </span>
                  </button>
                </th>
                <td className="teal numeric">{number(i.forecastMw)}</td>
                {actuals && (
                  <>
                    <td className="numeric">{number(i.actualMw)}</td>
                    <td
                      className={`numeric ${(i.errorMw ?? 0) > 0 ? "orange" : ""}`}
                    >
                      {signed(i.errorMw)}
                    </td>
                  </>
                )}
                <td>{publication(i.publishTime)}</td>
                <td className="numeric">
                  {number(i.leadHours, 1)}
                  {i.leadHours != null ? " h" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty-inline">No intervals match this filter.</div>
        )}
      </div>
      <p className="table-foot">
        — means unavailable
        {actuals
          ? " · Positive error = forecast − actual = wind shortfall versus expectation"
          : ""}
        .{" "}
        <span>
          {day.metrics.forecastIntervals} / {day.metrics.expectedIntervals}{" "}
          forecasts available
        </span>
      </p>
    </section>
  );
}
