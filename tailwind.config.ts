import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        simpson: {
          yellow: "#ffd90f",
          orange: "#ff9800",
          sky: "#84d7ff",
          cyan: "#38bdf8",
          ink: "#111827"
        }
      },
      boxShadow: {
        cartoon: "6px 6px 0 rgba(17,24,39,0.35)"
      },
      borderRadius: {
        blob: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
