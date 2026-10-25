import type { Metrics } from "../types";
import { number } from "../types";
export function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M4 10h17c7 0 7-8 1-8M4 16h23M4 22h14c8 0 8 8 2 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Arrow({ back = false }: { back?: boolean }) {
  return <span aria-hidden="true">{back ? "←" : "→"}</span>;
}
export function Metric({
  label,
  value,
  unit = "MW",
  detail,
  accent = false,
}: {
  label: string;
  value: number | null;
  unit?: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`metric ${accent ? "accent" : ""}`}>
      <p className="eyebrow">{label}</p>
      <p className="metric-value">
        {number(value)} <span>{unit}</span>
      </p>
      <p className="muted">{detail}</p>
    </div>
  );
}
export function Coverage({ metrics }: { metrics: Metrics }) {
  return (
    <span className="coverage">
      {number(metrics.pairedIntervals)} / {number(metrics.expectedIntervals)}{" "}
      paired half-hours
    </span>
  );
}
