import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ExportLink } from "./ExportLink";

describe("CSV export", () => {
  it("shows progress, reports a failed export, and lets the user retry the download", async () => {
    let finish: (value: unknown) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        blob: async () =>
          new Blob(["decision_date,forecast_mw\n2026-01-01,18781"]),
      });
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:windshift-test");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(
      <ExportLink href="/api/export?cutoff=09%3A00" filename="windshift.csv">
        Export CSV
      </ExportLink>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Export CSV" }));
    expect(screen.getByRole("link", { name: "Exporting…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await act(async () => {
      finish({ ok: false, status: 503 });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Export failed (HTTP 503)",
    );
    await userEvent.click(screen.getByRole("link", { name: "Export CSV" }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(click).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
