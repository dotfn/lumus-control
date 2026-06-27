const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
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
        display: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        text: ['Inter', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'apple-display': '-0.022em',
        'apple-heading-lg': '-0.016em',
        'apple-heading': '-0.015em',
        'apple-subheading': '-0.010em',
        'apple-body': '-0.006em',
        'apple-body-sm': '-0.003em',
        'apple-caption': '-0.022em',
      },
      colors: {
        theme: {
          bg: withOpacity('--bg-app'),
          sidebar: withOpacity('--bg-sidebar'),
          card: withOpacity('--bg-card'),
          main: withOpacity('--bg-main'),
          border: withOpacity('--border-color'),
          text: withOpacity('--text-primary'),
          textSecondary: withOpacity('--text-secondary'),
          textSlate: withOpacity('--text-slate'),
          textAsh: withOpacity('--text-ash'),
          accent: withOpacity('--accent-blue'),
          green: withOpacity('--accent-green'),
          input: withOpacity('--bg-input'),
          inputBorder: withOpacity('--border-input'),
        }
      }
    },
  },
  plugins: [],
}
