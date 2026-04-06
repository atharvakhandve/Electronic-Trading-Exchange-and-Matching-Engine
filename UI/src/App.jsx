import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { useColorMode, buildTheme } from "./context/ColorModeContext.jsx";
import { useMemo } from "react";
import LoginForm from "./components/Login/LoginForm";
import ExchangeDashboard from "./pages/ExchangeDashboard";
import PlaceOrder from "./components/Dashboard/PlaceOrder";

function App() {
  const { mode } = useColorMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/dashboard" element={<ExchangeDashboard />} />
          <Route path="/PlaceOrder" element={<PlaceOrder />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
