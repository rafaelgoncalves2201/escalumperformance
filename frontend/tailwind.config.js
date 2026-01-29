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
          DEFAULT: '#404040',
          light: '#525252',
          dark: '#262626',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #262626 0%, #404040 50%, #171717 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a0a 0%, #171717 40%, #0a0a0a 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(64,64,64,0.2) 0%, rgba(64,64,64,0.05) 100%)',
      },
    },
  },
  plugins: [],
}
