import { useSyncExternalStore } from "react";
import { getGuide, subscribeGuide, tourStore, type GuideState } from "../lib/guide";

export function useGuide(): GuideState {
  return useSyncExternalStore(subscribeGuide, getGuide, getGuide);
}

export function useTourRunning(): boolean {
  return useSyncExternalStore(tourStore.subscribe, tourStore.get, () => false);
}
