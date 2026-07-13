/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Navy palette matches the Bird_Opening / Vind_die_Flater family
        navy: {
          light: '#1a1a2e',
          DEFAULT: '#16213e',
          dark: '#0f3460',
        },
        gold: {
          DEFAULT: '#f39c12',
          dark: '#e67e22',
        },
        success: '#2ecc71',
        'success-dark': '#27ae60',
        danger: '#e74c3c',
        info: '#3498db',
        // Badge tier colours
        bronze: '#cd7f32',
        silver: '#a8a8a8',
        'badge-gold': '#ffd700',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-once': 'pulse 0.5s ease-in-out 3',
        'badge-unlock': 'badgeUnlock 0.6s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        badgeUnlock: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)', filter: 'brightness(1.3)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
