import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Newsreader", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        simplify: {
          canvas: "#F8FAFC",
          card: "#FFFFFF",
          cardHover: "#F1F5F9",
          border: "#E2E8F0",
          borderHover: "#CBD5E1",
          blue: "#0066FF",
          blueHover: "#0052CC",
          emerald: "#059669",
          amber: "#D97706",
          cyan: "#0284C7",
          indigo: "#4F46E5",
          muted: "#64748B",
          subtle: "#94A3B8",
          text: "#0F172A",
        },
      },
      boxShadow: {
        "simplify-card": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "simplify-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.06)",
        "simplify-glow": "0 0 20px -3px rgba(0, 102, 255, 0.2)",
        "simplify-active": "0 0 0 2px #0066FF, 0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
