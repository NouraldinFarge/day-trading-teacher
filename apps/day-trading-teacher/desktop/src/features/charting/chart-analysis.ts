import type { MarketBar } from "../../domain/types";

export type BollingerBands = {
  middle: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
};

function validPeriod(period: number) {
  return Math.max(1, Math.round(period));
}

export function exponentialMovingAverage(bars: MarketBar[], period: number) {
  const length = validPeriod(period);
  const result: Array<number | null> = Array(bars.length).fill(null);
  if (bars.length < length) return result;

  let seed = 0;
  for (let index = 0; index < length; index += 1) seed += bars[index].close;
  let value = seed / length;
  result[length - 1] = value;
  const multiplier = 2 / (length + 1);
  for (let index = length; index < bars.length; index += 1) {
    value = (bars[index].close - value) * multiplier + value;
    result[index] = value;
  }
  return result;
}

function exponentialAverage(values: Array<number | null>, period: number) {
  const length = validPeriod(period);
  const result: Array<number | null> = Array(values.length).fill(null);
  const multiplier = 2 / (length + 1);
  let count = 0;
  let seed = 0;
  let value: number | null = null;
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (current === null) continue;
    count += 1;
    if (value === null) {
      seed += current;
      if (count < length) continue;
      value = seed / length;
    } else {
      value = (current - value) * multiplier + value;
    }
    result[index] = value;
  }
  return result;
}

export function movingAverageConvergenceDivergence(
  bars: MarketBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  const fast = exponentialMovingAverage(bars, fastPeriod);
  const slow = exponentialMovingAverage(bars, slowPeriod);
  const macd = bars.map((_, index) =>
    fast[index] === null || slow[index] === null
      ? null
      : fast[index]! - slow[index]!,
  );
  const signal = exponentialAverage(macd, signalPeriod);
  const histogram = macd.map((value, index) =>
    value === null || signal[index] === null ? null : value - signal[index]!,
  );
  return { macd, signal, histogram };
}

export function bollingerBands(
  bars: MarketBar[],
  period = 20,
  deviation = 2,
): BollingerBands {
  const length = validPeriod(period);
  const middle: Array<number | null> = Array(bars.length).fill(null);
  const upper: Array<number | null> = Array(bars.length).fill(null);
  const lower: Array<number | null> = Array(bars.length).fill(null);
  if (bars.length < length) return { middle, upper, lower };

  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < bars.length; index += 1) {
    const close = bars[index].close;
    sum += close;
    sumSquares += close * close;
    if (index >= length) {
      const removed = bars[index - length].close;
      sum -= removed;
      sumSquares -= removed * removed;
    }
    if (index < length - 1) continue;
    const average = sum / length;
    const variance = Math.max(0, sumSquares / length - average * average);
    const band = Math.sqrt(variance) * deviation;
    middle[index] = average;
    upper[index] = average + band;
    lower[index] = average - band;
  }
  return { middle, upper, lower };
}

export function averageTrueRange(bars: MarketBar[], period = 14) {
  const length = validPeriod(period);
  const result: Array<number | null> = Array(bars.length).fill(null);
  if (bars.length < length) return result;

  const trueRanges = bars.map((bar, index) => {
    if (index === 0) return bar.high - bar.low;
    const previousClose = bars[index - 1].close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previousClose),
      Math.abs(bar.low - previousClose),
    );
  });
  let value = 0;
  for (let index = 0; index < length; index += 1) value += trueRanges[index];
  value /= length;
  result[length - 1] = value;
  for (let index = length; index < bars.length; index += 1) {
    value = (value * (length - 1) + trueRanges[index]) / length;
    result[index] = value;
  }
  return result;
}

export function relativeStrengthIndex(bars: MarketBar[], period = 14) {
  const length = validPeriod(period);
  const result: Array<number | null> = Array(bars.length).fill(null);
  if (bars.length <= length) return result;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= length; index += 1) {
    const change = bars[index].close - bars[index - 1].close;
    averageGain += Math.max(0, change);
    averageLoss += Math.max(0, -change);
  }
  averageGain /= length;
  averageLoss /= length;

  const toRsi = () => {
    if (averageGain === 0 && averageLoss === 0) return 50;
    if (averageLoss === 0) return 100;
    return 100 - 100 / (1 + averageGain / averageLoss);
  };
  result[length] = toRsi();
  for (let index = length + 1; index < bars.length; index += 1) {
    const change = bars[index].close - bars[index - 1].close;
    averageGain = (averageGain * (length - 1) + Math.max(0, change)) / length;
    averageLoss = (averageLoss * (length - 1) + Math.max(0, -change)) / length;
    result[index] = toRsi();
  }
  return result;
}

export function volumeWeightedAveragePrice(bars: MarketBar[], period = 20) {
  const result: Array<number | null> = Array(bars.length).fill(null);
  if (!bars.length) return result;
  const length = validPeriod(period);
  const intraday =
    bars.length > 1 &&
    Math.abs(
      new Date(bars[1].timestamp).getTime() -
        new Date(bars[0].timestamp).getTime(),
    ) <
      12 * 60 * 60 * 1000;
  let priceVolume = 0;
  let volume = 0;
  let session = "";
  const window: Array<{ priceVolume: number; volume: number }> = [];

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    const nextSession = bar.timestamp.slice(0, 10);
    if (intraday && session && nextSession !== session) {
      priceVolume = 0;
      volume = 0;
      window.length = 0;
    }
    session = nextSession;
    const barVolume = Math.max(0, bar.volume ?? 0);
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const weighted = typicalPrice * barVolume;
    priceVolume += weighted;
    volume += barVolume;
    window.push({ priceVolume: weighted, volume: barVolume });
    if (!intraday && window.length > length) {
      const removed = window.shift()!;
      priceVolume -= removed.priceVolume;
      volume -= removed.volume;
    }
    result[index] = volume > 0 ? priceVolume / volume : null;
  }
  return result;
}

export function compactVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  if (Math.abs(value) >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}
