import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#09090b",
          surface: "#121216",
          card: "#18181f",
          border: "#272732",
          yellow: "#facc15",
          amber: "#f59e0b",
          orange: "#f97316",
          red: "#ef4444",
        },
      },
      backgroundImage: {
        "arena-gradient": "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #facc15 100%)",
        "arena-glow": "radial-gradient(circle at center, rgba(249, 115, 22, 0.18) 0%, rgba(239, 68, 68, 0.05) 50%, transparent 70%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

