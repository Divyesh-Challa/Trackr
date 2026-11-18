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
    "./src/lib/**/*.{js,ts,jsx,tsx}", // board.ts holds column accent classes
  ],
  darkMode: "class",
  theme: {
    // No glass: backdrop-blur utilities generate nothing.
    backdropBlur: {},
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Zilla Slab", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
        },
        stage: {
          DEFAULT: "rgb(var(--stage) / <alpha-value>)",
          raised: "rgb(var(--stage-raised) / <alpha-value>)",
          line: "rgb(var(--stage-line) / <alpha-value>)",
          ink: "rgb(var(--stage-ink) / <alpha-value>)",
          muted: "rgb(var(--stage-muted) / <alpha-value>)",
        },
        slate: themed("slate"),
        blue: themed("blue"),
        // One accent hue: the old violet/purple/sky/indigo uses all read as the blueprint blue.
        violet: themed("blue"),
        purple: themed("blue"),
        sky: themed("blue"),
        indigo: themed("blue"),
        emerald: themed("emerald"),
        rose: themed("rose"),
        red: themed("red"),
        amber: themed("amber"),
      },
      // Surfaces are separated by a tone step or a 1px line; only floating things (menus, dialogs) cast a shadow.
      boxShadow: {
        xs: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "0 8px 24px -6px rgb(0 0 0 / 0.16)",
        xl: "0 12px 32px -8px rgb(0 0 0 / 0.2)",
        "2xl": "0 20px 48px -12px rgb(0 0 0 / 0.28)",
      },
      // Tight, one radius family: cards 8px, controls 6px, chips 4px; pills stay rounded-full.
      borderRadius: {
        md: "6px",
        lg: "8px",
        xl: "8px",
        "2xl": "8px",
        "3xl": "8px",
      },
    },
  },
  plugins: [],
};
export default config;
