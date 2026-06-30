import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1e40af", // updated
          light: "#3b82f6",
          dark: "#1e3a8a",
        },
        success: { DEFAULT: "#16a34a", light: "#dcfce7" }, // updated
        warning: { DEFAULT: "#d97706", light: "#fef3c7" }, // updated
        danger: { DEFAULT: "#dc2626", light: "#fee2e2" }, // updated
        muted: { DEFAULT: "#64748b", light: "#f1f5f9" }, // updated
        background: "#f8fafc", // updated
        foreground: "#0f172a", // updated
        border: "#e2e8f0", // updated
        input: "#e2e8f0",
        ring: "#1e40af",
        accent: { DEFAULT: "#f1f5f9", foreground: "#0f172a" },
        card: { DEFAULT: "#ffffff", foreground: "#0f172a" }, // updated
        popover: { DEFAULT: "#ffffff", foreground: "#0f172a" },
        secondary: { DEFAULT: "#f1f5f9", foreground: "#1e293b" },
        destructive: { DEFAULT: "#dc2626", foreground: "#ffffff" },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
