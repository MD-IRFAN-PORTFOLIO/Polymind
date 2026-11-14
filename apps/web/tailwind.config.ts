import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#090b10",
          900: "#0f1219",
          800: "#171c28",
          700: "#22293a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
