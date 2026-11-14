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
          bg: "#060d1a",
          surface: "#0c182b",
          card: "#0f2038",
          border: "#1e3a5f",
          cyan: "#00a3ff",
          amber: "#f59e0b",
          navy: "#0a192f",
          orange: "#f59e0b",
          red: "#ef4444",
          blue: "#00a3ff",
        },
      },
      backgroundImage: {
        "arena-gradient": "linear-gradient(135deg, #00a3ff 0%, #0284c7 40%, #f59e0b 100%)",
        "arena-glow": "radial-gradient(circle at center, rgba(0, 163, 255, 0.22) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 75%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

