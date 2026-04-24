/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        serif: ["Montserrat", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#f8efea",
          100: "#edd7cc",
          300: "#c98d70",
          500: "#9D5D43",
          700: "#7d4832",
          900: "#2b1f1d"
        },
        accent: "#c98d70"
      }
    }
  },
  plugins: []
};
