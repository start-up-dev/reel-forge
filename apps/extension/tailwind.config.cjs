/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}", "./popup/**/*.html", "./options/**/*.html"],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0A0A0F",
        "bg-surface": "#13131A",
        "bg-elevated": "#1C1C27",
        "accent-primary": "#7C5CFC",
        "accent-secondary": "#5B8DEF",
        "accent-success": "#34D399",
        "accent-warning": "#FBBF24",
        "accent-danger": "#F87171",
        "text-primary": "#F4F4F8",
        "text-secondary": "#9898B0",
        "text-muted": "#5A5A72",
        border: "#2A2A3A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
