import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Space Grotesk', 'sans-serif'],
        headline: ['Space Grotesk', 'sans-serif'],
        code: ['Space Mono', 'monospace'],
        mono: ['Space Mono', 'monospace'],
        sans: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        background: '#F5F0E8', // qc-cream
        foreground: '#0A0A0A', // qc-black
        'qc-black': '#0A0A0A',
        'qc-cream': '#F5F0E8',
        'qc-yellow': '#F5D900',
        'qc-red': '#E8200C',
        'qc-blue': '#0025FF',
        'qc-gray': '#B8B0A0',
        'qc-white': '#FFFFFF',
        primary: {
          DEFAULT: '#0A0A0A',
          foreground: '#F5D900',
        },
        secondary: {
          DEFAULT: '#F5D900',
          foreground: '#0A0A0A',
        },
        accent: {
          DEFAULT: '#F5D900',
          foreground: '#0A0A0A',
        },
        muted: {
          DEFAULT: '#B8B0A0',
          foreground: '#0A0A0A',
        },
        destructive: {
          DEFAULT: '#E8200C',
          foreground: '#FFFFFF',
        },
        border: '#0A0A0A',
        input: '#F5F0E8',
        ring: '#0025FF',
      },
      borderWidth: {
        DEFAULT: '3px',
        thick: '5px',
      },
      boxShadow: {
        brutal: '3px 3px 0px 0px #0A0A0A',
        'brutal-hover': '5px 5px 0px 0px #0A0A0A',
        'brutal-active': '1px 1px 0px 0px #0A0A0A',
        'brutal-gray': '3px 3px 0px 0px #B8B0A0',
        'brutal-gray-hover': '5px 5px 0px 0px #B8B0A0',
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
