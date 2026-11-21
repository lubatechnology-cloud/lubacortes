import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        royal: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bdd3ff",
          300: "#90b6ff",
          400: "#5c8dff",
          500: "#3563f5",
          600: "#2045dc",
          700: "#1b36b0",
          800: "#1b2f8c",
          900: "#1b2c6f",
        },
        electric: {
          400: "#3b82ff",
          500: "#1d4ed8",
          600: "#1e40af",
        },
        cyan: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(59,130,255,.12), 0 16px 48px -16px rgba(29,78,216,.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-600px 0" },
          "100%": { backgroundPosition: "600px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
