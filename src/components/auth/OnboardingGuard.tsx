import { Navigate, Outlet } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { FullPageSpinner } from "../ui/Spinner";
import { ConnectionBanner, ConnectionProblemScreen } from "./ConnectionGate";

export function OnboardingGuard() {
  const { spreadsheetId, settings, loading, issue, error } = useSettings();
  if (loading) return <FullPageSpinner />;

  // Connection trouble with nothing cached to show: settings could not be
  // loaded, so "onboardingCompleted: false" means "unknown", NOT "new user".
  // Sending a returning user to onboarding here is what used to strand them
  // on a screen that told them to reconnect but had no way to do it.
  if (spreadsheetId && !settings.onboardingCompleted && (issue || error)) return <ConnectionProblemScreen />;

  if (!spreadsheetId || !settings.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <>
      <ConnectionBanner />
      <Outlet />
    </>
  );
}
