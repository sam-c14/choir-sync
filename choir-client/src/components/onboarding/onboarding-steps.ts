import { DriveStep } from 'driver.js';

const waitForElement = (selector: string, callback: () => void, maxAttempts = 20) => {
  let attempts = 0;
  const check = () => {
    if (document.querySelector(selector)) callback();
    else if (attempts < maxAttempts) { attempts++; setTimeout(check, 200); }
    else callback();
  };
  check();
};

export const getOnboardingSteps = (
  role: string,
  participationType: string | undefined,
  navigate: (path: string) => void,
  demoSongId?: () => string | null,
  getDriver?: () => any
): DriveStep[] => {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to CSync!',
        description: 'Let’s take a quick tour to help you get familiar with the app.',
      },
    },
    {
      element: '#tour-bottom-nav',
      popover: {
        title: 'Navigation',
        description: 'Use the bottom navigation to quickly jump between Songs, Playlists, Uniforms, and your Profile.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#tour-song-catalog',
      popover: {
        title: 'Song Catalog',
        description: 'On the main page, you can browse all songs. Look out for the "ACTIVE SUNDAY" tag to see what we are singing this week.',
      },
      onHighlightStarted: (element, step, options) => {
        if (window.location.pathname !== '/') {
          navigate('/');
          // Give the DOM time to render the new page
          waitForElement('#tour-song-catalog', () => {
            getDriver?.()?.moveNext();
          });
          return false;
        }
      }
    },
    {
      element: '#tour-floating-player',
      popover: {
        title: 'Floating Player',
        description: 'When you play a song, a persistent player will appear at the bottom, letting you keep listening while you navigate the app.',
      },
      onHighlightStarted: (element, step, options) => {
        const id = demoSongId?.();
        const targetPath = id ? `/songs/${id}` : '/';
        if (window.location.pathname !== targetPath) {
          navigate(targetPath);
          waitForElement('#tour-floating-player', () => {
            getDriver?.()?.moveNext();
          });
          return false;
        }
      }
    },
    {
      element: '#tour-uniforms-nav',
      popover: {
        title: 'Uniforms Schedule',
        description: 'Check here to see the assigned dress code for upcoming Sunday services.',
        side: 'top',
      },
    },
    {
      element: '#tour-profile-nav',
      popover: {
        title: 'Your Profile',
        description: 'Don’t forget to update your preferred Name and Vocal Key here!',
        side: 'top',
      },
    },
  ];

  if (role === 'SECTION_LEADER' && participationType !== 'MUSICIAN') {
    steps.push({
      popover: {
        title: 'Voice Snippets',
        description: 'As a Section Leader, when you open a song, you will see options to record or upload voice snippets to help your section rehearse.',
      },
    });
  }

  if (role === 'DIRECTOR' || role === 'ADMIN') {
    steps.push({
      element: '#tour-copilot',
      popover: {
        title: 'AI Copilot',
        description: 'Need help? The AI Copilot can answer questions about vocal tips, harmonies, and theory.',
        side: 'left',
      },
    });
    steps.push({
      element: '#tour-playlists-nav',
      popover: {
        title: 'Playlists & Roster',
        description: 'Create Sunday Service playlists and assign members to the roster here.',
        side: 'top',
      },
    });
  }

  if (role === 'ADMIN') {
    steps.push({
      element: '#tour-users-nav',
      popover: {
        title: 'User Management',
        description: 'As an Admin, use this tab to manage chorister roles, parts, and access.',
        side: 'top',
      },
    });
  }

  return steps;
};
