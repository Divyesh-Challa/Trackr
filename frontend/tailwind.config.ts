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
    extend: {
      fontFamily: {
        // Zilla Slab is only the wordmark; everything else is Geist.
        wordmark: ["var(--font-wordmark)", "Zilla Slab", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
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
      // Elevation lives in theme.css so dark mode can swap it. `shadow-sm` is the hairline ring
      // raised surfaces use in place of a border; the larger steps are for things that float.
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },
      // Controls 8px, cards 14px, panels 18px, sheets 24px; chips and pills stay rounded-full.
      borderRadius: {
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },
      transitionTimingFunction: {
        // Ease-out for things arriving; matches the springs' feel when CSS does the work.
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
