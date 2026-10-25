import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import App from "./App";
import type { Analysis, Metrics } from "./types";
import { filterIntervals, number } from "./types";

const metrics: Metrics = {
  pairedIntervals: 2,
  expectedIntervals: 48,
  forecastIntervals: 2,
  actualIntervals: 3,
  maeMw: 150,
  biasMw: 50,
  rmseMw: 158,
  p90AbsoluteErrorMw: 190,
  maxOverforecastMw: 200,
  forecastEnergyMwh: null,
  actualEnergyMwh: null,
};
const fixture: Analysis = {
  cutoff: "09:00",
  timezone: "Europe/London",
  metrics,
  days: [
    {
      decisionDate: "2026-01-01",
      deliveryDate: "2026-01-02",
      cutoffTime: "2026-01-01T09:00:00Z",
      metrics,
      intervals: [
        {
          startTime: "2026-01-02T00:00:00Z",
          settlementPeriod: 1,
          forecastMw: 1000,
          actualMw: 800,
          errorMw: 200,
          publishTime: "2026-01-01T08:00:00Z",
          sourceStartTime: "2026-01-02T00:00:00Z",
          leadHours: 16,
        },
        {
          startTime: "2026-01-02T00:30:00Z",
          settlementPeriod: 2,
          forecastMw: 1000,
          actualMw: 1100,
          errorMw: -100,
          publishTime: "2026-01-01T08:00:00Z",
          sourceStartTime: "2026-01-02T00:00:00Z",
          leadHours: 16.5,
        },
        {
          startTime: "2026-01-02T01:00:00Z",
          settlementPeriod: 3,
          forecastMw: null,
          actualMw: 1200,
          errorMw: null,
          publishTime: null,
          leadHours: null,
        },
      ],
    },
    {
      decisionDate: "2026-01-02",
      deliveryDate: "2026-01-03",
      cutoffTime: "2026-01-02T09:00:00Z",
      metrics,
      intervals: [],
    },
  ],
  provenance: {
    retrievedAt: "2026-10-24T10:00:00Z",
    snapshotId: "test-snapshot",
    warnings: [],
    sources: [
      {
        dataset: "WINDFOR",
        url: "https://example.com/forecast-1",
        records: 10,
      },
      {
        dataset: "WINDFOR",
        url: "https://example.com/forecast-2",
        records: 20,
      },
      { dataset: "FUELHH", url: "https://example.com/actual", records: 48 },
    ],
  },
};
const response = (data: Analysis = fixture) =>
  ({ ok: true, json: async () => structuredClone(data) }) as Response;
function setup() {
  const fetchMock = vi.fn().mockResolvedValue(response());
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  return fetchMock;
}
async function ready() {
  await screen.findByRole("heading", { name: "The delivery curve" });
}

describe("decision replay", () => {
  it("keeps hindsight outcomes hidden until explicitly revealed; filters sign and missing values correctly", async () => {
    setup();
    await ready();
    expect(
      screen.queryByRole("columnheader", { name: "Actual · MW" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Error · MW" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Reveal actuals/ }),
    );
    expect(
      screen.getByRole("columnheader", { name: "Actual · MW" }),
    ).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Filter intervals"),
      "shortfall",
    );
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("+200")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Filter intervals"),
      "missing",
    );
    expect(
      within(table).getByRole("button", { name: "01:00 SP 03" }),
    ).toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: "00:00 SP 01" }),
    ).not.toBeInTheDocument();
  });
  it("applies cutoff edits only on submit and exports the applied cutoff", async () => {
    const fetchMock = setup();
    await ready();
    expect(screen.getByRole("button", { name: "Applied ✓" })).toBeDisabled();
    expect(
      screen.getByText(
        "Showing forecasts available by 09:00 UK. Edit the time to compare.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Decision cutoff time"), {
      target: { value: "08:30" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "↓ Export CSV" })).toHaveAttribute(
      "href",
      "/api/export?cutoff=09%3A00&decision_date=2026-01-01",
    );
    await userEvent.click(screen.getByRole("button", { name: /Apply cutoff/ }));
    await ready();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/analysis?cutoff=08%3A30",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("link", { name: "↓ Export CSV" })).toHaveAttribute(
      "href",
      "/api/export?cutoff=08%3A30&decision_date=2026-01-01",
    );
    expect(
      screen.getByText(
        "Showing forecasts available by 08:30 UK. Edit the time to compare.",
      ),
    ).toBeInTheDocument();
  });
  it("aborts an unfinished request on unmount", () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<App />);
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
  it("recovers from an API failure through retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ detail: "Historical snapshot missing" }),
      })
      .mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Historical snapshot missing",
    );
    await userEvent.click(screen.getByText("Method & recovery guidance"));
    expect(
      screen.getByText(/Check that the local Python service/),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Retry analysis/ }),
    );
    await ready();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("navigates from a retrospective review day back to the chosen replay", async () => {
    setup();
    await ready();
    await userEvent.click(
      screen.getByRole("button", { name: "January review" }),
    );
    expect(
      screen.getByText(/Month-wide results were unavailable/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Replay 2 Jan/ }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "2 January 2026",
    );
    expect(
      screen.getByText("No delivery intervals are available for this date."),
    ).toBeInTheDocument();
  });
  it("groups repeated dataset provenance while retaining every official request", async () => {
    setup();
    await ready();
    await userEvent.click(
      screen.getByRole("button", { name: "Method & sources" }),
    );
    expect(screen.getAllByRole("heading", { name: "WINDFOR" })).toHaveLength(1);
    expect(
      screen.getByText("30 source records · 2 requests"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("Inspect all 3 source requests"));
    expect(screen.getAllByRole("link", { name: /request \d/ })).toHaveLength(3);
  });
  it("lets a keyboard user select a chart interval and inspect its publication", async () => {
    setup();
    await ready();
    const chartButton = screen.getByRole("button", {
      name: /00:30, forecast 1,000 MW/,
    });
    fireEvent.keyDown(chartButton, { key: "Enter" });
    expect(chartButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("16.5 h before delivery")).toBeInTheDocument();
    expect(
      screen.getByText("1.0 h old at decision cutoff"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Original forecast hour · 00:00 UK"),
    ).toBeInTheDocument();
  });
  it("distinguishes absolute error magnitude from directional bias in the daily review", async () => {
    setup();
    await ready();
    await userEvent.click(
      screen.getByRole("button", { name: "January review" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "MAE" }));
    expect(screen.getByText("Larger error →")).toBeInTheDocument();
    expect(screen.queryByText("Wind shortfall →")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Replay 1 Jan. MAE 150 megawatts/ }),
    ).toBeInTheDocument();
  });
  it("makes incomplete day coverage explicit in the date selector", async () => {
    setup();
    await ready();
    const day = screen.getByRole("button", {
      name: "1 January 2026. 2 of 48 forecasts available, 46 missing.",
    });
    expect(day).toHaveAttribute("aria-pressed", "true");
  });
  it("turns a stalled analysis into a recoverable timeout", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url, options) =>
            new Promise((_resolve, reject) => {
              options.signal.addEventListener(
                "abort",
                () => reject(new DOMException("Aborted", "AbortError")),
                { once: true },
              );
            }),
        ),
      );
      render(<App />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "longer than 15 seconds",
      );
      expect(
        screen.getByRole("button", { name: /Retry analysis/ }),
      ).toBeEnabled();
      expect(
        screen.getByText("Method & recovery guidance"),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("missing-data presentation", () => {
  it("never formats a missing number as zero and distinguishes positive, negative and missing errors", () => {
    expect(number(null)).toBe("—");
    expect(number(0)).toBe("0");
    expect(
      filterIntervals(fixture.days[0].intervals, "shortfall").map(
        (i) => i.settlementPeriod,
      ),
    ).toEqual([1]);
    expect(
      filterIntervals(fixture.days[0].intervals, "surplus").map(
        (i) => i.settlementPeriod,
      ),
    ).toEqual([2]);
    expect(
      filterIntervals(fixture.days[0].intervals, "missing").map(
        (i) => i.settlementPeriod,
      ),
    ).toEqual([3]);
  });
});
