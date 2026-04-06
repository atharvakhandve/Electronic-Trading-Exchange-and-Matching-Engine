import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from "lightweight-charts";
import { useTheme } from "@mui/material/styles";
import { calcSMA, calcEMA } from "../../utils/indicators.js";

const chartOptions = (isDark) => ({
  autoSize: true,
  layout: {
    background: { color: isDark ? "#0c1628" : "#f5f7fc" },
    textColor: isDark ? "#9ca3af" : "#44546a",
    fontFamily: "Inter, monospace",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: isDark ? "rgba(255,255,255,0.04)" : "#e8ecf4" },
    horzLines: { color: isDark ? "rgba(255,255,255,0.04)" : "#e8ecf4" },
  },
  crosshair: {
    vertLine: {
      color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
      labelBackgroundColor: isDark ? "#2a2a2a" : "#d4d8e8",
    },
    horzLine: {
      color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
      labelBackgroundColor: isDark ? "#2a2a2a" : "#d4d8e8",
    },
  },
  rightPriceScale: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "#d4d8e8",
    scaleMargins: { top: 0.05, bottom: 0.1 },
  },
  timeScale: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "#d4d8e8",
    timeVisible: true,
    secondsVisible: false,
    fixLeftEdge: false,
    fixRightEdge: false,
    barSpacing: 10,
    minBarSpacing: 4,
  },
});

// indicators: { vol, sma20, sma50, ema9 } — booleans
const CandleChart = ({ data = [], type = "candle", indicators = {} }) => {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const mainRef      = useRef(null);
  const volRef       = useRef(null);
  const sma20Ref     = useRef(null);
  const sma50Ref     = useRef(null);
  const ema9Ref      = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = createChart(containerRef.current, chartOptions(isDark));
    return () => {
      chartRef.current?.remove();
      chartRef.current = null;
      mainRef.current = volRef.current = sma20Ref.current = sma50Ref.current = ema9Ref.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Theme changes
  useEffect(() => {
    chartRef.current?.applyOptions(chartOptions(isDark));
  }, [isDark]);

  // Main price series — recreate when chart type changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (mainRef.current) { chart.removeSeries(mainRef.current); mainRef.current = null; }

    if (type === "candle") {
      mainRef.current = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e", downColor: "#ef4444",
        borderUpColor: "#16a34a", borderDownColor: "#dc2626",
        wickUpColor: "#22c55e", wickDownColor: "#ef4444",
      });
    } else if (type === "line") {
      mainRef.current = chart.addSeries(LineSeries, {
        color: "#6366f1", lineWidth: 2,
        crosshairMarkerVisible: true, crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: "#6366f1",
      });
    } else if (type === "area") {
      mainRef.current = chart.addSeries(AreaSeries, {
        lineColor: "#6366f1",
        topColor: "rgba(99,102,241,0.25)",
        bottomColor: "rgba(99,102,241,0.02)",
        lineWidth: 2,
      });
    }
  }, [type]);

  // Update main series data
  useEffect(() => {
    if (!mainRef.current || !data.length) return;
    const formatted = type === "candle"
      ? data
      : data.map((d) => ({ time: d.time, value: d.close }));
    mainRef.current.setData(formatted);
    type === "candle"
      ? chartRef.current?.timeScale().scrollToRealTime()
      : chartRef.current?.timeScale().fitContent();
  }, [data, type]);

  // Volume bars
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.vol) {
      if (!volRef.current) {
        volRef.current = chart.addSeries(HistogramSeries, {
          priceScaleId: "vol",
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale("vol").applyOptions({
          scaleMargins: { top: 0.82, bottom: 0 },
          borderVisible: false,
          visible: false,
        });
      }
      volRef.current.setData(
        data.map((d) => ({
          time: d.time,
          value: d.volume ?? 0,
          color: d.close >= d.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.45)",
        }))
      );
    } else if (volRef.current) {
      chart.removeSeries(volRef.current);
      volRef.current = null;
    }
    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0.05, bottom: indicators.vol ? 0.26 : 0.1 },
    });
  }, [indicators.vol, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // SMA 20 (amber)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.sma20) {
      if (!sma20Ref.current) {
        sma20Ref.current = chart.addSeries(LineSeries, {
          color: "#f59e0b", lineWidth: 1,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        });
      }
      sma20Ref.current.setData(calcSMA(data, 20));
    } else if (sma20Ref.current) {
      chart.removeSeries(sma20Ref.current);
      sma20Ref.current = null;
    }
  }, [indicators.sma20, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // SMA 50 (blue)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.sma50) {
      if (!sma50Ref.current) {
        sma50Ref.current = chart.addSeries(LineSeries, {
          color: "#3b82f6", lineWidth: 1,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        });
      }
      sma50Ref.current.setData(calcSMA(data, 50));
    } else if (sma50Ref.current) {
      chart.removeSeries(sma50Ref.current);
      sma50Ref.current = null;
    }
  }, [indicators.sma50, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // EMA 9 (violet)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (indicators.ema9) {
      if (!ema9Ref.current) {
        ema9Ref.current = chart.addSeries(LineSeries, {
          color: "#a78bfa", lineWidth: 1,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        });
      }
      ema9Ref.current.setData(calcEMA(data, 9));
    } else if (ema9Ref.current) {
      chart.removeSeries(ema9Ref.current);
      ema9Ref.current = null;
    }
  }, [indicators.ema9, data]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};

export default CandleChart;
