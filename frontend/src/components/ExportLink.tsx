import { useEffect, useRef, useState } from "react";
export function ExportLink({
  href,
  filename,
  children,
  className = "text-button",
}: {
  href: string;
  filename: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  return (
    <div className="export-control">
      <a
        className={className}
        href={href}
        download={filename}
        aria-disabled={state === "loading"}
        onClick={async (e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          if (state === "loading") return;
          const controller = new AbortController();
          request.current = controller;
          let timedOut = false;
          const timer = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, 15_000);
          setState("loading");
          setError("");
          try {
            const response = await fetch(href, { signal: controller.signal });
            if (!response.ok)
              throw new Error(`Export failed (HTTP ${response.status}).`);
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setState("idle");
          } catch (err) {
            if (controller.signal.aborted && !timedOut) return;
            setError(
              timedOut
                ? "Export timed out. Select export to retry."
                : `${err instanceof Error ? err.message : "Export failed."} Select export to retry.`,
            );
            setState("error");
          } finally {
            window.clearTimeout(timer);
          }
        }}
      >
        {state === "loading" ? "Exporting…" : children}
      </a>
      {error && (
        <span className="export-error" role="alert">
          {error}
        </span>
      )}
      <span className="sr-only" role="status">
        {state === "loading" ? "Preparing CSV download" : ""}
      </span>
    </div>
  );
}
