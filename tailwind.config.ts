import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
        animation: {
          "slide-left": "slideLeft 10s linear infinite",
        },
        keyframes: {
          slideLeft: {
            "0%": { transform: "translateX(100%)", opacity: 1 },
            "100%": { transform: "translateX(-100%)", opacity: 1 },
          },
        },
    },
    colors: {
      background: "var(--background)",
      foreground: "var(--foreground)",
    },
  },
  plugins: [],
} satisfies Config;
