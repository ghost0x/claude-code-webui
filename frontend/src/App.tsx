import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ProjectSelector } from "./components/ProjectSelector";
import { ChatPage } from "./components/ChatPage";
import { LoginPage } from "./components/LoginPage";
import { EnterBehaviorProvider } from "./contexts/EnterBehaviorContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { isDevelopment } from "./utils/environment";

// Lazy load DemoPage only in development
const DemoPage = isDevelopment()
  ? lazy(() =>
      import("./components/DemoPage").then((module) => ({
        default: module.DemoPage,
      })),
    )
  : null;

function AppContent() {
  const { isAuthenticated, authEnabled, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if authentication is enabled and user is not authenticated
  if (authEnabled && !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectSelector />} />
        <Route path="/projects/*" element={<ChatPage />} />
        {DemoPage && (
          <Route
            path="/demo"
            element={
              <Suspense fallback={<div>Loading demo...</div>}>
                <DemoPage />
              </Suspense>
            }
          />
        )}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <EnterBehaviorProvider>
        <AppContent />
      </EnterBehaviorProvider>
    </AuthProvider>
  );
}

export default App;
