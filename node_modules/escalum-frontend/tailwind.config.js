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
          DEFAULT: '#1323FD',
          light: '#3D4FFE',
          dark: '#0E1BC7',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1323FD 0%, #3D4FFE 50%, #0E1BC7 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a1a 0%, #1323FD22 40%, #0a0a1a 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(19,35,253,0.15) 0%, rgba(19,35,253,0.05) 100%)',
      },
    },
  },
  plugins: [],
}
