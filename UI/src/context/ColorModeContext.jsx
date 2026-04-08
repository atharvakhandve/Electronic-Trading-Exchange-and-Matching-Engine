import React, { createContext, useContext, useState, useMemo } from "react";
import { createTheme } from "@mui/material/styles";

const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: "dark" });

export const useColorMode = () => useContext(ColorModeContext);

export const buildTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            background: { default: "#07090f", paper: "#0f1728" },
            text: { primary: "rgba(255,255,255,0.9)", secondary: "rgba(255,255,255,0.55)" },
            divider: "rgba(99,102,241,0.18)",
          }
        : {
            background: { default: "#eef1f8", paper: "#ffffff" },
            text: { primary: "#131722", secondary: "#44546a" },
            divider: "#d4d8e8",
          }),
      primary: { main: "#6366f1" },
    },
    typography: { fontFamily: "Inter, sans-serif" },
  });

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(
    () => localStorage.getItem("colorMode") || "dark"
  );

  const toggleColorMode = () =>
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("colorMode", next);
      return next;
    });

  const value = useMemo(() => ({ toggleColorMode, mode }), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
};
