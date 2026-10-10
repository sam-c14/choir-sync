import React, { useEffect, useRef } from "react";
import { useAuth } from "../../auth/auth-context";
import { driver, Config } from "driver.js";
import "driver.js/dist/driver.css";
import { getOnboardingSteps } from "./onboarding-steps";
import { apiClient } from "../../lib/api-client";
import { trackChoirEvent } from "../../lib/analytics";
import { useNavigate } from "react-router-dom";

export function AppTour() {
  const { user, updateLocalUser } = useAuth();
  const driverRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // Don't start the tour if it's already completed or if it's not a browser environment
    if (user.hasCompletedOnboarding) return;

    // Give the app a moment to render DOM elements (like bottom nav)
    const timer = setTimeout(() => {
      startTour();
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.hasCompletedOnboarding]);

  const startTour = async () => {
    if (!user) return;

    let demoSongId = null;
    try {
      const res = await apiClient.get('/songs?limit=1');
      if (res.data?.data?.length > 0) {
        demoSongId = res.data.data[0].id;
      }
    } catch (e) {
      console.error("Failed to fetch demo song for tour", e);
    }

    const steps = getOnboardingSteps(user.role, user.participationType, navigate, demoSongId);

    trackChoirEvent({
      action: 'onboarding_started',
      params: { userId: user.id, email: user.email, role: user.role }
    });

    const driverObj = driver({
      showProgress: true,
      popoverClass: "driverjs-theme",
      steps,
      onDestroyStarted: () => {
        const isComplete = !driverObj.hasNextStep();
        if (isComplete) {
          trackChoirEvent({
            action: 'onboarding_completed',
            params: { userId: user.id, email: user.email, role: user.role }
          });
        } else {
          trackChoirEvent({
            action: 'onboarding_skipped',
            params: { userId: user.id, email: user.email, role: user.role }
          });
        }
        driverObj.destroy();
        markTourCompleted();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  };

  const markTourCompleted = async () => {
    try {
      if (user) {
        // Optimistically update the context
        updateLocalUser({ hasCompletedOnboarding: true });
      }
      await apiClient.patch("/users/me", { hasCompletedOnboarding: true });
    } catch (error) {
      console.error("Failed to mark onboarding as complete:", error);
    }
  };

  return null;
}
