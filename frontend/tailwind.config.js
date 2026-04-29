/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark': {
          '900': '#0a0a0f',
          '800': '#111118',
          '700': '#1a1a24',
          '600': '#252532',
          '500': '#32324a',
        },
        'accent': {
          'green': '#00ff88',
          'red': '#ff4757',
          'yellow': '#ffa502',
          'blue': '#00d4ff',
        }
      },
    },
  },
  plugins: [],
}
