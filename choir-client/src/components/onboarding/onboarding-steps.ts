import { DriveStep } from 'driver.js';

export const getOnboardingSteps = (
  role: string,
  participationType?: string
): DriveStep[] => {
  const steps: DriveStep[] = [
    {
      popover: {
        title: 'Welcome to ChoirSync!',
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
      popover: {
        title: 'Song Catalog',
        description: 'On the main page, you can browse all songs. Look out for the "ACTIVE SUNDAY" tag to see what we are singing this week.',
      },
    },
    {
      popover: {
        title: 'Floating Player',
        description: 'When you play a song, a persistent player will appear at the bottom, letting you keep listening while you navigate the app.',
      },
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
