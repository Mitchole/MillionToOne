/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        'cosmic-bg': '#0c0a1e',
        'cosmic-panel': 'rgba(23, 19, 46, 0.8)',
      },
      animation: {
        'move-orb-1': 'move-orb-1 30s infinite alternate',
        'move-orb-2': 'move-orb-2 35s infinite alternate',
      },
      keyframes: {
        'move-orb-1': {
          from: { transform: 'translate(-15%, -15%) scale(1)' },
          to: { transform: 'translate(25%, 20%) scale(1.2)' },
        },
        'move-orb-2': {
          from: { transform: 'translate(-10%, -10%) scale(1.2)' },
          to: { transform: 'translate(-20%, 15%) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
