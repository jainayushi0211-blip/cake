import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF7",
          100: "#F8F4EC",
          200: "#EFE8DA",
          300: "#E2D5BE",
          400: "#D3BF9E",
        },
        cocoa: {
          950: "#140D0A",
          900: "#221713",
          800: "#32231D",
          700: "#48322A",
          600: "#63473C",
          500: "#836152",
        },
        terracotta: {
          400: "#D97B60",
          500: "#C46549",
          600: "#A84F36",
        },
        honey: {
          300: "#ECD2A4",
          400: "#E2BE82",
          500: "#CE9F58",
          600: "#B2823D",
        },
        sage: {
          50: "#F3F6F4",
          100: "#E4EDE6",
          500: "#6B8F77",
          600: "#557560",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(45, 30, 24, 0.06)",
        warm: "0 10px 30px -4px rgba(45, 30, 24, 0.1)",
        elevated: "0 20px 40px -10px rgba(45, 30, 24, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
