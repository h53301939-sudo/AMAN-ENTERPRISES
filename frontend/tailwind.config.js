/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        balaji: {
          blue: '#0051A5',       // Balaji Royal Blue
          darkBlue: '#002B66',   // Balaji Deep Midnight Blue
          red: '#E31E24',        // Balaji Crimson Red
          darkRed: '#991B1B',    // Balaji Deep Red
          yellow: '#FFC72C',     // Balaji Sunburst Yellow
          amber: '#F59E0B',      // Balaji Warm Amber
          lightBg: '#F8FAFC',
          cardDark: '#1E293B',
          bgDark: '#0F172A',
        },
        pepsi: {
          blue: '#0051A5',
          darkBlue: '#002B66',
          red: '#E31E24',
          yellow: '#FFC72C',
          lightBg: '#F8FAFC',
          cardDark: '#1E293B',
          bgDark: '#0F172A',
        }
      }
    },
  },
  plugins: [],
}
