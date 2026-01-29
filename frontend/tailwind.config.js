/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#364C66',
          light: '#4A6B8A',
          dark: '#2A3A4D',
        },
      },
    },
  },
  plugins: [],
}
