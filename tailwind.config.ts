import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          yellow: '#FCD34D',
          'yellow-light': '#FEF3C7',
          'yellow-dark': '#F59E0B',
          black: '#1F2937',
          'black-light': '#374151',
        },
        status: {
          green: '#92d050',
          'green-light': '#92d050',
          yellow: '#FCD34D',
          grey: '#9CA3AF',
          red: '#EF4444',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
