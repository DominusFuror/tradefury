/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wow-gold': '#FFD700',
        'wow-blue': '#0078D4',
        'wow-purple': '#9F40FF',
        'wow-green': '#00B294',
        'wow-red': '#E81123',
        'wow-orange': '#FF8C00',
      },
      fontFamily: {
        'wow': ['Cinzel', 'serif'],
      }
    },
  },
  plugins: [],
}
