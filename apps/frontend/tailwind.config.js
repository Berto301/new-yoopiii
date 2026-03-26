/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f2",
          100: "#d8e8d8",
          500: "#2f855a",
          700: "#22543d",
          900: "#122c20"
        },
        accent: "#d69e2e"
      }
    }
  },
  plugins: []
};
