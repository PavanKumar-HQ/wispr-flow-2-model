/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#DFDFD4',
        darkTeal: '#07514C',
        deepTeal: '#0F5B57',
        amber: '#DDA44D',
        terracotta: '#DA6C4C',
        sage: '#B8CBC3',
        charcoal: '#212121',
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
          border: '#212121',
          borderLight: '#D1D1C5',
          borderDark: '#212121'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'pixel-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'pixel': '0 4px 8px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'pixel-lg': '0 10px 18px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'pixel-amber': '0 4px 12px rgba(221, 164, 77, 0.25)',
        'pixel-terracotta': '0 4px 12px rgba(218, 108, 76, 0.25)',
        'tactile': '0 4px 8px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'tactile-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'tactile-pressed': 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
        'tactile-amber': '0 4px 12px rgba(221, 164, 77, 0.25)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}

