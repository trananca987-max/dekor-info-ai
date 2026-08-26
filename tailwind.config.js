/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0A',
          secondary: '#1A1A2E',
          tertiary: '#16213E',
          card: 'rgba(26, 26, 46, 0.8)',
          'card-hover': 'rgba(37, 37, 60, 0.9)',
        },
        accent: {
          DEFAULT: '#00D4AA',
          hover: '#00E8BB',
          light: 'rgba(0, 212, 170, 0.15)',
        },
        premium: {
          DEFAULT: '#9C27B0',
          hover: '#E040FB',
          light: 'rgba(156, 39, 176, 0.15)',
        },
        success: {
          DEFAULT: '#4CAF50',
          light: 'rgba(76, 175, 80, 0.15)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 50%, #16213E 100%)',
        'gradient-accent': 'linear-gradient(135deg, #00D4AA 0%, #00E8BB 100%)',
        'gradient-premium': 'linear-gradient(135deg, #9C27B0 0%, #E040FB 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 212, 170, 0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
