import { useEffect, useRef, useState } from "react";
import type { Interval } from "../types";
import { number, time } from "../types";

export function WindChart({
  intervals,
  actuals,
  selected,
  onSelect,
}: {
  intervals: Interval[];
  actuals: boolean;
  selected: number;
  onSelect: (n: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const resize = () => {
      const measured = container.current?.getBoundingClientRect().width;
      if (measured) setWidth(Math.max(300, Math.round(measured)));
    };
    resize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      if (container.current) observer.observe(container.current);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const W = width,
    H = width < 560 ? 300 : 340,
    left = width < 560 ? 53 : 61,
    right = 16,
    top = 32,
    bottom = 38;
  const plotW = W - left - right,
    plotH = H - top - bottom;
  const values = intervals
    .flatMap((i) => [i.forecastMw, ...(actuals ? [i.actualMw] : [])])
    .filter((n): n is number => n != null && Number.isFinite(n));
  const ceiling = Math.ceil(Math.max(1000, ...values) / 2000) * 2000;
  const y = (v: number) => top + plotH * (1 - v / ceiling);
  const slot = plotW / Math.max(intervals.length, 1);
  const paths = (key: "forecastMw" | "actualMw") => {
    let path = "",
      priorValid = false;
    intervals.forEach((i, index) => {
      const value = i[key];
      if (value == null) {
        priorValid = false;
        return;
      }
      const x = left + index * slot;
      path += `${priorValid ? " L" : " M"}${x},${y(value)} L${x + slot},${y(value)}`;
      priorValid = true;
    });
    return path;
  };
  const selectedIndex = intervals.findIndex(
    (i) => i.settlementPeriod === selected,
  );
  const selectedInterval = intervals[selectedIndex];
  const selectedX = left + (selectedIndex + 0.5) * slot;
  const ticks = Array.from({ length: 5 }, (_, i) => (ceiling * i) / 4);
  return (
    <div className="chart-container" ref={container}>
      {!values.length ? (
        <div className="chart-empty">
          <span className="empty-cross" aria-hidden="true">
            +
          </span>
          <p>
            No {actuals ? "forecast or actual" : "eligible forecast"} values for
            this delivery day.
          </p>
          <p>
            Missing values remain unavailable; they are never treated as zero.
          </p>
        </div>
      ) : (
        <svg
          className="wind-chart"
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="Delivery-day wind generation curve. Each half-hour is keyboard selectable; exact values are in the interval table."
        >
          <title>
            Delivery-day forecast{actuals ? " and hindsight actual" : ""} in
            megawatts
          </title>
          <desc>
            Citron shows the forecast available at the cutoff.
            {actuals
              ? " The dashed pale-blue line is hindsight actual generation."
              : ""}{" "}
            Gaps indicate missing values. Use left and right arrow keys to
            inspect half-hours.
          </desc>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={W - right}
                y1={y(t)}
                y2={y(t)}
                className="chart-grid"
              />
              <text
                x={left - 12}
                y={y(t) + 4}
                textAnchor="end"
                className="axis-label"
              >
                {number(t)}
              </text>
            </g>
          ))}
          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line
                x1={left + (plotW * h) / 24}
                x2={left + (plotW * h) / 24}
                y1={top}
                y2={top + plotH}
                className="chart-grid vertical"
              />
              <text
                x={left + (plotW * h) / 24}
                y={H - 12}
                textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
                className="axis-label"
              >
                {String(h).padStart(2, "0")}:00
              </text>
            </g>
          ))}
          {intervals.map((i, index) =>
            i.forecastMw == null ? null : (
              <rect
                key={i.settlementPeriod}
                x={left + index * slot}
                width={slot + 0.2}
                y={y(i.forecastMw)}
                height={top + plotH - y(i.forecastMw)}
                className="forecast-area"
              />
            ),
          )}
          {actuals && <path d={paths("actualMw")} className="actual-path" />}
          <path d={paths("forecastMw")} className="forecast-path" />
          {selectedInterval && (
            <g className="selected-crosshair" aria-hidden="true">
              <rect
                x={left + selectedIndex * slot}
                width={slot}
                y={top}
                height={plotH}
                className="selected-band"
              />
              <line
                x1={selectedX}
                x2={selectedX}
                y1={top - 10}
                y2={top + plotH}
                className="crosshair-line"
              />
              <text
                x={Math.min(W - right - 23, Math.max(left + 20, selectedX))}
                y={17}
                textAnchor="middle"
                className="crosshair-time"
              >
                {time(selectedInterval.startTime)}
              </text>
              {selectedInterval.forecastMw != null && (
                <>
                  <circle
                    cx={selectedX}
                    cy={y(selectedInterval.forecastMw)}
                    r="8"
                    className="forecast-halo"
                  />
                  <circle
                    cx={selectedX}
                    cy={y(selectedInterval.forecastMw)}
                    r="4"
                    className="forecast-dot"
                  />
                </>
              )}
              {actuals && selectedInterval.actualMw != null && (
                <circle
                  cx={selectedX}
                  cy={y(selectedInterval.actualMw)}
                  r="4"
                  className="actual-dot"
                />
              )}
            </g>
          )}
          {intervals.map((i, index) => (
            <rect
              className="chart-hit"
              key={i.settlementPeriod}
              x={left + index * slot}
              y={top}
              width={slot}
              height={plotH}
              fill="transparent"
              tabIndex={selected === i.settlementPeriod ? 0 : -1}
              role="button"
              aria-label={`${time(i.startTime)}, forecast ${number(i.forecastMw)} MW${actuals ? `, actual ${number(i.actualMw)} MW` : ""}. Select interval.`}
              aria-pressed={selected === i.settlementPeriod}
              onPointerMove={(e) => {
                if (
                  e.pointerType !== "touch" &&
                  selected !== i.settlementPeriod
                )
                  onSelect(i.settlementPeriod);
              }}
              onClick={() => onSelect(i.settlementPeriod)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(i.settlementPeriod);
                } else if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? intervals.length - 1
                        : Math.min(
                            intervals.length - 1,
                            Math.max(
                              0,
                              index + (e.key === "ArrowRight" ? 1 : -1),
                            ),
                          );
                  onSelect(intervals[next].settlementPeriod);
                  e.currentTarget.parentElement
                    ?.querySelectorAll<SVGRectElement>(".chart-hit")
                    [next]?.focus();
                }
              }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
