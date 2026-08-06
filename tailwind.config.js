/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF6B4A",
          light: "#FFF1EE",
          muted: "#FDDDD6",
        },
        surface: "#FFFFFF",
        page: "#F6F6F4",
        border: "#E5E7EB",
        text: {
          primary: "#1A1A1A",
          muted: "#6B7280",
        },
        positive: "#22C55E",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
};
