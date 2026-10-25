import type { Analysis } from "../types";
import { number } from "../types";
export function Sources({
  sources,
}: {
  sources: Analysis["provenance"]["sources"];
}) {
  const groups = Array.from(new Set(sources.map((s) => s.dataset))).map(
    (dataset) => ({
      dataset,
      entries: sources.filter((s) => s.dataset === dataset),
    }),
  );
  return (
    <>
      {groups.map((group) => (
        <div className="source" key={group.dataset}>
          <h3>{group.dataset}</h3>
          <p>
            {number(group.entries.reduce((total, s) => total + s.records, 0))}{" "}
            source records · {group.entries.length} request
            {group.entries.length === 1 ? "" : "s"}
          </p>
          <a href={group.entries[0].url} target="_blank" rel="noreferrer">
            View first official source request ↗
          </a>
        </div>
      ))}
      <details className="source-ledger">
        <summary>Inspect all {sources.length} source requests</summary>
        <ol>
          {sources.map((s, index) => (
            <li key={`${s.url}-${index}`}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.dataset} · request {index + 1} ↗
              </a>
              <span>{number(s.records)} records</span>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
