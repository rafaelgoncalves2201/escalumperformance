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
        'gradient-login': 'linear-gradient(160deg, #0a0a0a 0%, #0f172a 25%, #1e293b 50%, #0f172a 75%, #0a0a0a 100%)',
        'gradient-card-login': 'linear-gradient(145deg, #1e293b 0%, #334155 30%, #1e293b 100%)',
        'gradient-btn-login': 'linear-gradient(135deg, #475569 0%, #334155 40%, #1e3a5f 100%)',
        'gradient-input': 'linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(51,65,85,0.6) 100%)',
      },
    },
  },
  plugins: [],
}
