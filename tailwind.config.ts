import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#080706",
        charcoal: "#14110f",
        mezcal: "#d9a441",
        agave: "#1fa187",
        chile: "#c0392b",
        bone: "#f4ead7",
      },
      boxShadow: {
        cantina: "0 24px 80px rgba(0, 0, 0, 0.45)",
        glow: "0 0 40px rgba(217, 164, 65, 0.18)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
