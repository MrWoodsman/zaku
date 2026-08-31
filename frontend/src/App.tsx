import { useState } from "react";
// DODAJ IMPORT TOASTERA TUTAJ (zmień "sonner" na Twoją bibliotekę, jeśli używasz innej, np. "react-hot-toast" lub z shadcn)
import { Toaster } from "sonner";

import { ROUTES } from "@/config/routes";
import { Routes, Route, Navigate } from "react-router-dom";
import { useGroup } from "./hooks/useGroup";

// COMPONENTS
import { OnBoardingOverlay } from "./components/overlay/OnBoardingOverlay";
import { AppLayout } from "./components/layout/AppLayout";

// SCREENS
import { ShoppingListsScreen } from "./pages/ShoppingListsScreen";
import { HomeScreen } from "./pages/HomeScreen";
import { ShoppingScreen } from "./pages/ShoppingScreen";
import { SettingsScreen } from "./pages/SettingsScreen";
import { RecipesScreen } from "./pages/RecipesScreen";
import { AutoListScreen } from "./pages/AutoListScreen";
import { ShoppingAllScreen } from "./pages/ShoppingAllScreen";
import { RecipesDraftsScreen } from "./pages/RecipesDraftsScreen";
import { RecipeEditorScreen } from "./pages/RecipeEditorScreen";
import { RecipeViewScreen } from "./pages/RecipeViewScreen";
import { RecipesAllScreen } from "./pages/RecipesAllScreen";
import { LogsScreen } from "./pages/LogsScreen";

function App() {
  const { groupId, joinGroup, leaveGroup } = useGroup();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("has-seen-onboarding");
  });

  const handleCompleteOnboarding = () => {
    localStorage.setItem("has-seen-onboarding", "true");
    setShowOnboarding(false);
  };

  // 1. STRAŻNIK: ONBOARDING
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-50 bg-background w-full h-full">
        <OnBoardingOverlay onComplete={handleCompleteOnboarding} />
      </div>
    );
  }

  // 2. STRAŻNIK: GRUPA
  if (!groupId) {
    return <HomeScreen onJoin={joinGroup} />;
  }

  // 3. GŁÓWNA APLIKACJA
  return (
    <>
      <Routes>
        {/* Przekierowanie */}
        <Route path="/" element={<Navigate to={ROUTES.SHOPPING_LISTS} replace />} />

        {/* Sciezki aplikacji */}
        <Route path={ROUTES.RECIPES_EDITOR} element={<RecipeEditorScreen />} />

        <Route element={<AppLayout />}>
          {/* === LISTY ZAKUPÓW === */}
          <Route path={ROUTES.SHOPPING_LISTS} element={<ShoppingListsScreen />} />
          <Route path={ROUTES.SHOPPING_ALL} element={<ShoppingAllScreen />} />
          <Route path={ROUTES.LIST_DETAIL(":id")} element={<ShoppingScreen />} />
          {/* === PRZEPISY === */}
          <Route path={ROUTES.RECIPES} element={<RecipesScreen />} />
          <Route path={ROUTES.RECIPES_ALL_MY} element={<RecipesAllScreen />} />
          <Route path={ROUTES.RECIPES_DRAFTS} element={<RecipesDraftsScreen />} />
          <Route path={ROUTES.RECIPES_VIEW(":id")} element={<RecipeViewScreen />} />
          {/* LOGS */}
          <Route path={ROUTES.LOGS} element={<LogsScreen />} />
          {/* === ???? === */}
          <Route path={ROUTES.AUTO_LIST} element={<AutoListScreen />} />
          {/* === USTAWIENIA === */}
          <Route
            path={ROUTES.SETTINGS}
            element={<SettingsScreen groupId={groupId} onLeave={leaveGroup} />}
          />
        </Route>
      </Routes>
      {/* <--- GLOBALNY TOASTER ---> */}
      <Toaster
        position="top-center"
        toastOptions={{ style: { marginTop: "env(safe-area-inset-top)" } }}
      />
    </>
  );
}

export default App;
