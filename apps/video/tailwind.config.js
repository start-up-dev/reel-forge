module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0A0A0F",
          surface: "#13131A",
          elevated: "#1C1C27",
        },
        accent: {
          primary: "#7C5CFC",
          secondary: "#5B8DEF",
          success: "#34D399",
          warning: "#FBBF24",
          danger: "#F87171",
        },
        text: {
          primary: "#F4F4F8",
          secondary: "#9898B0",
          muted: "#5A5A72",
        }
      },
    },
  },
  plugins: [],
};
