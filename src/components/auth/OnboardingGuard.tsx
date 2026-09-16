import { Navigate, Outlet } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { FullPageSpinner } from "../ui/Spinner";

export function OnboardingGuard() {
  const { connected, settings, loading } = useSettings();
  if (loading) return <FullPageSpinner />;
  if (!connected || !settings.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
