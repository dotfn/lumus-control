/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        theme: {
          bg: 'var(--bg-app)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          main: 'var(--bg-main)',
          border: 'var(--border-color)',
          text: 'var(--text-primary)',
          textSecondary: 'var(--text-secondary)',
          accent: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          input: 'var(--bg-input)',
          inputBorder: 'var(--border-input)',
        }
      }
    },
  },
  plugins: [],
}
