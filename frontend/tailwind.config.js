/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#0B0F17",
          card: "#111827",
          border: "#1F2937",
          accent: "#06B6D4",
          verified: "#10B981",
          compromised: "#EF4444",
          warning: "#F59E0B",
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-red': 'flashRed 0.8s ease-in-out infinite alternate',
        'chain-break': 'chainBreak 0.5s ease-out forwards',
      },
      keyframes: {
        flashRed: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' },
          '100%': { backgroundColor: 'rgba(239, 68, 68, 0.35)', borderColor: '#F87171' },
        },
        chainBreak: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2) rotate(15deg)', opacity: '0.8' },
          '100%': { transform: 'scale(0.95)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
