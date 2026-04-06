import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import useColors from "../../theme/useColors.js";

const W = 1000, H = 220, PAD_X = 10, PAD_Y = 24;

const DepthChart = ({ bids = [], asks = [] }) => {
  const c = useColors();

  const { bidPath, askPath, bidStroke, askStroke, midX, labels, isEmpty } = useMemo(() => {
    if (!bids.length && !asks.length) return { isEmpty: true };

    // Sort and accumulate
    const sortedBids = [...bids].sort((a, b) => b[0] - a[0]); // DESC price
    const sortedAsks = [...asks].sort((a, b) => a[0] - b[0]); // ASC  price

    let cumVol = 0;
    const cumBids = sortedBids.map(([p, q]) => { cumVol += q; return [p / 100, cumVol]; });
    cumVol = 0;
    const cumAsks = sortedAsks.map(([p, q]) => { cumVol += q; return [p / 100, cumVol]; });

    const allPrices = [...cumBids.map(b => b[0]), ...cumAsks.map(a => a[0])];
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const maxV = Math.max(...cumBids.map(b => b[1]), ...cumAsks.map(a => a[1]), 1);
    const priceSpan = maxP - minP || 1;

    const xS = (p) => PAD_X + ((p - minP) / priceSpan) * (W - PAD_X * 2);
    const yS = (v) => H - PAD_Y - (v / maxV) * (H - PAD_Y * 2);
    const bottom = H - PAD_Y;

    // Build bid path (staircase going left from best bid)
    let bidPath = "";
    if (cumBids.length) {
      bidPath = `M ${xS(cumBids[0][0])} ${bottom}`;
      bidPath += ` L ${xS(cumBids[0][0])} ${yS(cumBids[0][1])}`;
      for (let i = 1; i < cumBids.length; i++) {
        bidPath += ` L ${xS(cumBids[i][0])} ${yS(cumBids[i - 1][1])}`;
        bidPath += ` L ${xS(cumBids[i][0])} ${yS(cumBids[i][1])}`;
      }
      bidPath += ` L ${PAD_X} ${yS(cumBids.at(-1)[1])} L ${PAD_X} ${bottom} Z`;
    }

    // Build ask path (staircase going right from best ask)
    let askPath = "";
    if (cumAsks.length) {
      askPath = `M ${xS(cumAsks[0][0])} ${bottom}`;
      askPath += ` L ${xS(cumAsks[0][0])} ${yS(cumAsks[0][1])}`;
      for (let i = 1; i < cumAsks.length; i++) {
        askPath += ` L ${xS(cumAsks[i][0])} ${yS(cumAsks[i - 1][1])}`;
        askPath += ` L ${xS(cumAsks[i][0])} ${yS(cumAsks[i][1])}`;
      }
      askPath += ` L ${W - PAD_X} ${yS(cumAsks.at(-1)[1])} L ${W - PAD_X} ${bottom} Z`;
    }

    const bestBidPrice = cumBids[0]?.[0];
    const bestAskPrice = cumAsks[0]?.[0];
    const midPrice = bestBidPrice != null && bestAskPrice != null
      ? (bestBidPrice + bestAskPrice) / 2
      : bestBidPrice ?? bestAskPrice;
    const midX = midPrice != null ? xS(midPrice) : W / 2;

    // Price axis labels (5 evenly spaced)
    const labels = [];
    for (let i = 0; i <= 4; i++) {
      const price = minP + (i / 4) * priceSpan;
      labels.push({ x: xS(price), label: `$${price.toFixed(2)}` });
    }

    return {
      bidPath, askPath,
      bidStroke: "#22c55e", askStroke: "#ef4444",
      midX, labels, isEmpty: false,
    };
  }, [bids, asks]);

  const isDark = c.isDark;
  const bidFill  = isDark ? "rgba(34,197,94,0.15)"  : "rgba(22,163,74,0.12)";
  const askFill  = isDark ? "rgba(239,68,68,0.15)"  : "rgba(220,38,38,0.12)";
  const midColor = isDark ? "rgba(99,102,241,0.55)" : "rgba(79,95,197,0.55)";
  const gridClr  = isDark ? "rgba(255,255,255,0.05)" : "#e8ecf4";

  return (
    <Box sx={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: "14px", boxShadow: c.shadow, overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: c.t1 }}>Market Depth</Typography>
        <Box sx={{ display: "flex", gap: 1.5, ml: "auto" }}>
          {[{ color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "Bids" }, { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Asks" }].map(({ color, bg, label }) => (
            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1, py: 0.3, borderRadius: "6px", background: bg }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "2px", background: color }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {isEmpty ? (
        <Box sx={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ color: c.t4, fontSize: 13 }}>Order book is empty</Typography>
        </Box>
      ) : (
        <Box sx={{ px: 1 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f}
                x1={PAD_X} y1={PAD_Y + f * (H - PAD_Y * 2)}
                x2={W - PAD_X} y2={PAD_Y + f * (H - PAD_Y * 2)}
                stroke={gridClr} strokeWidth="1"
              />
            ))}

            {/* Bid area */}
            {bidPath && (
              <>
                <path d={bidPath} fill={bidFill} />
                <path d={bidPath} fill="none" stroke={bidStroke} strokeWidth="1.5" />
              </>
            )}

            {/* Ask area */}
            {askPath && (
              <>
                <path d={askPath} fill={askFill} />
                <path d={askPath} fill="none" stroke={askStroke} strokeWidth="1.5" />
              </>
            )}

            {/* Mid price vertical line */}
            {midX != null && (
              <>
                <line x1={midX} y1={PAD_Y} x2={midX} y2={H - PAD_Y}
                  stroke={midColor} strokeWidth="1" strokeDasharray="5,4" />
                <text x={midX} y={PAD_Y - 6} textAnchor="middle"
                  fontSize="10" fill={midColor} fontFamily="Inter, monospace">
                  mid
                </text>
              </>
            )}

            {/* Price axis labels */}
            {labels?.map(({ x, label }, i) => (
              <text key={i} x={x} y={H - 4} textAnchor="middle"
                fontSize="9" fill={isDark ? "rgba(255,255,255,0.3)" : "#94a3b8"} fontFamily="Inter, monospace">
                {label}
              </text>
            ))}
          </svg>
        </Box>
      )}
    </Box>
  );
};

export default DepthChart;
