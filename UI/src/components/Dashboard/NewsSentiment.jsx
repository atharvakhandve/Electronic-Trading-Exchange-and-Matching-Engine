import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import useColors from "../../theme/useColors.js";

const SENTIMENT_CONFIG = {
  bullish:  { color: "#16a34a", bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.28)",  label: "BULLISH",  icon: "↑" },
  neutral:  { color: "#0284c7", bg: "rgba(2,132,199,0.09)",  border: "rgba(2,132,199,0.25)",  label: "NEUTRAL",  icon: "→" },
  bearish:  { color: "#dc2626", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.28)",  label: "BEARISH",  icon: "↓" },
};

const SentimentBadge = ({ sentiment, small = false }) => {
  const cfg = SENTIMENT_CONFIG[sentiment] ?? SENTIMENT_CONFIG.neutral;
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: 0.5,
      px: small ? 0.8 : 1.2, py: small ? 0.2 : 0.4,
      borderRadius: "6px", border: `1px solid ${cfg.border}`,
      background: cfg.bg,
    }}>
      <Typography sx={{ fontSize: small ? 10 : 11, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
        {cfg.icon} {cfg.label}
      </Typography>
    </Box>
  );
};

const ConfidenceBar = ({ value, c }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box sx={{ flex: 1, height: 4, borderRadius: 2, background: c.trackBg, overflow: "hidden" }}>
      <Box sx={{
        height: "100%", borderRadius: 2,
        width: `${Math.round(value * 100)}%`,
        background: "linear-gradient(90deg, #6366f1, #a78bfa)",
        transition: "width 0.6s ease",
      }} />
    </Box>
    <Typography sx={{ fontSize: 11, color: c.t3, fontFamily: "monospace", flexShrink: 0 }}>
      {Math.round(value * 100)}%
    </Typography>
  </Box>
);

const relativeTime = (isoString) => {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NewsSentiment = ({ symbol = "AAPL" }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const c = useColors();

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/news/${symbol}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }
      setData(await res.json());
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchNews();
    const timer = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchNews]);

  const sentiment = data?.sentiment;
  const articles  = data?.articles ?? [];

  return (
    <Box sx={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: "14px", boxShadow: c.shadow, overflow: "hidden" }}>

      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: c.t1 }}>News & Sentiment</Typography>
          <Typography sx={{ fontSize: 11, color: c.accentText, background: c.accentBg, border: `1px solid ${c.accentBorder}`, borderRadius: "5px", px: 0.9, py: 0.2, fontFamily: "monospace" }}>
            {symbol}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {lastFetch && (
            <Typography sx={{ fontSize: 10, color: c.t4 }}>
              Updated {relativeTime(lastFetch.toISOString())}
            </Typography>
          )}
          <Box onClick={!loading ? fetchNews : undefined} sx={{
            px: 1.2, py: 0.4, borderRadius: "6px", cursor: loading ? "default" : "pointer",
            fontSize: 11, fontWeight: 600, border: `1px solid ${c.accentBorder}`,
            color: loading ? c.t4 : c.accentText,
            background: loading ? "transparent" : c.accentBg,
            "&:hover": loading ? {} : { background: c.isDark ? "rgba(99,102,241,0.2)" : "rgba(79,95,197,0.15)" },
            transition: "all 0.15s",
          }}>
            {loading ? "Loading…" : "Refresh"}
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>

        {/* Loading state */}
        {loading && !data && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 1.5 }}>
            <CircularProgress size={24} sx={{ color: "#6366f1" }} />
            <Typography sx={{ fontSize: 12, color: c.t3 }}>
              Fetching headlines &amp; running sentiment analysis…
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {error && !loading && (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "#dc2626", mb: 0.5 }}>Failed to load news</Typography>
            <Typography sx={{ fontSize: 11, color: c.t3 }}>{error}</Typography>
          </Box>
        )}

        {/* Aggregate sentiment card */}
        {sentiment && !loading && (
          <Box sx={{
            background: c.altBg, border: `1px solid ${c.border}`,
            borderRadius: "10px", p: 1.5, display: "flex", flexDirection: "column", gap: 1.2,
          }}>
            {/* Row 1: badge + confidence */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: 0.8, mb: 0.5 }}>
                  Sentiment Analysis
                </Typography>
                <SentimentBadge sentiment={sentiment.overall} />
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: 0.8, mb: 0.5 }}>
                  Confidence
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: c.accentText }}>
                  {Math.round(sentiment.confidence * 100)}%
                </Typography>
              </Box>
            </Box>

            <ConfidenceBar value={sentiment.confidence} c={c} />

            {/* Row 2: pill counts */}
            {sentiment.counts && (
              <Box sx={{ display: "flex", gap: 1 }}>
                {[
                  { key: "bullish", color: "#16a34a", bg: "rgba(22,163,74,0.10)"  },
                  { key: "neutral", color: "#0284c7", bg: "rgba(2,132,199,0.09)"  },
                  { key: "bearish", color: "#dc2626", bg: "rgba(220,38,38,0.10)"  },
                ].map(({ key, color, bg }) => (
                  <Box key={key} sx={{ px: 1, py: 0.3, borderRadius: "5px", background: bg }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color }}>
                      {sentiment.counts[key]} {key}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Row 3: analysis text */}
            {sentiment.summary && (
              <Box sx={{ borderTop: `1px solid ${c.border}`, pt: 1 }}>
                <Typography sx={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: 0.8, mb: 0.5 }}>
                  Analysis
                </Typography>
                <Typography sx={{ fontSize: 12, color: c.t2, lineHeight: 1.6 }}>
                  {sentiment.summary}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Articles list — scrollable */}
        {articles.length > 0 && !loading && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography sx={{ fontSize: 10, color: c.t3, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Latest Headlines
            </Typography>
            <Box sx={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1,
              "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-thumb": { background: c.isDark ? "rgba(99,102,241,0.3)" : "#c8cde0", borderRadius: "2px" },
            }}>
              {articles.map((article, i) => (
                <Box key={i} sx={{
                  display: "flex", alignItems: "flex-start", gap: 1.5,
                  p: 1.5, borderRadius: "8px",
                  background: c.rowHov, border: `1px solid ${c.border}`,
                  "&:hover": { background: c.isDark ? "rgba(99,102,241,0.06)" : "rgba(79,95,197,0.05)", borderColor: c.isDark ? "rgba(99,102,241,0.3)" : "#b0b8d4" },
                  transition: "all 0.15s",
                }}>
                  <Box sx={{ flexShrink: 0, mt: 0.2 }}>
                    <SentimentBadge sentiment={article.sentiment} small />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component="a"
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        fontSize: 12, fontWeight: 600, color: c.t1,
                        lineHeight: 1.4, display: "-webkit-box", mb: 0.4,
                        textDecoration: "none",
                        "&:hover": { color: c.accentText, textDecoration: "underline" },
                        overflow: "hidden", textOverflow: "ellipsis",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}
                    >
                      {article.title}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Typography sx={{ fontSize: 10, color: c.t3 }}>{article.source}</Typography>
                      <Typography sx={{ fontSize: 10, color: c.t4 }}>·</Typography>
                      <Typography sx={{ fontSize: 10, color: c.t3 }}>{relativeTime(article.published_at)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {!loading && !error && articles.length === 0 && data && (
          <Typography sx={{ py: 3, textAlign: "center", color: c.t4, fontSize: 12 }}>
            No news articles found for {symbol}
          </Typography>
        )}

      </Box>
    </Box>
  );
};

export default NewsSentiment;
