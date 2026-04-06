/**
 * Calculate Simple Moving Average
 * @returns {Array} [{time, value}]
 */
export const calcSMA = (candles, period) => {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
};

/**
 * Calculate Exponential Moving Average (uses SMA seed)
 * @returns {Array} [{time, value}]
 */
export const calcEMA = (candles, period) => {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const seed = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  const result = [{ time: candles[period - 1].time, value: seed }];
  let prev = seed;
  for (let i = period; i < candles.length; i++) {
    const val = candles[i].close * k + prev * (1 - k);
    result.push({ time: candles[i].time, value: val });
    prev = val;
  }
  return result;
};

/**
 * Calculate RSI using Wilder's smoothing method
 * @returns {Array} [{time, value}]  value in range [0, 100]
 */
export const calcRSI = (candles, period = 14) => {
  if (candles.length < period + 1) return [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  const toRSI = (g, l) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  const result = [{ time: candles[period].time, value: toRSI(avgGain, avgLoss) }];
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push({ time: candles[i].time, value: toRSI(avgGain, avgLoss) });
  }
  return result;
};
