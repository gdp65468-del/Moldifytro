import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#191412",
        paper: "#f7efe1",
        sand: "#e8d5b1",
        ember: "#c45a1a",
        pine: "#1f4736",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Trebuchet MS", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 80px rgba(20, 16, 15, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
