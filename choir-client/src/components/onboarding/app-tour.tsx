import React, { useEffect, useRef } from "react";
import { useAuth } from "../../auth/auth-context";
import { driver, Config } from "driver.js";
import "driver.js/dist/driver.css";
import { getOnboardingSteps } from "./onboarding-steps";
import { apiClient } from "../../lib/api-client";

export function AppTour() {
  const { user, updateLocalUser } = useAuth();
  const driverRef = useRef<any>(null);

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

  const startTour = () => {
    if (!user) return;

    const steps = getOnboardingSteps(user.role, user.participationType);

    const driverObj = driver({
      showProgress: true,
      popoverClass: "driverjs-theme",
      steps,
      onPopoverRender: (popover: any) => {
        const footer = popover.footer || popover.wrapper?.querySelector('.driver-popover-footer');
        if (footer) {
          let skipBtn = footer.querySelector('.driver-custom-skip');
          if (!skipBtn) {
            skipBtn = document.createElement('button');
            skipBtn.className = 'driver-custom-skip';
            skipBtn.innerText = 'Skip';
            skipBtn.style.cssText = 'background: transparent; border: none; color: var(--muted-foreground); font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: underline; margin-right: auto; padding: 5px 0; text-shadow: none;';
            skipBtn.onclick = () => {
              driverObj.destroy();
              markTourCompleted();
            };
            footer.insertBefore(skipBtn, footer.firstChild);
          }
        }
      },
      onDestroyStarted: () => {
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
