import { parseMarketDataCsv } from "./market-data";
import type {
  ChartAcquisitionSubscription,
  MarketDataProvider,
  MarketDataSet,
} from "./types";

export const MAX_ACQUISITION_SYMBOLS = 5;
export type MarketDataInterval = "daily" | "1min";

export type MarketDataProviderDetails = {
  id: MarketDataProvider;
  name: string;
  shortName: string;
  credentialLabel: string;
  secretLabel?: string;
  freeOneMinute: boolean;
  freshness: string;
  feed: string;
  session: "regular" | "extended";
  description: string;
  oneMinuteNote: string;
};

export const MARKET_DATA_PROVIDERS: MarketDataProviderDetails[] = [
  {
    id: "massive",
    name: "Massive (formerly Polygon)",
    shortName: "Massive",
    credentialLabel: "API key",
    freeOneMinute: true,
    freshness: "End of day on the free plan",
    feed: "Consolidated US market",
    session: "extended",
    description:
      "Best free source for consolidated historical one-minute backtests. The free individual plan offers two years; this app downloads a recent slice and retains the newest 20,000 bars.",
    oneMinuteNote:
      "Free one-minute bars become available after the trading day ends. This is historical context, not a live quote feed.",
  },
  {
    id: "alpaca",
    name: "Alpaca Basic",
    shortName: "Alpaca",
    credentialLabel: "API key ID",
    secretLabel: "Secret key",
    freeOneMinute: true,
    freshness: "IEX real time; REST history excludes the latest 15 minutes",
    feed: "IEX",
    session: "extended",
    description:
      "Useful free deep history and frequent refreshes. Free equity bars use the IEX feed, so volume and candles can differ from consolidated Fidelity charts.",
    oneMinuteNote:
      "Free one-minute bars are IEX-sourced. Keep the provider badge visible when comparing them with Fidelity or consolidated feeds.",
  },
  {
    id: "tradier",
    name: "Tradier Brokerage",
    shortName: "Tradier",
    credentialLabel: "Access token",
    freeOneMinute: true,
    freshness: "Real time for brokerage account holders",
    feed: "Consolidated US market",
    session: "extended",
    description:
      "Best account-included source for recent consolidated bars. API access requires a Tradier Brokerage account and is used for market data only.",
    oneMinuteNote:
      "One-minute history is limited to 20 regular-session days or 10 days when extended hours are included.",
  },
  {
    id: "alpha_vantage",
    name: "Alpha Vantage",
    shortName: "Alpha Vantage",
    credentialLabel: "API key",
    freeOneMinute: false,
    freshness: "Depends on provider entitlement",
    feed: "Provider aggregate",
    session: "extended",
    description:
      "Retained for existing users and daily bars. Alpha Vantage marks its one-minute intraday endpoint as premium.",
    oneMinuteNote:
      "One-minute history requires an Alpha Vantage plan that includes the premium intraday endpoint.",
  },
];

export function providerDetails(provider: MarketDataProvider) {
  return (
    MARKET_DATA_PROVIDERS.find((candidate) => candidate.id === provider) ??
    MARKET_DATA_PROVIDERS[0]
  );
}

export function normalizeMarketSymbol(value: string) {
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,16}$/.test(symbol))
    throw new Error(
      "Use a valid symbol containing letters, numbers, a period, or a hyphen.",
    );
  return symbol;
}

export function providerDataSetId(
  provider: MarketDataProvider,
  symbol: string,
  interval: MarketDataInterval = "daily",
) {
  return `provider-${provider.replaceAll("_", "-")}-${normalizeMarketSymbol(symbol).toLowerCase()}-${interval}`;
}

export function createProviderMarketDataSet(
  provider: MarketDataProvider,
  symbolInput: string,
  csv: string,
  interval: MarketDataInterval = "daily",
  importedAt = new Date().toISOString(),
): MarketDataSet {
  const symbol = normalizeMarketSymbol(symbolInput);
  const details = providerDetails(provider);
  const parsed = parseMarketDataCsv(
    csv,
    interval === "1min" ? { assumeTimeZone: "America/New_York" } : undefined,
  );
  return {
    id: providerDataSetId(provider, symbol, interval),
    name: `${symbol} ${details.shortName} ${interval === "1min" ? "one-minute" : "daily"} chart`,
    symbol,
    timeframe: interval === "1min" ? "1m" : parsed.timeframe,
    sourceType: "provider",
    sourceFile: `${details.name} · ${details.feed}`,
    importedAt,
    bars: parsed.bars,
    provider,
    feed: details.feed,
    freshness: details.freshness,
    session: details.session,
    adjusted: provider === "massive" || provider === "alpaca",
  };
}

export function addAcquisitionSubscription(
  subscriptions: ChartAcquisitionSubscription[],
  provider: MarketDataProvider,
  symbolInput: string,
  interval: MarketDataInterval,
) {
  const symbol = normalizeMarketSymbol(symbolInput);
  const next = subscriptions.filter(
    (candidate) =>
      !(
        candidate.provider === provider &&
        candidate.symbol === symbol &&
        candidate.interval === interval
      ),
  );
  if (next.length >= MAX_ACQUISITION_SYMBOLS) {
    throw new Error(
      `The automatic chart watchlist is limited to ${MAX_ACQUISITION_SYMBOLS} provider, symbol, and interval combinations.`,
    );
  }
  return [{ provider, symbol, interval }, ...next];
}

export function removeAcquisitionSubscription(
  subscriptions: ChartAcquisitionSubscription[],
  target: ChartAcquisitionSubscription,
) {
  return subscriptions.filter(
    (candidate) =>
      !(
        candidate.provider === target.provider &&
        candidate.symbol === target.symbol &&
        candidate.interval === target.interval
      ),
  );
}

export function providerRefreshMinutes(
  provider: MarketDataProvider,
  interval: MarketDataInterval,
) {
  if (interval === "daily" || provider === "massive") return 24 * 60;
  if (provider === "tradier") return 15;
  return 30;
}
