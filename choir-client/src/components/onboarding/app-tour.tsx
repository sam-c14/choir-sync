import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../auth/auth-context';
import { driver, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getOnboardingSteps } from './onboarding-steps';
import { apiClient } from '../../lib/api-client';

export function AppTour() {
  const { user, login } = useAuth();
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
  }, [user]);

  const startTour = () => {
    if (!user) return;

    const steps = getOnboardingSteps(user.role, user.participationType);

    const driverObj = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep() || confirm('Are you sure you want to skip the tour?')) {
          driverObj.destroy();
          markTourCompleted();
        }
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  };

  const markTourCompleted = async () => {
    try {
      await apiClient.patch('/users/me', { hasCompletedOnboarding: true });
      if (user) {
        // Optimistically update the context
        login({ ...user, hasCompletedOnboarding: true } as any, localStorage.getItem('token') || '');
      }
    } catch (error) {
      console.error('Failed to mark onboarding as complete:', error);
    }
  };

  return null;
}
