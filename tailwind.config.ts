import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#06101F",
          900: "#081628",
          850: "#0B1C36",
          800: "#0E2444",
          700: "#123056",
          600: "#1A3D6B",
        },
        brand: {
          50: "#EEF4FF",
          100: "#D9E7FF",
          200: "#B3CFFF",
          400: "#5B8CFF",
          500: "#2F6BFF",
          600: "#1D56F5",
          700: "#1644D6",
        },
        surface: {
          50: "#F5F8FC",
          100: "#EEF3F9",
          200: "#E4EBF4",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 35, 70, 0.06)",
        "card-hover": "0 12px 28px rgba(15, 35, 70, 0.10)",
        kpi: "0 6px 18px rgba(15, 35, 70, 0.05)",
        sidebar: "8px 0 24px rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "navy-radial":
          "radial-gradient(ellipse 80% 60% at 70% 40%, rgba(37, 99, 235, 0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(14, 165, 233, 0.12), transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
