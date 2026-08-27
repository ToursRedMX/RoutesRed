/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rr: {
          navy: {
            50: '#f0f4fa',
            100: '#d9e2f1',
            200: '#b3c5e3',
            300: '#7d9fce',
            400: '#4870b0',
            500: '#2b5491',
            600: '#1e3f74',
            700: '#152b52',
            800: '#0d1f3c',
            900: '#081528',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#e23b3b',
            600: '#c92525',
            700: '#a01818',
            800: '#7c1313',
            900: '#5c0e0e',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.7s ease-out both',
        'fade-in-down': 'fadeInDown 0.6s ease-out both',
        'fade-in': 'fadeIn 0.8s ease-out both',
        'slide-in-left': 'slideInLeft 0.5s ease-out both',
        'scale-in': 'scaleIn 0.5s ease-out both',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-30px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
