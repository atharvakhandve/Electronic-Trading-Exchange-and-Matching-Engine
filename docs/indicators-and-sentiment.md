# Technical Indicators & News Sentiment Analysis

## Table of Contents
1. [SMA 20 — Simple Moving Average (20-period)](#sma-20)
2. [SMA 50 — Simple Moving Average (50-period)](#sma-50)
3. [EMA 9 — Exponential Moving Average (9-period)](#ema-9)
4. [RSI — Relative Strength Index (14-period)](#rsi-14)
5. [News Sentiment Analysis](#news-sentiment-analysis)

---

## SMA 20

### What it is
The Simple Moving Average smooths out price noise by averaging the closing price of the last N candles. The **20-period SMA** (amber line on the chart) tracks short-to-medium-term momentum — roughly 20 minutes of activity on a 1-minute chart.

### Formula
```
SMA(n) = (Close₁ + Close₂ + ... + Closeₙ) / n
```
Every bar simply recalculates the arithmetic mean of the last 20 closing prices. All periods are weighted equally.

### Our implementation (`indicators.js`)
```js
export const calcSMA = (candles, period) => {
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    const sum = candles
      .slice(i - period + 1, i + 1)
      .reduce((s, c) => s + c.close, 0);
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
};
```
- Iterates from index `period - 1` onward so there are always exactly `period` candles available.
- Uses `.slice()` to get the window and `.reduce()` to sum the closing prices.
- Returns `[{ time, value }]` — the format expected by `lightweight-charts`.
- `calcSMA(candles, 20)` is passed to the SMA 20 series; `calcSMA(candles, 50)` to SMA 50.

### How to read it
| Price relative to SMA 20 | Interpretation |
|---|---|
| Price above SMA 20 | Short-term bullish momentum |
| Price below SMA 20 | Short-term bearish pressure |
| Price crosses above | Potential buy signal |
| Price crosses below | Potential sell signal |

---

## SMA 50

### What it is
The **50-period SMA** (blue line) is the medium-term trend baseline. On a 1-minute chart it covers approximately the last 50 minutes; on a 5-minute chart, ~4 hours. It moves more slowly than SMA 20 and is less reactive to short-term noise.

### Formula
Identical to SMA 20 — only the period changes:
```
SMA(50) = (Close₁ + Close₂ + ... + Close₅₀) / 50
```

### Our implementation
Same `calcSMA` function called with `period = 50`:
```js
sma50Ref.current.setData(calcSMA(data, 50));
```

### How to read it
- **SMA 20 crosses above SMA 50** — "Golden Cross": medium-term bullish signal.
- **SMA 20 crosses below SMA 50** — "Death Cross": medium-term bearish signal.
- Price consistently above both SMAs signals a strong uptrend; below both signals a downtrend.

---

## EMA 9

### What it is
The Exponential Moving Average gives **more weight to recent candles** than older ones, making it faster to react to price changes than an SMA of the same period. The **9-period EMA** (violet line) is commonly used as a short-term signal line for momentum entries.

### Formula
```
Multiplier k = 2 / (period + 1)  →  k = 2/10 = 0.2 for EMA 9

EMA(today) = Close(today) × k + EMA(yesterday) × (1 - k)
```
The first EMA value (the "seed") is calculated as a plain SMA of the first 9 candles. Every subsequent bar applies the above recurrence.

### Our implementation (`indicators.js`)
```js
export const calcEMA = (candles, period) => {
  if (candles.length < period) return [];

  const k    = 2 / (period + 1);                                     // smoothing factor
  const seed = candles.slice(0, period)
                      .reduce((s, c) => s + c.close, 0) / period;    // SMA seed

  const result = [{ time: candles[period - 1].time, value: seed }];
  let prev = seed;

  for (let i = period; i < candles.length; i++) {
    const val = candles[i].close * k + prev * (1 - k);
    result.push({ time: candles[i].time, value: val });
    prev = val;
  }
  return result;
};
```
- `k = 2 / (9 + 1) = 0.2` — each new close contributes 20% weight; the prior EMA carries 80%.
- The seed is an SMA so the EMA series starts at a meaningful value rather than zero.

### How to read it
- EMA 9 hugs price tightly — it turns up/down quickly on momentum shifts.
- Traders watch for price to reclaim EMA 9 after a pullback as a re-entry signal.
- Used alongside SMA 20: when EMA 9 > SMA 20, short-term momentum is bullish.

---

## RSI (14)

### What it is
The **Relative Strength Index** is a momentum oscillator that measures how overbought or oversold an asset is on a scale of **0 to 100**. It compares the magnitude of recent gains to recent losses over a 14-candle lookback.

### Formula (Wilder's smoothing method)
```
Step 1 — Seed (first 14 bars):
  AvgGain = sum of gains over 14 periods / 14
  AvgLoss = sum of losses over 14 periods / 14

Step 2 — Rolling update (every subsequent bar):
  AvgGain = (AvgGain × 13 + currentGain) / 14
  AvgLoss = (AvgLoss × 13 + currentLoss) / 14

Step 3:
  RS  = AvgGain / AvgLoss
  RSI = 100 - (100 / (1 + RS))
```
When `AvgLoss = 0`, RSI is set to 100 (pure upward momentum).

### Our implementation (`indicators.js`)
```js
export const calcRSI = (candles, period = 14) => {
  if (candles.length < period + 1) return [];

  let avgGain = 0, avgLoss = 0;

  // Seed: plain average over first `period` price changes
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const toRSI = (g, l) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  const result = [{ time: candles[period].time, value: toRSI(avgGain, avgLoss) }];

  // Wilder's smoothing for every subsequent candle
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push({ time: candles[i].time, value: toRSI(avgGain, avgLoss) });
  }
  return result;
};
```

### RSI Panel rendering (`RSIPanel.jsx`)
- Rendered as a **separate chart** below the main candle chart using `lightweight-charts`.
- Time axis is hidden — it shares visual alignment with the main chart above.
- Requires at least **16 candles** (`period + 1 + 1`) before rendering; shows "Not enough candles" otherwise.
- Three static reference lines are drawn:

| Level | Color | Meaning |
|---|---|---|
| **70** | Red | Overbought — price may be due for a pullback |
| **50** | Grey | Midline — bullish above, bearish below |
| **30** | Green | Oversold — potential buying opportunity |

- The header badge updates in real time: shows the current RSI value and the label **OVERBOUGHT / NEUTRAL / OVERSOLD**.

---

## News Sentiment Analysis

### Overview
The News & Sentiment panel fetches recent news headlines for a given symbol (AAPL by default) and classifies each headline as **Bullish**, **Neutral**, or **Bearish** using NLP. Results are aggregated into an overall market sentiment score shown alongside the individual articles.

### Architecture

```
Browser (NewsSentiment.jsx)
        │  GET /news/AAPL
        ▼
FastAPI  (api.py — /news/{symbol})
        │
        ├── 1. Cache check  (5-minute TTL)
        │
        ├── 2. NewsAPI      (fetch 10 latest headlines)
        │
        ├── 3. VADER + Financial Keyword Boost  (score each headline)
        │
        └── 4. Majority vote  →  overall sentiment + summary
```

### Step 1 — Server-side cache
Results are stored in a Python dict `_news_cache` keyed by symbol. The TTL is **5 minutes** (`_NEWS_TTL = 300`). Cached data is served immediately without hitting external APIs, reducing latency and respecting rate limits.

### Step 2 — NewsAPI headline fetch
The backend calls `newsapi.org/v2/everything` with:
- `q = symbol` (e.g. "AAPL")
- `language = "en"`
- `sortBy = publishedAt` (most recent first)
- `pageSize = 10`

Articles with missing titles or `[Removed]` content are filtered out. A maximum of **10 articles** are processed.

### Step 3 — VADER sentiment with financial keyword boost

**VADER** (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based NLP library tuned for short texts like news headlines. It produces a `compound` score in the range `[-1.0, +1.0]`.

Because standard VADER was trained on general social media text, it under-weights financial jargon. We apply a domain-specific boost:

```python
_BULLISH_WORDS = { "surge", "rally", "gain", "beat", "upgrade", "bullish", ... }
_BEARISH_WORDS = { "drop", "decline", "loss", "miss", "downgrade", "bearish", ... }

bull_hits = len(words & _BULLISH_WORDS)
bear_hits = len(words & _BEARISH_WORDS)

compound = compound + 0.15 * bull_hits - 0.15 * bear_hits
compound = max(-1.0, min(1.0, compound))  # clamp to valid range
```

Each matched bullish word shifts the compound score **+0.15**; each bearish word shifts it **−0.15**.

**Label assignment:**
| Compound range | Label | Confidence formula |
|---|---|---|
| `≥ 0.05` | bullish | `(compound + 1) / 2` |
| `≤ -0.05` | bearish | `(1 - compound) / 2` |
| `(-0.05, 0.05)` | neutral | `1 - abs(compound) × 10` |

Confidence is floored at **0.50** so weak signals don't show unrealistically low values.

### Step 4 — Majority vote aggregation

```python
def _majority_sentiment(labels):
    counts = {"bullish": 0, "neutral": 0, "bearish": 0}
    for lbl in labels:
        counts[lbl] += 1
    overall = max(counts, key=counts.__getitem__)   # label with most votes
    confidence = counts[overall] / len(labels)      # fraction of headlines that agree
    return overall, confidence
```

The overall sentiment is whichever label appears most across all scored headlines. Confidence is the proportion of headlines that agreed with the majority.

### Step 5 — Summary generation
An analyst-style summary sentence is assembled from the directional count and the strongest headline for each direction:

```
"Sentiment is leaning bullish (7/10 headlines positive).
 Bullish signal: "Apple beats earnings estimates, revenue surges 12%…"
 Bearish signal: "iPhone shipment concerns raise supply chain red flags…""
```

### Frontend (`NewsSentiment.jsx`)
- Fetches on mount and **auto-refreshes every 5 minutes** (matching the server-side cache TTL).
- Displays an aggregate sentiment card with: overall label badge, confidence percentage + progress bar, bullish/neutral/bearish pill counts, and the summary text.
- Each article is shown with its individual sentiment badge, headline (linked to source), publisher name, and relative publish time.
- Manual **Refresh** button triggers an immediate re-fetch.
