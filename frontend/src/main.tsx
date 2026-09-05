import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
// TANSTACK QUERYY
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "./components/core/ThemeProvider.tsx";
import { LanguageProvider } from "./components/core/LanguageProvider.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="shopping-list-theme">
          <LanguageProvider>
            {/* reducedMotion="user" respects prefers-reduced-motion automatically for
                every framer-motion animation in the app (swaps to opacity-only crossfades) */}
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
