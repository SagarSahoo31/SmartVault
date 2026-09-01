/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        vault: {
          bg: '#09090b',
          card: '#121215',
          border: '#27272a',
          accent: '#ffffff',
          muted: '#a1a1aa'
        }
      }
    },
  },
  plugins: [],
}
