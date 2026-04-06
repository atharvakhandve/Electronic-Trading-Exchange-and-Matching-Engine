import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { createChart, LineSeries } from "lightweight-charts";
import { useTheme } from "@mui/material/styles";
import { calcRSI } from "../../utils/indicators.js";
import useColors from "../../theme/useColors.js";

const chartOptions = (isDark) => ({
  autoSize: true,
  layout: {
    background: { color: isDark ? "#0c1628" : "#f5f7fc" },
    textColor: isDark ? "#9ca3af" : "#44546a",
    fontFamily: "Inter, monospace",
    fontSize: 10,
  },
  grid: {
    vertLines: { color: "transparent" },
    horzLines: { color: isDark ? "rgba(255,255,255,0.04)" : "#e8ecf4" },
  },
  crosshair: {
    vertLine: { color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)", labelBackgroundColor: isDark ? "#2a2a2a" : "#d4d8e8" },
    horzLine: { color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)", labelBackgroundColor: isDark ? "#2a2a2a" : "#d4d8e8" },
  },
  rightPriceScale: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "#d4d8e8",
    scaleMargins: { top: 0.1, bottom: 0.1 },
    minimumWidth: 48,
  },
  timeScale: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "#d4d8e8",
    timeVisible: true,
    secondsVisible: false,
    visible: false,  // hide time axis — the main chart above shows it
  },
  handleScroll: false,
  handleScale: false,
});

const RSIPanel = ({ data = [] }) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const rsiRef       = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const c = useColors();

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, chartOptions(isDark));
    chartRef.current = chart;

    const series = chart.addSeries(LineSeries, {
      color: "#f43f5e",
      lineWidth: 1.5,
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    });
    rsiRef.current = series;

    // Fixed reference lines at 70, 50, 30
    series.createPriceLine({ price: 70, color: "rgba(239,68,68,0.5)",  lineStyle: 1, lineWidth: 1, axisLabelVisible: false });
    series.createPriceLine({ price: 50, color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", lineStyle: 1, lineWidth: 1, axisLabelVisible: false });
    series.createPriceLine({ price: 30, color: "rgba(34,197,94,0.5)", lineStyle: 1, lineWidth: 1, axisLabelVisible: false });

    return () => {
      chart.remove();
      chartRef.current = null;
      rsiRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme changes
  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(isDark));
  }, [isDark]);

  // Update RSI data
  useEffect(() => {
    if (!rsiRef.current || data.length < 16) return;
    rsiRef.current.setData(calcRSI(data, 14));
  }, [data]);

  const lastRSI = data.length >= 16 ? calcRSI(data, 14).at(-1)?.value : null;
  const rsiColor = lastRSI == null ? c.t3 : lastRSI > 70 ? "#ef4444" : lastRSI < 30 ? "#22c55e" : "#f43f5e";

  return (
    <Box sx={{ background: c.altBg, border: `1px solid ${c.border}`, borderRadius: "14px", boxShadow: c.shadow, overflow: "hidden" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: c.t2, textTransform: "uppercase", letterSpacing: 1 }}>
          RSI (14)
        </Typography>
        {lastRSI != null && (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: rsiColor }}>
              {lastRSI.toFixed(1)}
            </Typography>
            <Typography sx={{ fontSize: 10, color: rsiColor, fontWeight: 600 }}>
              {lastRSI > 70 ? "OVERBOUGHT" : lastRSI < 30 ? "OVERSOLD" : "NEUTRAL"}
            </Typography>
          </>
        )}
        <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
          {[{ label: "70 OB", color: "#ef4444" }, { label: "50", color: c.t4 }, { label: "30 OS", color: "#22c55e" }].map(({ label, color }) => (
            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 14, height: 1.5, background: color, borderRadius: 1 }} />
              <Typography sx={{ fontSize: 9, color: c.t3 }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ height: 100 }}>
        {data.length < 16
          ? <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography sx={{ fontSize: 11, color: c.t4 }}>Not enough candles for RSI</Typography>
            </Box>
          : <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        }
      </Box>
    </Box>
  );
};

export default RSIPanel;
