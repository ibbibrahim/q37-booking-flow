/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: {
          background: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "dialog-overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-overlay-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "dialog-content-in": {
          from: {
            opacity: "0",
            transform: "translate3d(-50%, -50%, 0) scale(0.97)",
          },
          to: {
            opacity: "1",
            transform: "translate3d(-50%, -50%, 0) scale(1)",
          },
        },
        "dialog-content-out": {
          from: {
            opacity: "1",
            transform: "translate3d(-50%, -50%, 0) scale(1)",
          },
          to: {
            opacity: "0",
            transform: "translate3d(-50%, -50%, 0) scale(0.97)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dialog-overlay-in": "dialog-overlay-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-overlay-out": "dialog-overlay-out 0.35s cubic-bezier(0.4, 0, 1, 1) both",
        "dialog-content-in": "dialog-content-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-content-out": "dialog-content-out 0.35s cubic-bezier(0.4, 0, 1, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
