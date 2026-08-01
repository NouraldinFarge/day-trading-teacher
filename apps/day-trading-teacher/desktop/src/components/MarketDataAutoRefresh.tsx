import { useEffect, useRef } from "react";
import {
  createProviderMarketDataSet,
  providerDetails,
  providerRefreshMinutes,
} from "../domain/market-data-acquisition";
import {
  fetchMarketData,
  getMarketDataProviderStatus,
  isTauri,
} from "../platform/bridge";
import { useAppState } from "../state/AppStateContext";

export function MarketDataAutoRefresh() {
  const { ready, state, addMarketDataSet, updateChartAcquisition } =
    useAppState();
  const inFlight = useRef(false);
  const settings = state.chartAcquisition;
  const subscriptionsKey =
    settings?.subscriptions
      .map((item) => `${item.provider}:${item.symbol}:${item.interval}`)
      .join("|") ?? "";

  useEffect(() => {
    if (
      !ready ||
      !isTauri() ||
      !settings?.autoRefresh ||
      settings.subscriptions.length === 0
    )
      return;

    const refreshIfDue = async () => {
      if (inFlight.current) return;
      const now = Date.now();
      const dailyLast = settings.lastDailyRefreshAt
        ? Date.parse(settings.lastDailyRefreshAt)
        : 0;
      const intradayLast = settings.lastOneMinuteRefreshAt
        ? Date.parse(settings.lastOneMinuteRefreshAt)
        : 0;
      const due = settings.subscriptions.filter((subscription) => {
        const last =
          subscription.interval === "daily" ? dailyLast : intradayLast;
        return (
          !Number.isFinite(last) ||
          now - last >=
            providerRefreshMinutes(
              subscription.provider,
              subscription.interval,
            ) *
              60_000
        );
      });
      if (!due.length) return;
      inFlight.current = true;
      try {
        let refreshed = 0;
        const failures: string[] = [];
        for (const request of due) {
          try {
            const status = await getMarketDataProviderStatus(request.provider);
            if (!status.configured)
              throw new Error("Credentials not configured");
            const csv = await fetchMarketData(
              request.provider,
              request.symbol,
              request.interval,
            );
            addMarketDataSet(
              createProviderMarketDataSet(
                request.provider,
                request.symbol,
                csv,
                request.interval,
              ),
            );
            refreshed += 1;
          } catch {
            failures.push(
              `${providerDetails(request.provider).shortName} ${request.symbol} ${request.interval === "1min" ? "1m" : "1d"}`,
            );
          }
        }
        const checkedAt = new Date().toISOString();
        const dailyChecked = due.some((item) => item.interval === "daily");
        const intradayChecked = due.some((item) => item.interval === "1min");
        const message = failures.length
          ? `Refreshed ${refreshed} chart${refreshed === 1 ? "" : "s"}; ${failures.join(", ")} could not be updated.`
          : `Automatically refreshed ${refreshed} chart${refreshed === 1 ? "" : "s"}.`;
        updateChartAcquisition({
          ...settings,
          lastRefreshAt: checkedAt,
          lastDailyRefreshAt: dailyChecked
            ? checkedAt
            : settings.lastDailyRefreshAt,
          lastOneMinuteRefreshAt: intradayChecked
            ? checkedAt
            : settings.lastOneMinuteRefreshAt,
          lastRefreshMessage: message,
        });
      } finally {
        inFlight.current = false;
      }
    };

    void refreshIfDue();
    const timer = window.setInterval(() => void refreshIfDue(), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [
    ready,
    settings?.autoRefresh,
    settings?.lastDailyRefreshAt,
    settings?.lastOneMinuteRefreshAt,
    subscriptionsKey,
    addMarketDataSet,
    updateChartAcquisition,
  ]);

  return null;
}
