import { useTheme } from "@mui/material/styles";

const useColors = () => {
  const theme = useTheme();
  const d = theme.palette.mode === "dark";
  return {
    // Backgrounds
    pageBg:   d ? "#07090f"  : "#eef1f8",
    cardBg:   d ? "#0f1728"  : "#ffffff",
    altBg:    d ? "#0c1628"  : "#f5f7fc",
    sideBg:   d ? "#0c1021"  : "#ffffff",
    topBg:    d ? "rgba(8,10,20,0.97)" : "rgba(255,255,255,0.98)",

    // Borders — solid, visible in both modes
    border:   d ? "rgba(99,102,241,0.18)" : "#d4d8e8",

    // Card shadow — flat in dark, elevated in light
    shadow:   d ? "none" : "0 1px 4px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.06)",

    // Text hierarchy
    t1:       d ? "rgba(255,255,255,0.92)" : "#131722",
    t2:       d ? "rgba(255,255,255,0.58)" : "#44546a",
    t3:       d ? "rgba(255,255,255,0.35)" : "#7a8599",
    t4:       d ? "rgba(255,255,255,0.20)" : "#b0bac9",

    // Track/bar backgrounds (used in progress bars etc.)
    trackBg:  d ? "rgba(255,255,255,0.08)" : "#e2e6f0",

    // Inputs
    inputBg:  d ? "rgba(99,102,241,0.06)" : "#f2f4fb",
    inputBdr: d ? "rgba(99,102,241,0.2)"  : "#c8cde0",
    inputClr: d ? "#ffffff"               : "#131722",

    // Table rows
    rowHov:   d ? "rgba(255,255,255,0.025)" : "#f5f7fc",
    rowBdr:   d ? "rgba(255,255,255,0.04)"  : "#eaecf4",

    // Accent chips / buttons
    accentText:   d ? "#a5b4fc" : "#4f5fc5",
    accentBg:     d ? "rgba(99,102,241,0.15)" : "rgba(79,95,197,0.10)",
    accentBorder: d ? "rgba(99,102,241,0.4)"  : "rgba(79,95,197,0.35)",

    isDark: d,
  };
};

export default useColors;
