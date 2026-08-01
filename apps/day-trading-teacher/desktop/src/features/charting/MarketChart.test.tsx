import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BacktestSettings } from "../../domain/backtest";
import { defaultChartWorkspace } from "../../domain/chart-workspace";
import type { MarketDataSet, Trade } from "../../domain/types";
import { MarketChart } from "./MarketChart";

const dataSet: MarketDataSet = {
  id: "chart-test",
  name: "Chart test",
  symbol: "TEST",
  timeframe: "1m",
  sourceType: "sample",
  sourceFile: "built-in",
  importedAt: "2026-07-18T12:00:00.000Z",
  bars: Array.from({ length: 120 }, (_, index) => {
    const close = 100 + index * 0.08 + Math.sin(index / 4);
    return {
      timestamp: new Date(Date.UTC(2026, 0, 1, 9, 30 + index)).toISOString(),
      open: close - 0.15,
      high: close + 0.45,
      low: close - 0.5,
      close,
      volume: 1_000 + index * 10,
    };
  }),
};

const settings: BacktestSettings = {
  fastPeriod: 3,
  slowPeriod: 8,
  direction: "long",
  initialCapital: 10_000,
  riskPerTrade: 25,
  stopPercent: 1,
  rewardMultiple: 2,
  slippagePerShare: 0.01,
  feePerTrade: 0,
};

const recordedTrade: Trade = {
  id: "recorded-chart-trade",
  symbol: "TEST",
  side: "long",
  entry: "103.20",
  exit: "105.10",
  quantity: "10",
  fees: "0",
  planId: "plan-1",
  followedPlan: true,
  respectedStop: true,
  notes: "",
  occurredAt: dataSet.bars[40].timestamp,
  entryAt: dataSet.bars[40].timestamp,
  exitAt: dataSet.bars[60].timestamp,
  grossPnl: "19",
  netPnl: "19",
  rMultiple: "1.5",
  review: {
    processClassification: "strong",
    outcome: "profitable",
    processScore: 90,
    dataQuality: "complete",
    strength: "Waited for confirmation.",
    primaryCorrection: "",
    evidence: [],
    assignedLessonId: "lesson-1",
  },
};

function mockChartBounds(chart: Element) {
  return vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
    width: 1120,
    height: 590,
    left: 0,
    top: 0,
    right: 1120,
    bottom: 590,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

afterEach(cleanup);

describe("MarketChart", () => {
  it("supports view presets, chart styles, and optional overlays", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "50" }));
    expect(screen.getByText(/50 of 120 bars/)).toBeInTheDocument();

    const lineButton = screen.getByRole("button", { name: "Line" });
    fireEvent.click(lineButton);
    expect(lineButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Technical indicators" }),
    );
    expect(
      screen.getByRole("button", { name: "Trade events" }),
    ).toBeInTheDocument();
    const slowOverlay = screen.getByRole("checkbox", { name: "Slow SMA 8" });
    expect(screen.getAllByText("Slow SMA 8")).toHaveLength(2);
    fireEvent.click(slowOverlay);
    expect(screen.getAllByText("Slow SMA 8")).toHaveLength(1);

    const indicators = screen
      .getByRole("button", { name: "Technical indicators" })
      .closest("details");
    const eventsButton = screen.getByRole("button", { name: "Trade events" });
    fireEvent.click(eventsButton);
    expect(eventsButton.closest("details")).toHaveAttribute("open");
    expect(indicators).not.toHaveAttribute("open");
  });

  it("measures bar changes and adds review price levels", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Measure" }));
    fireEvent.change(
      screen.getByRole("slider", { name: "Inspect visible bar" }),
      {
        target: { value: "90" },
      },
    );
    expect(screen.getByText("9 bars back")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Price level" }));
    expect(screen.getByText(/Review ·/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("keeps wheel zoom inside the chart and preserves the pointer context", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Inspect visible bar" });
    fireEvent.change(slider, { target: { value: "40" } });
    const selectedClose = dataSet.bars[60].close.toFixed(2);
    expect(screen.getAllByText(selectedClose).length).toBeGreaterThan(0);

    const chart = screen.getByRole("group", {
      name: /TEST interactive candles chart/,
    });
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 500,
      deltaY: -100,
    });
    fireEvent(chart, wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByText(/98 of 120 bars/)).toBeInTheDocument();
    expect(screen.getAllByText(selectedClose).length).toBeGreaterThan(0);
  });

  it("tracks the pointer to the nearest plotted candle and exposes candle detail", async () => {
    const { container } = render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    const chart = screen.getByRole("group", {
      name: /TEST interactive candles chart/,
    });
    mockChartBounds(chart);
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperties(pointerMove, {
      clientX: { value: 128 },
      clientY: { value: 180 },
    });
    fireEvent(chart, pointerMove);

    await waitFor(() =>
      expect(screen.getByText("11 / 100")).toBeInTheDocument(),
    );
    expect(container.querySelector("g.candle title")?.textContent).toMatch(
      /O .* · H .* · L .* · C .* · Vol/,
    );
  });

  it("makes recorded trade markers directly inspectable by pointer and keyboard", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[recordedTrade]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "TEST recorded entry 103.20. Inspect this bar.",
      }),
    );
    expect(screen.getByText("21 / 100")).toBeInTheDocument();

    const exitMarker = screen.getByRole("button", {
      name: "TEST recorded exit 105.10. Inspect this bar.",
    });
    exitMarker.focus();
    fireEvent.keyDown(exitMarker, { key: "Enter" });
    expect(screen.getByText("41 / 100")).toBeInTheDocument();
  });

  it("switches studies and exposes advanced indicators without cluttering defaults", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Lower chart study" }),
      { target: { value: "rsi" } },
    );
    expect(
      screen.getByRole("group", {
        name: /with rsi study and recorded and simulated trade markers/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Technical indicators" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "VWAP / rolling VWAP" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Bollinger Bands 20, 2" }),
    );
    expect(screen.getByText("VWAP")).toBeInTheDocument();
    expect(screen.getByText("Bollinger 20, 2")).toBeInTheDocument();
  });

  it("applies professional chart templates and hollow candles", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Chart template" }), {
      target: { value: "trend" },
    });

    expect(screen.getByRole("button", { name: "Hollow" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("combobox", { name: "Lower chart study" }),
    ).toHaveValue("macd");
    expect(
      screen.getByRole("group", { name: /interactive hollow chart/ }),
    ).toBeInTheDocument();
  });

  it("compares shared timestamps with normalized performance", () => {
    const comparison: MarketDataSet = {
      ...dataSet,
      id: "comparison",
      symbol: "COMP",
      name: "Comparison",
      bars: dataSet.bars.map((bar, index) => ({
        ...bar,
        close: 50 + index * 0.2,
      })),
    };
    render(
      <MarketChart
        dataSet={dataSet}
        comparisonDataSets={[comparison]}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Compare symbol" }), {
      target: { value: comparison.id },
    });
    expect(
      screen.getByRole("group", { name: /compared with COMP/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/COMP \+/).length).toBeGreaterThan(0);
  });

  it("customizes scale, crosshair, and grid presentation", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Chart appearance settings" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Log" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Grid lines" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Crosshair" }));

    expect(
      screen.getByRole("group", { name: /log scale/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Log scale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crosshair" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("compresses regular-session candles and navigates only plotted bars", async () => {
    const sessionData: MarketDataSet = {
      ...dataSet,
      id: "session-chart-test",
      bars: [
        "2026-07-20T12:00:00.000Z",
        "2026-07-20T13:00:00.000Z",
        "2026-07-20T13:30:00.000Z",
        "2026-07-20T14:00:00.000Z",
        "2026-07-20T19:59:00.000Z",
        "2026-07-20T20:30:00.000Z",
      ].map((timestamp, index) => ({
        timestamp,
        open: 100 + index,
        high: 101 + index,
        low: 99 + index,
        close: 100.5 + index,
        volume: 1_000 + index,
      })),
    };
    const { container } = render(
      <MarketChart
        dataSet={sessionData}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    expect(container.querySelectorAll("g.candle")).toHaveLength(6);
    fireEvent.click(
      screen.getByRole("button", { name: "Chart appearance settings" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Extended-hours bars" }),
    );

    expect(container.querySelectorAll("g.candle")).toHaveLength(3);
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    const hitAreas = Array.from(
      container.querySelectorAll<SVGRectElement>(".candle-hit"),
    );
    expect(
      Number(hitAreas[1].getAttribute("x")) -
        Number(hitAreas[0].getAttribute("x")),
    ).toBeGreaterThan(300);

    const chart = screen.getByRole("group", {
      name: /TEST interactive candles chart/,
    });
    mockChartBounds(chart);
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperties(pointerMove, {
      clientX: { value: 190 },
      clientY: { value: 180 },
    });
    fireEvent(chart, pointerMove);
    await waitFor(() => expect(screen.getByText("1 / 3")).toBeInTheDocument());
    fireEvent.keyDown(chart, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("hides future bars for replay and reveals one bar at a time", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(screen.getByText("Future-hidden replay")).toBeInTheDocument();
    expect(screen.getByText(/30 of 30 bars/)).toBeInTheDocument();
    expect(screen.getByText(/90 bars hidden/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reveal next bar" }));
    expect(screen.getByText(/30 of 31 bars/)).toBeInTheDocument();
    expect(screen.getByText(/89 bars hidden/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reveal all" }));
    expect(screen.getByText(/100 of 120 bars/)).toBeInTheDocument();
  });

  it("offers direct fine zoom and chart drawing guidance", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText(/98 of 120 bars/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trend line" }));
    expect(
      screen.getByText("Select the starting candle for the trend line."),
    ).toBeInTheDocument();
  });

  it("starts a future-hidden local paper session with explicit safeguards", () => {
    const onPaperSessionChange = vi.fn();
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
        paperHistory={[]}
        paperDefaults={{
          startingBalance: 10_000,
          maxRiskPerTrade: 25,
          dailyLossLimit: 75,
          slippagePerShare: 0.01,
          commissionPerOrder: 0,
        }}
        onPaperSessionChange={onPaperSessionChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Paper trade" }));
    expect(
      screen.getByText("Practice decisions, not clicks"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No brokerage credentials, live orders/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "TEST" }).parentElement
        ?.nextElementSibling,
    ).toHaveTextContent("90 future hidden");

    fireEvent.click(
      screen.getByRole("button", { name: "Start paper session" }),
    );
    expect(onPaperSessionChange).toHaveBeenCalledTimes(1);
    expect(onPaperSessionChange.mock.calls[0][0]).toMatchObject({
      dataSetId: dataSet.id,
      status: "active",
      replayIndex: 29,
      startingBalance: 10_000,
      maxRiskPerTrade: 25,
      dailyLossLimit: 75,
    });
  });

  it("keeps daily candles visible when a saved intraday session filter is off", () => {
    const dailyData: MarketDataSet = {
      ...dataSet,
      id: "daily-chart-test",
      timeframe: "1d",
    };
    const { container } = render(
      <MarketChart
        dataSet={dailyData}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
        chartPreferences={{
          ...defaultChartWorkspace,
          extendedHours: false,
        }}
      />,
    );

    expect(container.querySelectorAll("g.candle")).toHaveLength(100);
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
  });

  it("supports horizontal trackpad panning without changing zoom", () => {
    render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show older bars" }));
    const timeline = screen.getByRole("slider", { name: "Pan chart timeline" });
    expect((timeline as HTMLInputElement).value).toBe("100");
    const chart = screen.getByRole("group", {
      name: /TEST interactive candles chart/,
    });
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 80,
      deltaY: 0,
    });
    fireEvent(chart, wheel);

    expect(wheel.defaultPrevented).toBe(true);
    expect((timeline as HTMLInputElement).value).toBe("120");
    expect(screen.getByText(/100 of 120 bars/)).toBeInTheDocument();
  });

  it("delegates candle selection and keeps marker Space from toggling replay", () => {
    const { container } = render(
      <MarketChart
        dataSet={dataSet}
        recordedTrades={[recordedTrade]}
        simulationTrades={[]}
        settings={settings}
      />,
    );

    const hitAreas = container.querySelectorAll<SVGRectElement>(".candle-hit");
    fireEvent.click(hitAreas[1]);
    expect(screen.getByText("2 / 100")).toBeInTheDocument();

    const marker = screen.getByRole("button", {
      name: "TEST recorded entry 103.20. Inspect this bar.",
    });
    marker.focus();
    fireEvent.keyDown(marker, { key: " " });
    expect(screen.queryByText("Future-hidden replay")).not.toBeInTheDocument();
    expect(screen.getByText("21 / 100")).toBeInTheDocument();
  });
});
