/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace', 'cursive'],
      },
      colors: {
        cream: {
          DEFAULT: '#DFDFD4',
          50: '#F7F7F4',
          100: '#EFEFEA',
          200: '#DFDFD4',
          300: '#CFCFB8',
        },
        darkTeal: {
          DEFAULT: '#07514C',
          hover: '#053E3A',
        },
        deepTeal: {
          DEFAULT: '#0F5B57',
        },
        amber: {
          DEFAULT: '#DDA44D',
          hover: '#C9923C',
        },
        terracotta: {
          DEFAULT: '#DA6C4C',
          hover: '#C55B3C',
        },
        sage: {
          DEFAULT: '#B8CBC3',
          light: '#D3DFDA',
        },
        charcoal: {
          DEFAULT: '#212121',
          muted: '#4A4A4A',
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px #212121',
        'pixel-sm': '2px 2px 0px 0px #212121',
        'pixel-lg': '6px 6px 0px 0px #212121',
        'pixel-amber': '4px 4px 0px 0px #DDA44D',
        'pixel-terracotta': '4px 4px 0px 0px #DA6C4C',
      },
      keyframes: {
        'float-cloud': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(350%)' },
        },
        'sway': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
      },
      animation: {
        'float-cloud': 'float-cloud 60s linear infinite',
        'sway': 'sway 3s ease-in-out infinite',
        'sway-delayed': 'sway 3.5s ease-in-out 1.5s infinite',
      },
    },
  },
  plugins: [],
};

