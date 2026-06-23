const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}) / var(${variableName}-opacity, 1))`;
  };
};

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
          bg: withOpacity('--theme-bg'),
          sidebar: withOpacity('--theme-sidebar'),
          card: withOpacity('--theme-card'),
          main: withOpacity('--theme-main'),
          border: withOpacity('--theme-border'),
          text: withOpacity('--theme-text'),
          textSecondary: withOpacity('--theme-text-secondary'),
          accent: withOpacity('--theme-accent'),
          green: withOpacity('--theme-green'),
          input: withOpacity('--theme-input'),
          inputBorder: withOpacity('--theme-input-border'),
        }
      }
    },
  },
  plugins: [],
}
