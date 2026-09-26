/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lumo: {
          50: '#F0F5FF',
          100: '#E0EAFF',
          200: '#C7D7FE',
          300: '#A4BCFD',
          400: '#7A98F9',
          500: '#4F6BF5',
          600: '#3543ED',
          700: '#2732D6',
          800: '#1E40AF', // LUMO Deep Indigo
          900: '#0F172A',
        },
        surface: '#FFFFFF',
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        card: '0 2px 10px 0 rgba(15, 23, 42, 0.05)',
        glow: '0 0 20px rgba(30, 64, 175, 0.25)',
      },
    },
  },
  plugins: [],
};
