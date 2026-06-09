/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Brand — sampled from the Mtalii logo
        forest: {
          DEFAULT: '#186030',
          deep: '#0F4423',
          dark: '#0A2F18',
        },
        coffee: {
          DEFAULT: '#603C0C',
          light: '#7A4E1B',
          dark: '#3F2705',
        },
        sand: {
          DEFAULT: '#E4C084',
          soft: '#EED5A4',
          deep: '#C9A461',
        },
        cream: {
          DEFAULT: '#FBF5EC',
          deep: '#F4EEE3',
        },
        mist: '#F4EEE3',
        ink: {
          DEFAULT: '#241C12',
          soft: '#3D3325',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Mulish"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        kicker: '0.28em',
        wider: '0.12em',
      },
      fontSize: {
        // Editorial display scale
        'display-xl': ['clamp(3.25rem, 8vw, 7.5rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.5rem, 5.5vw, 4.75rem)', { lineHeight: '1.02', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(2rem, 3.6vw, 3.25rem)', { lineHeight: '1.08', letterSpacing: '-0.01em' }],
        'display-sm': ['clamp(1.5rem, 2.4vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.005em' }],
        kicker: ['0.74rem', { lineHeight: '1.2', letterSpacing: '0.28em' }],
      },
      maxWidth: {
        prose: '62ch',
        narrow: '48rem',
        wide: '88rem',
      },
      boxShadow: {
        soft: '0 30px 60px -30px rgba(36, 28, 18, 0.25)',
        card: '0 18px 40px -22px rgba(36, 28, 18, 0.35)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'subtle-zoom': {
          '0%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        'scroll-cue': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(8px)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 1s cubic-bezier(0.22, 1, 0.36, 1) both',
        'subtle-zoom': 'subtle-zoom 12s ease-out both',
        'scroll-cue': 'scroll-cue 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
