/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/vistas/**/*.pug",
    "./src/publico/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primario: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0284c7',
          700: '#0369a1',
        },
        secundario: {
          500: '#64748b',
        }
      }
    },
  },
  plugins: [],
}
