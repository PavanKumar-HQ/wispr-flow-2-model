/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vq: {
          cream: '#DFDFD4',
          surface: '#EAEAE2',
          surfaceLight: '#F5F5F0',
          tealDark: '#07514C',
          tealDeep: '#0F5B57',
          amber: '#DDA44D',
          terracotta: '#DA6C4C',
          sage: '#B8CBC3',
          sageLight: '#D2DFD8',
          charcoal: '#212121',
          border: '#D1D1C5',
          borderDark: '#07514C'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      boxShadow: {
        'tactile': '3px 3px 0px rgba(7, 81, 76, 0.9)',
        'tactile-sm': '2px 2px 0px rgba(7, 81, 76, 0.9)',
        'tactile-pressed': '1px 1px 0px rgba(7, 81, 76, 0.9)',
        'tactile-amber': '3px 3px 0px rgba(221, 164, 77, 0.9)',
      }
    },
  },
  plugins: [],
}

