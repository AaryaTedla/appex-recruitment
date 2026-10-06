import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0d10",
        panel: "#11151a",
        line: "#252b33",
        accent: "#7c3aed",
        zinc: { 500: "#a1a1aa", 600: "#929baa" },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
