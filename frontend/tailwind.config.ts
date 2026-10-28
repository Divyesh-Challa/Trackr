import type { Config } from "tailwindcss";

// Palettes used by the UI are CSS variables (src/app/theme.css) so dark mode can swap the
// whole scale at once instead of every component carrying dark: variants.
const themed = (name: string) =>
  Object.fromEntries(
    ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map((shade) => [
      shade,
      `rgb(var(--c-${name}-${shade}) / <alpha-value>)`,
    ])
  );

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
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        slate: themed("slate"),
        blue: themed("blue"),
        emerald: themed("emerald"),
        rose: themed("rose"),
        red: themed("red"),
        amber: themed("amber"),
        violet: themed("violet"),
        purple: themed("purple"),
        sky: themed("sky"),
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
        xs: "0 1px 1px 0 rgba(15, 23, 42, 0.04)",
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
