/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['SpaceGrotesk', 'InterVariable', 'sans-serif'],
        sans: ['InterVariable', 'sans-serif'],
        mono: ['JetBrainsMono', 'monospace'],
      },
    },
  },
  plugins: [],
}
