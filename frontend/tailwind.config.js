/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b0b0d',
        panel: '#121318',
        panelSoft: '#171a21',
        borderSoft: '#272b33',
        accent: '#8b5cf6',
        accentSoft: '#7c3aed',
        textSoft: '#a1a1aa',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.2), 0 10px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
