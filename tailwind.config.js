/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#11527D', // Blue from the logo
          grey: '#4B4E4D', // Grey text from the logo
          light: '#F8FAFC', // Very light background
          white: '#FFFFFF',
          accent: '#1873B0' // Lighter blue for hover
        }
      }
    },
  },
  plugins: [],
}
