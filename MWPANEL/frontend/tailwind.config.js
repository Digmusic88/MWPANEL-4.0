/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ["'Lora'", 'Georgia', "'Times New Roman'", 'serif'],
        sans: ["'Plus Jakarta Sans'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
      colors: {
        // Warm neutral surfaces
        surface: '#FAFAF8',
        'surface-alt': '#F5F2ED',
        'surface-hover': '#F2EEE9',

        // Warm borders
        border: '#E2DDD8',
        'border-light': '#EDE9E4',

        // Ink (text) scale
        ink: {
          900: '#1E1E30',
          700: '#3A3A52',
          500: '#6B6B7B',
          300: '#9B9BAB',
          100: '#C0BDC8',
          50:  '#E8E6EC',
        },

        // Primary — muted sage green (brand color)
        primary: {
          950: '#0F2018',
          900: '#1B3328',
          800: '#2C5040',
          700: '#3F6E58',
          600: '#4A7E66',
          500: '#579172',
          400: '#6EA88A',
          300: '#8EC0A4',
          200: '#B5D6C8',
          100: '#D6EDE4',
          50:  '#EDF6F1',
        },

        // Accent — deep sage green for success / secondary CTAs
        sage: {
          800: '#1A5C36',
          700: '#2E7D52',
          600: '#3D9966',
          500: '#4DAA7A',
          100: '#DCFCE7',
          50:  '#F0FDF4',
        },

        // Warm amber for warnings
        amber: {
          800: '#92400E',
          700: '#B45309',
          600: '#D97706',
          500: '#F59E0B',
          100: '#FEF3C7',
          50:  '#FFFBEB',
        },
      },
      boxShadow: {
        'xs':       '0 1px 2px rgba(30, 30, 48, 0.05)',
        'subtle':   '0 1px 4px rgba(30, 30, 48, 0.06), 0 1px 2px rgba(30, 30, 48, 0.04)',
        'card':     '0 2px 8px -2px rgba(30, 30, 48, 0.08), 0 1px 4px -1px rgba(30, 30, 48, 0.06)',
        'elevated': '0 8px 24px -4px rgba(30, 30, 48, 0.10), 0 4px 12px -2px rgba(30, 30, 48, 0.07)',
        'focus':    '0 0 0 3px rgba(87, 145, 114, 0.14)',
      },
      borderRadius: {
        'xs': '3px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      animation: {
        'spin-slow': 'spin 5s linear infinite',
        'fade-in':   'mwFadeIn 0.25s ease-out',
        'slide-up':  'mwSlideUp 0.3s ease-out',
      },
      keyframes: {
        mwFadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        mwSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disabled to avoid conflicts with Ant Design
  },
}
